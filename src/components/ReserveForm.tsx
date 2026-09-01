"use client";

import { useActionState } from "react";
import {
  reserveSpotAction,
  joinWaitlistAction,
  leaveWaitlistAction,
  type ReserveState,
  type WaitlistState,
} from "@/lib/actions/bookings";
import { SubmitButton } from "@/components/SubmitButton";
import { PaymentInstructions } from "@/components/PaymentInstructions";

const initialReserveState: ReserveState = {};
const initialWaitlistState: WaitlistState = {};

export function ReserveForm({
  gameId,
  isFull,
  alreadyBooked,
  paymentLink,
  gameLabel,
  waitlistPosition,
}: {
  gameId: string;
  isFull: boolean;
  alreadyBooked: boolean;
  paymentLink: string | null;
  gameLabel: string;
  /** 1-indexed queue position if the current member is on this game's waitlist -- server-refreshed prop, the source of truth for whether they're on it. */
  waitlistPosition?: number;
}) {
  // Both hooks are always called (rules of hooks) -- which one's result is
  // actually rendered depends on the game's state below. Neither state's
  // `success` flag is used to decide *whether* the member is booked/
  // waitlisted (that always comes from the server-refreshed props above,
  // which revalidatePath keeps in sync) -- only to surface a submission
  // error inline.
  const [reserveState, reserveFormAction] = useActionState(reserveSpotAction, initialReserveState);
  const [waitlistState, waitlistFormAction] = useActionState(joinWaitlistAction, initialWaitlistState);

  if (alreadyBooked || reserveState.success) {
    return (
      <div className="space-y-3">
        <p className="rounded-lg bg-navy/5 px-4 py-3 text-center text-sm font-semibold text-navy">
          You&apos;re in — see it under My Bookings
        </p>
        <PaymentInstructions paymentLink={paymentLink} gameLabel={gameLabel} />
      </div>
    );
  }

  if (waitlistPosition !== undefined) {
    return (
      <div className="space-y-2">
        <p className="rounded-lg bg-gold/10 px-4 py-3 text-center text-sm font-semibold text-navy">
          You&apos;re #{waitlistPosition} on the waitlist
        </p>
        <form action={leaveWaitlistAction.bind(null, gameId)}>
          <button type="submit" className="w-full text-center text-xs font-semibold text-navy/50 hover:text-navy">
            Leave waitlist
          </button>
        </form>
      </div>
    );
  }

  if (isFull) {
    return (
      <div className="space-y-2">
        <form action={waitlistFormAction}>
          <input type="hidden" name="gameId" value={gameId} />
          <SubmitButton pendingText="Joining...">Join Waitlist</SubmitButton>
          {waitlistState.error && <p className="mt-2 text-center text-sm text-red-600">{waitlistState.error}</p>}
        </form>
        <p className="text-center text-xs text-navy/50">We&apos;ll email you if a spot opens up.</p>
      </div>
    );
  }

  return (
    <form action={reserveFormAction} className="space-y-2">
      <input type="hidden" name="gameId" value={gameId} />
      <SubmitButton pendingText="Reserving...">Reserve Spot</SubmitButton>
      {reserveState.error && <p className="text-center text-sm text-red-600">{reserveState.error}</p>}
    </form>
  );
}
