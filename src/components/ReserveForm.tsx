"use client";

import { useActionState } from "react";
import {
  reserveSpotAction,
  reserveSpotWithCreditAction,
  reserveSpotWithSubscriptionAction,
  joinWaitlistAction,
  leaveWaitlistAction,
  type ReserveState,
  type ReserveWithCreditState,
  type ReserveWithSubscriptionState,
  type WaitlistState,
} from "@/lib/actions/bookings";
import { SubmitButton } from "@/components/SubmitButton";
import { PaymentInstructions } from "@/components/PaymentInstructions";

const initialReserveState: ReserveState = {};
const initialCreditState: ReserveWithCreditState = {};
const initialSubscriptionState: ReserveWithSubscriptionState = {};
const initialWaitlistState: WaitlistState = {};

export function ReserveForm({
  gameId,
  isFull,
  alreadyBooked,
  paymentLink,
  gameLabel,
  waitlistPosition,
  creditBalance,
  hasSubscription,
}: {
  gameId: string;
  isFull: boolean;
  alreadyBooked: boolean;
  paymentLink: string | null;
  gameLabel: string;
  /** 1-indexed queue position if the current member is on this game's waitlist -- server-refreshed prop, the source of whether they're on it. */
  waitlistPosition?: number;
  /** Remaining game credits the member has for this sport -- see games/page.tsx. */
  creditBalance?: number;
  /** Whether the member has an active monthly subscription covering this sport -- see games/page.tsx. */
  hasSubscription?: boolean;
}) {
  // All four hooks are always called (rules of hooks) -- which one's
  // result is actually rendered depends on the game's state below. None of
  // these states' `success` flags decide *whether* the member is booked/
  // waitlisted (that always comes from the server-refreshed props above,
  // which revalidatePath keeps in sync) -- only to surface a submission
  // error inline.
  const [reserveState, reserveFormAction] = useActionState(reserveSpotAction, initialReserveState);
  const [creditState, creditFormAction] = useActionState(reserveSpotWithCreditAction, initialCreditState);
  const [subscriptionState, subscriptionFormAction] = useActionState(
    reserveSpotWithSubscriptionAction,
    initialSubscriptionState
  );
  const [waitlistState, waitlistFormAction] = useActionState(joinWaitlistAction, initialWaitlistState);

  if (alreadyBooked || reserveState.success || creditState.success || subscriptionState.success) {
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
    <div className="space-y-2">
      {hasSubscription ? (
        <form action={subscriptionFormAction} className="space-y-2">
          <input type="hidden" name="gameId" value={gameId} />
          <button
            type="submit"
            className="w-full rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-offwhite hover:bg-navy-light"
          >
            Play with Subscription
          </button>
          {subscriptionState.error && <p className="text-center text-sm text-red-600">{subscriptionState.error}</p>}
        </form>
      ) : (
        <form action={reserveFormAction} className="space-y-2">
          <input type="hidden" name="gameId" value={gameId} />
          <SubmitButton pendingText="Reserving...">Reserve Spot</SubmitButton>
          {reserveState.error && <p className="text-center text-sm text-red-600">{reserveState.error}</p>}
        </form>
      )}
      {creditBalance !== undefined && creditBalance > 0 && (
        <form action={creditFormAction} className="space-y-2">
          <input type="hidden" name="gameId" value={gameId} />
          <button
            type="submit"
            className="w-full rounded-lg border border-navy/20 px-4 py-2.5 text-sm font-semibold text-navy hover:bg-navy/5"
          >
            Use a Credit ({creditBalance} left)
          </button>
          {creditState.error && <p className="text-center text-sm text-red-600">{creditState.error}</p>}
        </form>
      )}
    </div>
  );
}
