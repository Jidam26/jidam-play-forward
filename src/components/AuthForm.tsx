"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import type { FormState } from "@/lib/actions/auth";

const initialState: FormState = {};

function Field({
  label,
  name,
  type = "text",
  autoComplete,
}: {
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <label className="block text-left">
      <span className="mb-1 block text-sm font-medium text-navy">{label}</span>
      <input
        name={name}
        type={type}
        required
        autoComplete={autoComplete}
        className="w-full rounded-lg border border-navy/20 bg-white px-3 py-2.5 text-base text-navy outline-none focus:border-gold focus:ring-2 focus:ring-gold/30"
      />
    </label>
  );
}

export function SignUpForm({
  action,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
}) {
  const [state, formAction] = useActionState(action, initialState);

  return (
    <form action={formAction} className="w-full max-w-sm space-y-4">
      <Field label="Full name" name="name" autoComplete="name" />
      <Field label="Email" name="email" type="email" autoComplete="email" />
      <Field label="Phone number" name="phone" type="tel" autoComplete="tel" />
      <Field label="Password" name="password" type="password" autoComplete="new-password" />
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <SubmitButton pendingText="Creating account...">Sign Up</SubmitButton>
    </form>
  );
}

export function SignInForm({
  action,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
}) {
  const [state, formAction] = useActionState(action, initialState);

  return (
    <form action={formAction} className="w-full max-w-sm space-y-4">
      <Field label="Email" name="email" type="email" autoComplete="email" />
      <Field label="Password" name="password" type="password" autoComplete="current-password" />
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <SubmitButton pendingText="Signing in...">Sign In</SubmitButton>
    </form>
  );
}
