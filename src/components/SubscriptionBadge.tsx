"use client";

import { useActionState, useState } from "react";
import { cancelSubscriptionAction, updateSubscriptionAction, type EditSubscriptionState } from "@/lib/actions/plans";
import { SubmitButton } from "@/components/SubmitButton";

const initialState: EditSubscriptionState = {};

/** One active subscription badge, with Cancel and "change expiry" actions. */
export function SubscriptionBadge({
  userId,
  memberName,
  sport,
  validUntil,
}: {
  userId: string;
  memberName: string;
  sport: string;
  validUntil: string;
}) {
  const [editing, setEditing] = useState(false);
  const action = updateSubscriptionAction.bind(null, userId, memberName, sport);
  const [state, formAction] = useActionState(action, initialState);

  if (editing) {
    return (
      <form action={formAction} className="flex items-center gap-1.5 rounded-full bg-gold/10 px-2.5 py-1 text-xs">
        <span className="font-semibold text-navy">{sport}</span>
        <input
          name="validUntil"
          type="date"
          defaultValue={validUntil}
          className="rounded border border-navy/20 bg-white px-1 py-0.5 text-xs text-navy"
        />
        <SubmitButton pendingText="…" className="w-auto rounded-full px-2 py-0.5 text-xs">
          Save
        </SubmitButton>
        <button type="button" onClick={() => setEditing(false)} className="text-navy/40 hover:text-navy">
          ✕
        </button>
        {state.error && <span className="w-full text-red-600">{state.error}</span>}
      </form>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-gold/10 px-2.5 py-1 text-xs font-semibold text-navy">
      {sport}: until {validUntil}
      <button type="button" onClick={() => setEditing(true)} className="font-normal text-navy/50 hover:text-navy">
        edit
      </button>
      <form
        action={cancelSubscriptionAction.bind(null, userId, memberName, sport)}
        onSubmit={(e) => {
          if (!confirm(`Cancel ${memberName}'s ${sport} subscription?`)) e.preventDefault();
        }}
      >
        <button type="submit" className="font-normal text-red-600 hover:text-red-700">
          cancel
        </button>
      </form>
    </span>
  );
}
