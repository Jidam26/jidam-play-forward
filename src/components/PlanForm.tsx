"use client";

import { useActionState } from "react";
import { createPlanAction, type FormState } from "@/lib/actions/plans";
import { SubmitButton } from "@/components/SubmitButton";

const initialState: FormState = {};

export function PlanForm() {
  const [state, formAction] = useActionState(createPlanAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-navy">Sport</span>
        <select
          name="sport"
          required
          defaultValue="Football"
          className="w-full rounded-lg border border-navy/20 bg-white px-3 py-2.5 text-base text-navy outline-none focus:border-gold focus:ring-2 focus:ring-gold/30"
        >
          <option value="Football">Football</option>
          <option value="Volleyball">Volleyball</option>
          <option value="Padel">Padel</option>
          <option value="Basketball">Basketball</option>
        </select>
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-navy">Plan name</span>
        <input
          name="name"
          type="text"
          required
          placeholder="e.g. 4-Game Football Pack"
          className="w-full rounded-lg border border-navy/20 bg-white px-3 py-2.5 text-base text-navy outline-none focus:border-gold focus:ring-2 focus:ring-gold/30"
        />
      </label>

      <div className="grid grid-cols-2 gap-4">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-navy">Games included</span>
          <input
            name="games_included"
            type="number"
            min={1}
            step="1"
            required
            defaultValue={4}
            className="w-full rounded-lg border border-navy/20 bg-white px-3 py-2.5 text-base text-navy outline-none focus:border-gold focus:ring-2 focus:ring-gold/30"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-navy">Price (AED)</span>
          <input
            name="price_aed"
            type="number"
            min={0}
            step="0.01"
            required
            defaultValue={120}
            className="w-full rounded-lg border border-navy/20 bg-white px-3 py-2.5 text-base text-navy outline-none focus:border-gold focus:ring-2 focus:ring-gold/30"
          />
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-navy">
          Payment link <span className="font-normal text-navy/50">(optional)</span>
        </span>
        <input
          name="payment_link"
          type="url"
          placeholder="https://pay.adcb.com/..."
          className="w-full rounded-lg border border-navy/20 bg-white px-3 py-2.5 text-base text-navy outline-none focus:border-gold focus:ring-2 focus:ring-gold/30"
        />
        <span className="mt-1 block text-xs text-navy/50">
          Shown to members after they request this plan, with instructions to WhatsApp a payment screenshot.
        </span>
      </label>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <SubmitButton pendingText="Creating...">Create Plan</SubmitButton>
    </form>
  );
}
