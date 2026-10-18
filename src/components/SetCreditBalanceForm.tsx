"use client";

import { useActionState, useState } from "react";
import { setCreditBalanceAction, type CreditBalanceState } from "@/lib/actions/plans";
import { SubmitButton } from "@/components/SubmitButton";

const initialState: CreditBalanceState = {};

/** Admin-only: directly correct a member's credit balance for a sport (0 removes it). Distinct from Issue Credits, which adds a new purchase record. */
export function SetCreditBalanceForm({ userId, memberName }: { userId: string; memberName: string }) {
  const [open, setOpen] = useState(false);
  const action = setCreditBalanceAction.bind(null, userId, memberName);
  const [state, formAction] = useActionState(action, initialState);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full border border-navy/20 px-3 py-1 text-xs font-semibold text-navy hover:bg-navy/5"
      >
        Edit Credits
      </button>
    );
  }

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2 rounded-lg border border-navy/10 bg-navy/5 p-3">
      <label className="w-28">
        <span className="mb-1 block text-xs font-medium text-navy/70">Sport</span>
        <select
          name="sport"
          required
          defaultValue="Football"
          className="w-full rounded-lg border border-navy/20 bg-white px-2 py-1.5 text-sm text-navy outline-none focus:border-gold focus:ring-2 focus:ring-gold/30"
        >
          <option value="Football">Football</option>
          <option value="Volleyball">Volleyball</option>
          <option value="Padel">Padel</option>
          <option value="Basketball">Basketball</option>
        </select>
      </label>
      <label className="w-24">
        <span className="mb-1 block text-xs font-medium text-navy/70">
          Balance <span className="font-normal text-navy/40">(0=remove)</span>
        </span>
        <input
          name="balance"
          type="number"
          min={0}
          step="1"
          required
          defaultValue={0}
          className="w-full rounded-lg border border-navy/20 bg-white px-2 py-1.5 text-sm text-navy outline-none focus:border-gold focus:ring-2 focus:ring-gold/30"
        />
      </label>
      <SubmitButton pendingText="Saving..." className="w-auto px-3 py-1.5 text-xs">
        Save
      </SubmitButton>
      <button type="button" onClick={() => setOpen(false)} className="text-xs font-semibold text-navy/50 hover:text-navy">
        Cancel
      </button>
      {state.error && <p className="w-full text-xs text-red-600">{state.error}</p>}
    </form>
  );
}
