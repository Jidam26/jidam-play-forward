"use client";

import { useActionState, useState } from "react";
import { resetAllGamesDataAction, type ResetGamesState } from "@/lib/actions/settings";
import { SubmitButton } from "@/components/SubmitButton";

const initialState: ResetGamesState = {};

/** Boss-only Danger Zone widget: download a backup, then type DELETE to permanently wipe every game. */
export function ResetAllGamesForm() {
  const [state, formAction] = useActionState(resetAllGamesDataAction, initialState);
  const [confirmation, setConfirmation] = useState("");

  return (
    <div className="mt-8 rounded-2xl border-2 border-red-200 bg-red-50 p-5">
      <h2 className="font-bold text-red-800">Danger Zone</h2>
      <p className="mt-1 text-sm text-red-700">
        Permanently delete every game (live, past, and cancelled) and everything tied to one -- bookings, game
        expenses, waitlist entries -- plus the entire receipts ledger. Members, credit balances, and subscriptions
        are not touched. There is no undo.
      </p>

      <a
        href="/api/admin/games-backup"
        className="mt-4 inline-block rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
      >
        ⬇ Download a backup first
      </a>

      <form
        action={formAction}
        onSubmit={(e) => {
          if (!confirm("This permanently deletes all games, bookings, expenses, and receipts. This cannot be undone. Continue?")) {
            e.preventDefault();
          }
        }}
        className="mt-5 border-t border-red-200 pt-4"
      >
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-red-700">
            Type <span className="font-mono font-bold">DELETE</span> to confirm
          </span>
          <input
            name="confirmation"
            type="text"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            autoComplete="off"
            className="w-full rounded-lg border border-red-300 bg-white px-2.5 py-2 text-sm text-navy outline-none focus:border-red-500 focus:ring-2 focus:ring-red-300 sm:w-48"
          />
        </label>
        <div className="mt-3">
          <SubmitButton
            pendingText="Deleting..."
            disabled={confirmation !== "DELETE"}
            className="w-auto bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Permanently Delete All Games
          </SubmitButton>
        </div>
        {state.error && <p className="mt-2 text-xs text-red-700">{state.error}</p>}
      </form>
    </div>
  );
}
