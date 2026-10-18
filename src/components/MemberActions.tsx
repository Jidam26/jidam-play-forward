"use client";

import { useActionState, useState } from "react";
import { updateMemberAction, deleteMemberAction, type MemberFormState } from "@/lib/actions/members";
import { SubmitButton } from "@/components/SubmitButton";

const initialState: MemberFormState = {};

/** Admin-only: edit a member's profile, or permanently delete them and all their history. */
export function MemberActions({ userId, name, email, phone }: { userId: string; name: string; email: string; phone: string }) {
  const [editing, setEditing] = useState(false);
  const action = updateMemberAction.bind(null, userId);
  const [state, formAction] = useActionState(action, initialState);

  if (editing) {
    return (
      <form action={formAction} className="mt-3 space-y-2 rounded-lg border border-navy/10 bg-navy/5 p-3">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-navy/70">Name</span>
          <input
            name="name"
            type="text"
            defaultValue={name}
            required
            className="w-full rounded-lg border border-navy/20 bg-white px-2.5 py-2 text-sm text-navy outline-none focus:border-gold focus:ring-2 focus:ring-gold/30"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-navy/70">Email</span>
          <input
            name="email"
            type="email"
            defaultValue={email}
            required
            className="w-full rounded-lg border border-navy/20 bg-white px-2.5 py-2 text-sm text-navy outline-none focus:border-gold focus:ring-2 focus:ring-gold/30"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-navy/70">Phone</span>
          <input
            name="phone"
            type="tel"
            defaultValue={phone}
            required
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
    <div className="mt-3 flex items-center gap-2">
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="rounded-full border border-navy/20 px-2.5 py-1 text-xs font-semibold text-navy hover:bg-navy/5"
      >
        Edit
      </button>
      <form
        action={deleteMemberAction.bind(null, userId, name)}
        onSubmit={(e) => {
          if (
            !confirm(
              `Permanently delete ${name}? This removes their account and every booking, credit, and subscription they have -- it cannot be undone. (Any receipts already issued stay in the ledger.)`
            )
          ) {
            e.preventDefault();
          }
        }}
      >
        <button type="submit" className="rounded-full border border-red-300 px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50">
          Delete
        </button>
      </form>
    </div>
  );
}
