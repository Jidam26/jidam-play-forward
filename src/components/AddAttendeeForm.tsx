"use client";

import { useActionState, useState } from "react";
import { addAttendeeAction, type AddAttendeeState } from "@/lib/actions/bookings";
import { SubmitButton } from "@/components/SubmitButton";

const initialState: AddAttendeeState = {};

export function AddAttendeeForm({
  gameId,
  gameLabel,
  memberOptions,
}: {
  gameId: string;
  gameLabel: string;
  memberOptions: { id: string; name: string; email: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [memberId, setMemberId] = useState("");
  const action = addAttendeeAction.bind(null, gameId, gameLabel);
  const [state, formAction] = useActionState(action, initialState);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full border border-navy/20 px-3 py-1 text-xs font-semibold text-navy hover:bg-navy/5"
      >
        + Add Player
      </button>
    );
  }

  return (
    <form action={formAction} className="mt-3 space-y-2 rounded-lg border border-navy/10 bg-navy/5 p-3">
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-navy/70">Existing member</span>
        <select
          name="memberId"
          value={memberId}
          onChange={(e) => setMemberId(e.target.value)}
          className="w-full rounded-lg border border-navy/20 bg-white px-2.5 py-2 text-sm text-navy outline-none focus:border-gold focus:ring-2 focus:ring-gold/30"
        >
          <option value="">-- Walk-in (enter name below) --</option>
          {memberOptions.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} ({m.email})
            </option>
          ))}
        </select>
      </label>
      {!memberId && (
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-navy/70">Walk-in name</span>
          <input
            name="walkInName"
            type="text"
            placeholder="e.g. Ahmed (guest)"
            className="w-full rounded-lg border border-navy/20 bg-white px-2.5 py-2 text-sm text-navy outline-none focus:border-gold focus:ring-2 focus:ring-gold/30"
          />
        </label>
      )}
      <div className="flex items-center gap-2">
        <SubmitButton pendingText="Adding..." className="w-auto px-4 py-1.5 text-xs">
          Add to Game
        </SubmitButton>
        <button type="button" onClick={() => setOpen(false)} className="text-xs font-semibold text-navy/50 hover:text-navy">
          Cancel
        </button>
      </div>
      {state.error && <p className="text-xs text-red-600">{state.error}</p>}
      {state.success && <p className="text-xs font-semibold text-green-700">Added — reserved, not yet paid.</p>}
    </form>
  );
}
