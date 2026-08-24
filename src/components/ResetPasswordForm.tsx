"use client";

import { useActionState } from "react";
import Link from "next/link";
import { resetPasswordAction, type ResetPasswordState } from "@/lib/actions/passwordReset";
import { SubmitButton } from "@/components/SubmitButton";

const initialState: ResetPasswordState = {};

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction] = useActionState(resetPasswordAction, initialState);

  if (state.success) {
    return (
      <div className="max-w-sm space-y-4">
        <p className="rounded-lg bg-navy/5 px-4 py-3 text-sm text-navy">
          Password updated. You can sign in with your new password now.
        </p>
        <Link
          href="/login"
          className="block w-full rounded-lg bg-gold px-4 py-3 text-center text-base font-bold text-navy transition hover:bg-gold-light"
        >
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="w-full max-w-sm space-y-4">
      <input type="hidden" name="token" value={token} />
      <label className="block text-left">
        <span className="mb-1 block text-sm font-medium text-navy">New password</span>
        <input
          name="password"
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
          className="w-full rounded-lg border border-navy/20 bg-white px-3 py-2.5 text-base text-navy outline-none focus:border-gold focus:ring-2 focus:ring-gold/30"
        />
      </label>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <SubmitButton pendingText="Updating...">Set New Password</SubmitButton>
    </form>
  );
}
