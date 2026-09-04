"use client";

import { useActionState, useState } from "react";
import { issueCreditsAction, type IssueCreditsState } from "@/lib/actions/plans";
import { SubmitButton } from "@/components/SubmitButton";

const initialState: IssueCreditsState = {};

/** Admin dashboard: grant credits to a member directly, no purchase request needed -- see issueCreditsDirectly. */
export function IssueCreditsForm({ userId, memberName }: { userId: string; memberName: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(issueCreditsAction, initialState);

  if (state.success) {
    return <p className="text-xs font-semibold text-green-700">Credits issued.</p>;
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full border border-navy/20 px-3 py-1 text-xs font-semibold text-navy hover:bg-navy/5"
      >
        Issue Credits
      </button>
    );
  }

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2 rounded-lg border border-navy/10 bg-navy/5 p-3">
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="memberName" value={memberName} />
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
      <label className="w-20">
        <span className="mb-1 block text-xs font-medium text-navy/70">Credits</span>
        <input
          name="gamesIncluded"
          type="number"
          min={1}
          step="1"
          required
          defaultValue={1}
          className="w-full rounded-lg border border-navy/20 bg-white px-2 py-1.5 text-sm text-navy outline-none focus:border-gold focus:ring-2 focus:ring-gold/30"
        />
      </label>
      <label className="w-24">
        <span className="mb-1 block text-xs font-medium text-navy/70">
          AED <span className="font-normal text-navy/40">(0=comp)</span>
        </span>
        <input
          name="priceAed"
          type="number"
          min={0}
          step="0.01"
          required
          defaultValue={0}
          className="w-full rounded-lg border border-navy/20 bg-white px-2 py-1.5 text-sm text-navy outline-none focus:border-gold focus:ring-2 focus:ring-gold/30"
        />
      </label>
      <SubmitButton pendingText="Issuing..." className="w-auto px-3 py-1.5 text-xs">
        Confirm
      </SubmitButton>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="text-xs font-semibold text-navy/50 hover:text-navy"
      >
        Cancel
      </button>
      {state.error && <p className="w-full text-xs text-red-600">{state.error}</p>}
    </form>
  );
}
