"use client";

import { useActionState } from "react";
import { createAdminAction, type CreateAdminState } from "@/lib/actions/admins";
import { SubmitButton } from "@/components/SubmitButton";

const initialState: CreateAdminState = {};

export function CreateAdminForm() {
  const [state, formAction] = useActionState(createAdminAction, initialState);

  return (
    <form action={formAction} className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-navy">Full name</span>
          <input
            name="name"
            type="text"
            required
            className="w-full rounded-lg border border-navy/20 bg-white px-3 py-2.5 text-base text-navy outline-none focus:border-gold focus:ring-2 focus:ring-gold/30"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-navy">Email</span>
          <input
            name="email"
            type="email"
            required
            className="w-full rounded-lg border border-navy/20 bg-white px-3 py-2.5 text-base text-navy outline-none focus:border-gold focus:ring-2 focus:ring-gold/30"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-navy">Phone number</span>
          <input
            name="phone"
            type="tel"
            required
            className="w-full rounded-lg border border-navy/20 bg-white px-3 py-2.5 text-base text-navy outline-none focus:border-gold focus:ring-2 focus:ring-gold/30"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-navy">Temporary password</span>
          <input
            name="password"
            type="text"
            required
            minLength={6}
            placeholder="They'll change this after logging in"
            className="w-full rounded-lg border border-navy/20 bg-white px-3 py-2.5 text-base text-navy outline-none focus:border-gold focus:ring-2 focus:ring-gold/30"
          />
        </label>
      </div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="text-sm text-green-700">Admin account created.</p>}
      <SubmitButton pendingText="Creating...">Create Admin Account</SubmitButton>
    </form>
  );
}
