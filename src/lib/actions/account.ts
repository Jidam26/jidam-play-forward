"use server";

import { z } from "zod";
import { requireSession } from "@/lib/session";
import { findUserById, updatePassword, verifyPassword } from "@/lib/repositories/users";

export type ChangePasswordState = { error?: string; success?: boolean };

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Please enter your current password."),
  newPassword: z.string().min(6, "New password must be at least 6 characters."),
});

export async function changePasswordAction(
  _prevState: ChangePasswordState,
  formData: FormData
): Promise<ChangePasswordState> {
  const session = await requireSession();

  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form and try again." };
  }

  const user = await findUserById(session.id);
  if (!user || !verifyPassword(user, parsed.data.currentPassword)) {
    return { error: "Current password is incorrect." };
  }

  await updatePassword(user.id, parsed.data.newPassword);
  return { success: true };
}
