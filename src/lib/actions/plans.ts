"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin, requireSession } from "@/lib/session";
import { createPlan, setPlanActive } from "@/lib/repositories/plans";
import { requestPlanPurchase, confirmPlanPurchase, issueCreditsDirectly } from "@/lib/repositories/planPurchases";
import { findUserById } from "@/lib/repositories/users";
import { logActivity } from "@/lib/repositories/activity";
import { issueAndEmailReceipt } from "@/lib/receiptIssuer";

export type FormState = { error?: string };

const createPlanSchema = z
  .object({
    plan_type: z.enum(["credits", "subscription"]),
    sport: z.string().trim().min(2, "Please choose or enter a sport."),
    name: z.string().trim().min(2, "Please enter a plan name."),
    games_included: z.coerce.number().int().min(1, "Must include at least 1 game.").optional(),
    duration_days: z.coerce.number().int().min(1, "Must last at least 1 day.").optional(),
    price_aed: z.coerce.number().min(0, "Price can't be negative."),
    payment_link: z.union([z.string().trim().url("Please enter a valid payment link."), z.literal("")]).optional(),
  })
  .refine((d) => d.plan_type !== "credits" || d.games_included !== undefined, {
    message: "Please enter how many games this pack includes.",
    path: ["games_included"],
  })
  .refine((d) => d.plan_type !== "subscription" || d.duration_days !== undefined, {
    message: "Please enter how many days this subscription lasts.",
    path: ["duration_days"],
  });

export async function createPlanAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();

  const parsed = createPlanSchema.safeParse({
    plan_type: formData.get("plan_type"),
    sport: formData.get("sport"),
    name: formData.get("name"),
    games_included: formData.get("games_included") || undefined,
    duration_days: formData.get("duration_days") || undefined,
    price_aed: formData.get("price_aed"),
    payment_link: formData.get("payment_link"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form and try again." };
  }

  await createPlan({ ...parsed.data, payment_link: parsed.data.payment_link || null });

  revalidatePath("/admin/plans");
  revalidatePath("/plans");
  redirect("/admin/plans");
}

const issueCreditsSchema = z.object({
  userId: z.string().min(1),
  sport: z.string().trim().min(2, "Please choose a sport."),
  gamesIncluded: z.coerce.number().int().min(1, "Must be at least 1 credit."),
  priceAed: z.coerce.number().min(0, "Price can't be negative."),
});

export type IssueCreditsState = { error?: string; success?: boolean };

/**
 * Admin-only: grant credits directly to a member, no purchase request
 * needed -- e.g. a cash-in-person payment, a comp, or a correction. Logged
 * to the boss activity log with the amount (or "comp" when priceAed is 0).
 */
export async function issueCreditsAction(_prevState: IssueCreditsState, formData: FormData): Promise<IssueCreditsState> {
  const session = await requireAdmin();

  const parsed = issueCreditsSchema.safeParse({
    userId: formData.get("userId"),
    sport: formData.get("sport"),
    gamesIncluded: formData.get("gamesIncluded"),
    priceAed: formData.get("priceAed"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form and try again." };
  }

  const member = await findUserById(parsed.data.userId);
  const memberName = member?.name ?? "member";
  const purchase = await issueCreditsDirectly(parsed.data.userId, parsed.data.sport, parsed.data.gamesIncluded, parsed.data.priceAed);
  await logActivity(
    session.id,
    "payment_marked_paid",
    `Issued ${parsed.data.gamesIncluded} ${parsed.data.sport} credit(s) to ${memberName}` +
      (parsed.data.priceAed > 0 ? ` (AED ${parsed.data.priceAed})` : " (comp)")
  );
  if (member) {
    await issueAndEmailReceipt({
      userId: member.id,
      memberName: member.name,
      memberEmail: member.email,
      description: `${parsed.data.gamesIncluded}x ${parsed.data.sport} credit(s)`,
      amountAed: parsed.data.priceAed,
      source: "plan_purchase",
      sourceId: purchase.id,
    });
  }

  revalidatePath("/admin/members");
  revalidatePath("/plans");
  return { success: true };
}

/** Retire or restore a plan -- bound to `.bind(null, planId, active)`. */
export async function setPlanActiveAction(planId: string, active: boolean): Promise<void> {
  await requireAdmin();
  await setPlanActive(planId, active);
  revalidatePath("/admin/plans");
  revalidatePath("/plans");
}

export type RequestPlanState = { error?: string; success?: boolean };

export async function requestPlanPurchaseAction(
  _prevState: RequestPlanState,
  formData: FormData
): Promise<RequestPlanState> {
  const session = await requireSession();
  const planId = String(formData.get("planId") ?? "");
  if (!planId) return { error: "Missing plan." };

  const result = await requestPlanPurchase(session.id, planId);
  if (!result.ok) {
    switch (result.reason) {
      case "PLAN_NOT_FOUND":
        return { error: "That plan no longer exists." };
      case "PLAN_INACTIVE":
        return { error: "That plan is no longer available." };
    }
  }

  revalidatePath("/plans");
  revalidatePath("/admin");
  return { success: true };
}

/**
 * Admin-only: confirm a plan purchase as paid after reviewing the member's
 * WhatsApp payment screenshot -- credits the member's balance (or starts
 * their subscription) in the same transaction (see confirmPlanPurchase).
 * Bound to `.bind(null, purchaseId, memberName, memberEmail, planLabel)`
 * where it's used as a form action -- see PendingPlanPurchases. Issues a
 * permanent receipt, emailed as a PDF.
 */
export async function confirmPlanPurchaseAction(
  purchaseId: string,
  memberName: string,
  memberEmail: string,
  planLabel: string
): Promise<void> {
  const session = await requireAdmin();
  const result = await confirmPlanPurchase(purchaseId);
  if (!result.ok) return; // stale button (already confirmed elsewhere) -- nothing to do

  await logActivity(session.id, "payment_marked_paid", `Marked ${memberName}'s ${planLabel} as paid (AED ${result.purchase.price_aed})`);
  await issueAndEmailReceipt({
    userId: result.purchase.user_id,
    memberName,
    memberEmail,
    description: planLabel,
    amountAed: result.purchase.price_aed,
    source: "plan_purchase",
    sourceId: purchaseId,
  });

  revalidatePath("/admin");
  revalidatePath("/plans");
}
