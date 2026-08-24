"use client";

import { useActionState } from "react";
import { requestPasswordResetAction, type RequestResetState } from "@/lib/actions/passwordReset";
import { SubmitButton } from "@/components/SubmitButton";

const initialState: RequestResetState = {};

export function ForgotPasswordForm() {
  const [state, formAction] = useActionState(requestPasswordResetAction, initialState);

  if (state.submitted) {
    return (
      <p className="max-w-sm rounded-lg bg-navy/5 px-4 py-3 text-sm text-navy">
        If an account exists for that email, a reset link is on its way. Check your inbox (and spam folder).
      </p>
    );
  }

  return (
    <form action={formAction} className="w-full max-w-sm space-y-4">
      <label className="block text-left">
        <span className="mb-1 block text-sm font-medium text-navy">Email</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className="w-full rounded-lg border border-navy/20 bg-white px-3 py-2.5 text-base text-navy outline-none focus:border-gold focus:ring-2 focus:ring-gold/30"
        />
      </label>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <SubmitButton pendingText="Sending...">Send Reset Link</SubmitButton>
    </form>
  );
}
