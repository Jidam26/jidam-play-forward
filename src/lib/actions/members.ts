"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/session";
import { updateMember, deleteMember } from "@/lib/repositories/users";
import { logActivity } from "@/lib/repositories/activity";

export type MemberFormState = { error?: string; success?: boolean };

const memberSchema = z.object({
  name: z.string().trim().min(2, "Please enter a name."),
  email: z.string().trim().email("Please enter a valid email."),
  phone: z.string().trim().min(5, "Please enter a phone number."),
});

/** Admin-only: correct a member's profile -- bound to `.bind(null, userId)`. */
export async function updateMemberAction(
  userId: string,
  _prevState: MemberFormState,
  formData: FormData
): Promise<MemberFormState> {
  await requireAdmin();
  const parsed = memberSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form and try again." };
  }

  try {
    await updateMember(userId, parsed.data);
  } catch (err) {
    if (err instanceof Error && err.message === "EMAIL_TAKEN") {
      return { error: "That email is already used by another account." };
    }
    throw err;
  }

  revalidatePath("/admin/members");
  return { success: true };
}

/**
 * Admin-only, irreversible: delete a member and all their bookings/credits/
 * subscriptions -- see deleteMember. Bound to `.bind(null, userId, memberName)`.
 */
export async function deleteMemberAction(userId: string, memberName: string): Promise<void> {
  const session = await requireAdmin();
  await deleteMember(userId);
  await logActivity(session.id, "member_deleted", `Deleted member ${memberName} and all their history`);
  revalidatePath("/admin/members");
}
