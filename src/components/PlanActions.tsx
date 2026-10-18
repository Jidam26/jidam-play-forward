"use client";

import { useActionState, useState } from "react";
import { updatePlanAction, deletePlanAction, type FormState } from "@/lib/actions/plans";
import type { Plan } from "@/lib/repositories/plans";
import { SubmitButton } from "@/components/SubmitButton";

const initialState: FormState = {};

/** Admin-only: edit a plan's terms, or permanently delete it. Past purchases of a deleted plan are unaffected -- see deletePlan. */
export function PlanActions({ plan }: { plan: Plan }) {
  const [editing, setEditing] = useState(false);
  const action = updatePlanAction.bind(null, plan.id);
  const [state, formAction] = useActionState(action, initialState);

  if (editing) {
    return (
      <form action={formAction} className="mt-3 w-full space-y-2 rounded-lg border border-navy/10 bg-navy/5 p-3">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-navy/70">Name</span>
          <input
            name="name"
            type="text"
            defaultValue={plan.name}
            required
            className="w-full rounded-lg border border-navy/20 bg-white px-2.5 py-2 text-sm text-navy outline-none focus:border-gold focus:ring-2 focus:ring-gold/30"
          />
        </label>
        <input type="hidden" name="sport" value={plan.sport} />
        {plan.plan_type === "credits" ? (
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-navy/70">Games included</span>
            <input
              name="games_included"
              type="number"
              min={1}
              defaultValue={plan.games_included ?? 1}
              required
              className="w-full rounded-lg border border-navy/20 bg-white px-2.5 py-2 text-sm text-navy outline-none focus:border-gold focus:ring-2 focus:ring-gold/30"
            />
          </label>
        ) : (
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-navy/70">Duration (days)</span>
            <input
              name="duration_days"
              type="number"
              min={1}
              defaultValue={plan.duration_days ?? 30}
              required
              className="w-full rounded-lg border border-navy/20 bg-white px-2.5 py-2 text-sm text-navy outline-none focus:border-gold focus:ring-2 focus:ring-gold/30"
            />
          </label>
        )}
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-navy/70">Price (AED)</span>
          <input
            name="price_aed"
            type="number"
            min={0}
            step="0.01"
            defaultValue={plan.price_aed}
            required
            className="w-full rounded-lg border border-navy/20 bg-white px-2.5 py-2 text-sm text-navy outline-none focus:border-gold focus:ring-2 focus:ring-gold/30"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-navy/70">
            Payment link <span className="font-normal text-navy/40">(optional)</span>
          </span>
          <input
            name="payment_link"
            type="url"
            defaultValue={plan.payment_link ?? ""}
            className="w-full rounded-lg border border-navy/20 bg-white px-2.5 py-2 text-sm text-navy outline-none focus:border-gold focus:ring-2 focus:ring-gold/30"
          />
        </label>
        <div className="flex items-center gap-2">
          <SubmitButton pendingText="Saving..." className="w-auto px-4 py-1.5 text-xs">
            Save
          </SubmitButton>
          <button type="button" onClick={() => setEditing(false)} className="text-xs font-semibold text-navy/50 hover:text-navy">
            Cancel
          </button>
        </div>
        {state.error && <p className="text-xs text-red-600">{state.error}</p>}
      </form>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="rounded-full border border-navy/20 px-3 py-1 text-xs font-semibold text-navy hover:bg-navy/5"
      >
        Edit
      </button>
      <form
        action={deletePlanAction.bind(null, plan.id)}
        onSubmit={(e) => {
          if (!confirm(`Permanently delete "${plan.name}"? Members who already bought it keep what they have -- this only stops new purchases.`)) {
            e.preventDefault();
          }
        }}
      >
        <button type="submit" className="rounded-full border border-red-300 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50">
          Delete
        </button>
      </form>
    </div>
  );
}
