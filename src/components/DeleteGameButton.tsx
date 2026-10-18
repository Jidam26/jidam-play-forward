"use client";

import { deleteGameAction } from "@/lib/actions/games";

export function DeleteGameButton({ gameId, gameLabel }: { gameId: string; gameLabel: string }) {
  return (
    <form
      action={deleteGameAction.bind(null, gameId)}
      onSubmit={(e) => {
        if (
          !confirm(
            `Permanently delete ${gameLabel}? This removes the game and everyone's bookings for it -- it cannot be undone. (Any receipts already issued are unaffected.)`
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <button
        type="submit"
        className="rounded-full border border-red-300 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
      >
        Delete Game
      </button>
    </form>
  );
}
