"use client";

import { useActionState } from "react";
import { changePasswordAction, type ChangePasswordState } from "@/lib/actions/account";
import { SubmitButton } from "@/components/SubmitButton";

const initialState: ChangePasswordState = {};

export function ChangePasswordForm() {
  const [state, formAction] = useActionState(changePasswordAction, initialState);

  return (
    <form action={formAction} className="w-full max-w-sm space-y-4">
      <label className="block text-left">
        <span className="mb-1 block text-sm font-medium text-navy">Current password</span>
        <input
          name="currentPassword"
          type="password"
          required
          autoComplete="current-password"
          className="w-full rounded-lg border border-navy/20 bg-white px-3 py-2.5 text-base text-navy outline-none focus:border-gold focus:ring-2 focus:ring-gold/30"
        />
      </label>
      <label className="block text-left">
        <span className="mb-1 block text-sm font-medium text-navy">New password</span>
        <input
          name="newPassword"
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
          className="w-full rounded-lg border border-navy/20 bg-white px-3 py-2.5 text-base text-navy outline-none focus:border-gold focus:ring-2 focus:ring-gold/30"
        />
      </label>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="text-sm text-green-700">Password updated.</p>}
      <SubmitButton pendingText="Updating...">Change Password</SubmitButton>
    </form>
  );
}
