"use client";

import { useActionState, useState } from "react";
import { editBookingAmountAction, type EditBookingAmountState } from "@/lib/actions/bookings";
import { SubmitButton } from "@/components/SubmitButton";

const initialState: EditBookingAmountState = {};

/** Admin-only: correct the AED amount on an already-paid booking. */
export function EditBookingAmountButton({
  bookingId,
  attendeeName,
  gameLabel,
  gameId,
  currentAmount,
}: {
  bookingId: string;
  attendeeName: string;
  gameLabel: string;
  gameId: string;
  currentAmount: number;
}) {
  const [open, setOpen] = useState(false);
  const action = editBookingAmountAction.bind(null, bookingId, attendeeName, gameLabel, gameId);
  const [state, formAction] = useActionState(action, initialState);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full border border-navy/20 px-2 py-0.5 text-xs font-semibold text-navy/60 hover:bg-navy/5"
        title="Correct the paid amount"
      >
        Edit amount
      </button>
    );
  }

  return (
    <form action={formAction} className="flex items-center gap-1">
      <input
        name="amount"
        type="number"
        min={0}
        step="0.01"
        defaultValue={currentAmount}
        className="w-16 rounded border border-navy/20 bg-white px-1 py-0.5 text-xs text-navy"
      />
      <SubmitButton pendingText="…" className="w-auto rounded-full px-2 py-0.5 text-xs">
        Save
      </SubmitButton>
      <button type="button" onClick={() => setOpen(false)} className="text-xs text-navy/40 hover:text-navy">
        ✕
      </button>
      {state.error && <p className="w-full text-xs text-red-600">{state.error}</p>}
    </form>
  );
}
