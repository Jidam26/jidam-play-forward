"use client";

import { useActionState } from "react";
import { addExpenseAction, type ExpenseFormState } from "@/lib/actions/expenses";
import { SubmitButton } from "@/components/SubmitButton";

const initialState: ExpenseFormState = {};

/** gameId is null for a general (not game-specific) expense. */
export function ExpenseForm({ gameId }: { gameId: string | null }) {
  const action = addExpenseAction.bind(null, gameId);
  const [state, formAction] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <label className="min-w-0 flex-1 basis-40">
        <span className="mb-1 block text-xs font-medium text-navy/70">Description</span>
        <input
          name="description"
          type="text"
          required
          placeholder="e.g. Venue rental"
          className="w-full rounded-lg border border-navy/20 bg-white px-2.5 py-2 text-sm text-navy outline-none focus:border-gold focus:ring-2 focus:ring-gold/30"
        />
      </label>
      <label className="w-28">
        <span className="mb-1 block text-xs font-medium text-navy/70">Amount (AED)</span>
        <input
          name="amount"
          type="number"
          min={0.01}
          step="0.01"
          required
          className="w-full rounded-lg border border-navy/20 bg-white px-2.5 py-2 text-sm text-navy outline-none focus:border-gold focus:ring-2 focus:ring-gold/30"
        />
      </label>
      <label className="w-36">
        <span className="mb-1 block text-xs font-medium text-navy/70">
          Date <span className="font-normal text-navy/40">(optional)</span>
        </span>
        <input
          name="date"
          type="date"
          className="w-full rounded-lg border border-navy/20 bg-white px-2.5 py-2 text-sm text-navy outline-none focus:border-gold focus:ring-2 focus:ring-gold/30"
        />
      </label>
      <label className="min-w-0 flex-1 basis-40">
        <span className="mb-1 block text-xs font-medium text-navy/70">
          Receipt <span className="font-normal text-navy/40">(optional)</span>
        </span>
        {/* No `capture` attribute -- that would force the camera open every
            time. Leaving it off lets the OS show its normal picker, which
            offers "Take Photo" alongside the gallery and files on a phone,
            and a plain file browser on desktop. */}
        <input
          name="receipt"
          type="file"
          accept="image/*,application/pdf"
          className="w-full rounded-lg border border-navy/20 bg-white px-2.5 py-1.5 text-xs text-navy outline-none file:mr-2 file:rounded-full file:border-0 file:bg-navy/10 file:px-2.5 file:py-1 file:text-xs file:font-semibold file:text-navy focus:border-gold focus:ring-2 focus:ring-gold/30"
        />
      </label>
      <SubmitButton pendingText="Adding..." className="w-auto px-4 py-2 text-sm">
        Add Expense
      </SubmitButton>
      {state.error && <p className="w-full text-xs text-red-600">{state.error}</p>}
    </form>
  );
}
