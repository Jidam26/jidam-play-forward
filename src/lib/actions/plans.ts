"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin, requireSession } from "@/lib/session";
import { createPlan, setPlanActive } from "@/lib/repositories/plans";
import { requestPlanPurchase, confirmPlanPurchase } from "@/lib/repositories/planPurchases";
import { logActivity } from "@/lib/repositories/activity";

export type FormState = { error?: string };

const createPlanSchema = z.object({
  sport: z.string().trim().min(2, "Please choose or enter a sport."),
  name: z.string().trim().min(2, "Please enter a plan name."),
  games_included: z.coerce.number().int().min(1, "Must include at least 1 game."),
  price_aed: z.coerce.number().min(0, "Price can't be negative."),
  payment_link: z.union([z.string().trim().url("Please enter a valid payment link."), z.literal("")]).optional(),
});

export async function createPlanAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();

  const parsed = createPlanSchema.safeParse({
    sport: formData.get("sport"),
    name: formData.get("name"),
    games_included: formData.get("games_included"),
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
 * WhatsApp payment screenshot -- credits the member's balance in the same
 * transaction (see confirmPlanPurchase). Bound to
 * `.bind(null, purchaseId, memberName, planLabel)` where it's used as a
 * form action -- see PendingPlanPurchases.
 */
export async function confirmPlanPurchaseAction(
  purchaseId: string,
  memberName: string,
  planLabel: string
): Promise<void> {
  const session = await requireAdmin();
  const result = await confirmPlanPurchase(purchaseId);
  if (!result.ok) return; // stale button (already confirmed elsewhere) -- nothing to do

  await logActivity(session.id, "payment_marked_paid", `Marked ${memberName}'s ${planLabel} as paid (AED ${result.purchase.price_aed})`);

  revalidatePath("/admin");
  revalidatePath("/plans");
}
