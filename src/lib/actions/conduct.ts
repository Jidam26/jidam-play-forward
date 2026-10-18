"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/session";
import { addConductIncident, markAllFinesPaidForUser, reviewFlaggedIncidents } from "@/lib/repositories/conduct";
import { logActivity } from "@/lib/repositories/activity";

export type ConductActionState = { error?: string };

/**
 * Admin-only: log a late-arrival fine against a member for a specific
 * Football game -- blocks their next self-service Football booking until
 * an admin marks it paid (see markFinePaidAction / bookings.ts). Bound to
 * `.bind(null, gameId, userId, attendeeName)` where it's used as a form
 * action -- see ConductActions.
 */
export async function flagLateFineAction(
  gameId: string,
  userId: string,
  attendeeName: string,
  _prevState: ConductActionState,
  formData: FormData
): Promise<ConductActionState> {
  const session = await requireAdmin();
  const amount = Number(formData.get("fineAmount"));
  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: "Enter a valid fine amount." };
  }
  await addConductIncident({ userId, gameId, type: "late_fine", fineAmountAed: amount });
  await logActivity(session.id, "conduct_flagged", `Flagged ${attendeeName} with a AED ${amount} late-arrival fine`, gameId);
  revalidatePath("/admin");
  revalidatePath("/admin/past");
  revalidatePath("/admin/members");
  return {};
}

/** Admin-only: log a late-cancellation warning -- bound to `.bind(null, gameId, userId, attendeeName)`. */
export async function flagLateCancelWarningAction(gameId: string, userId: string, attendeeName: string): Promise<void> {
  const session = await requireAdmin();
  await addConductIncident({ userId, gameId, type: "late_cancel_warning" });
  await logActivity(session.id, "conduct_flagged", `Flagged ${attendeeName} with a late-cancellation warning`, gameId);
  revalidatePath("/admin");
  revalidatePath("/admin/past");
  revalidatePath("/admin/members");
}

/** Admin-only: log a no-show -- bound to `.bind(null, gameId, userId, attendeeName)`. */
export async function flagNoShowAction(gameId: string, userId: string, attendeeName: string): Promise<void> {
  const session = await requireAdmin();
  await addConductIncident({ userId, gameId, type: "no_show" });
  await logActivity(session.id, "conduct_flagged", `Flagged ${attendeeName} as a no-show`, gameId);
  revalidatePath("/admin");
  revalidatePath("/admin/past");
  revalidatePath("/admin/members");
}

/** Admin-only: marks all of a member's unpaid late fines as settled -- bound to `.bind(null, userId, memberName)`. */
export async function markFinePaidAction(userId: string, memberName: string): Promise<void> {
  const session = await requireAdmin();
  await markAllFinesPaidForUser(userId);
  await logActivity(session.id, "fine_paid", `Marked ${memberName}'s late-arrival fine(s) as paid`);
  revalidatePath("/admin/members");
}

/**
 * Admin-only: clears a member off the Flagged for Review list. "Remove from
 * Football" and "Dismiss" both just clear the flag here -- see the comment
 * on reviewFlaggedIncidents for why there's no separate technical block.
 * Bound to `.bind(null, userId, memberName, "removed" | "dismissed")`.
 */
export async function reviewFlagAction(userId: string, memberName: string, outcome: "removed" | "dismissed"): Promise<void> {
  const session = await requireAdmin();
  await reviewFlaggedIncidents(userId);
  await logActivity(
    session.id,
    "conduct_reviewed",
    outcome === "removed" ? `Marked ${memberName} as removed from Football (conduct)` : `Dismissed ${memberName}'s conduct flag`
  );
  revalidatePath("/admin");
  revalidatePath("/admin/members");
}
