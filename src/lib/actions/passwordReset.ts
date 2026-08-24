"use server";

import { z } from "zod";
import { findUserByEmail, updatePassword } from "@/lib/repositories/users";
import { createPasswordReset, findValidReset, consumeReset } from "@/lib/repositories/passwordResets";
import { sendEmail, passwordResetEmail } from "@/lib/email";
import { getSiteUrl } from "@/lib/config";

export type RequestResetState = { submitted?: boolean; error?: string };

const emailSchema = z.email("Please enter a valid email address.");

export async function requestPasswordResetAction(
  _prevState: RequestResetState,
  formData: FormData
): Promise<RequestResetState> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please enter a valid email address." };
  }

  const user = await findUserByEmail(parsed.data);
  // Always report success whether or not the email exists -- telling a
  // visitor "no account with that email" lets them probe who's registered.
  if (user) {
    const token = await createPasswordReset(user.id);
    const resetUrl = `${getSiteUrl()}/reset-password?token=${token}`;
    const { subject, html } = passwordResetEmail(resetUrl);
    await sendEmail(user.email, subject, html);
  }

  return { submitted: true };
}

export type ResetPasswordState = { error?: string; success?: boolean };

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(6, "Password must be at least 6 characters."),
});

export async function resetPasswordAction(
  _prevState: ResetPasswordState,
  formData: FormData
): Promise<ResetPasswordState> {
  const parsed = resetPasswordSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form and try again." };
  }

  const lookup = await findValidReset(parsed.data.token);
  if (!lookup.ok) {
    const messages = {
      NOT_FOUND: "That reset link is invalid.",
      EXPIRED: "That reset link has expired. Request a new one.",
      ALREADY_USED: "That reset link has already been used.",
    };
    return { error: messages[lookup.reason] };
  }

  await updatePassword(lookup.userId, parsed.data.password);
  await consumeReset(parsed.data.token);

  return { success: true };
}
