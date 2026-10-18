"use client";

import { useActionState, useState } from "react";
import { flagLateFineAction, flagLateCancelWarningAction, flagNoShowAction, type ConductActionState } from "@/lib/actions/conduct";
import { SubmitButton } from "@/components/SubmitButton";

const initialState: ConductActionState = {};

/**
 * Football-only, admin-confirmed conduct flagging for one attendee -- see
 * the "⚠️ Important – Football Rules" policy this implements. Always a
 * manual click: there's no automatic detection of a real-world late
 * arrival, cancellation, or no-show.
 */
export function ConductActions({ gameId, userId, attendeeName }: { gameId: string; userId: string; attendeeName: string }) {
  const [open, setOpen] = useState(false);
  const [fineAmount, setFineAmount] = useState(10);
  const fineAction = flagLateFineAction.bind(null, gameId, userId, attendeeName);
  const [fineState, fineFormAction] = useActionState(fineAction, initialState);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full border border-navy/20 px-2 py-0.5 text-xs font-semibold text-navy/60 hover:bg-navy/5"
        title="Flag a conduct issue"
      >
        ⚑ Flag
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-navy/10 bg-navy/5 p-1.5">
      <form action={fineFormAction} className="flex items-center gap-1">
        <input
          type="number"
          min={1}
          step="1"
          value={fineAmount}
          onChange={(e) => setFineAmount(Number(e.target.value))}
          name="fineAmount"
          className="w-14 rounded border border-navy/20 bg-white px-1 py-0.5 text-xs text-navy"
        />
        <SubmitButton pendingText="…" className="w-auto rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700 hover:bg-red-200">
          Late (fine)
        </SubmitButton>
      </form>
      <form
        action={flagLateCancelWarningAction.bind(null, gameId, userId, attendeeName)}
        onSubmit={(e) => {
          if (!confirm(`Flag ${attendeeName} with a late-cancellation warning?`)) e.preventDefault();
        }}
      >
        <button type="submit" className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 hover:bg-amber-200">
          Late cancel (warn)
        </button>
      </form>
      <form
        action={flagNoShowAction.bind(null, gameId, userId, attendeeName)}
        onSubmit={(e) => {
          if (!confirm(`Flag ${attendeeName} as a no-show?`)) e.preventDefault();
        }}
      >
        <button type="submit" className="rounded-full bg-navy/10 px-2 py-0.5 text-xs font-semibold text-navy/70 hover:bg-navy/20">
          No-show
        </button>
      </form>
      <button type="button" onClick={() => setOpen(false)} className="text-xs text-navy/40 hover:text-navy">
        ✕
      </button>
      {fineState.error && <p className="w-full text-xs text-red-600">{fineState.error}</p>}
    </div>
  );
}
