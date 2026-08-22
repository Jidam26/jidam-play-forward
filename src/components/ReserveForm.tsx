"use client";

import { useActionState } from "react";
import { reserveSpotAction, type ReserveState } from "@/lib/actions/bookings";
import { SubmitButton } from "@/components/SubmitButton";

const initialState: ReserveState = {};

export function ReserveForm({
  gameId,
  isFull,
  alreadyBooked,
}: {
  gameId: string;
  isFull: boolean;
  alreadyBooked: boolean;
}) {
  const [state, formAction] = useActionState(reserveSpotAction, initialState);

  if (alreadyBooked || state.success) {
    return (
      <p className="rounded-lg bg-navy/5 px-4 py-3 text-center text-sm font-semibold text-navy">
        You&apos;re in — see it under My Bookings
      </p>
    );
  }

  if (isFull) {
    return (
      <button
        disabled
        className="w-full cursor-not-allowed rounded-lg bg-navy/10 px-4 py-3 text-base font-semibold text-navy/40"
      >
        Full
      </button>
    );
  }

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="gameId" value={gameId} />
      <SubmitButton pendingText="Reserving...">Reserve Spot</SubmitButton>
      {state.error && <p className="text-center text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
