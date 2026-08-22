"use client";

import { cancelGameAction } from "@/lib/actions/games";

export function CancelGameButton({ gameId }: { gameId: string }) {
  return (
    <form
      action={cancelGameAction.bind(null, gameId)}
      onSubmit={(e) => {
        if (!confirm("Cancel this game? It disappears from the public games list immediately.")) {
          e.preventDefault();
        }
      }}
    >
      <button
        type="submit"
        className="rounded-full border border-red-300 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
      >
        Cancel Game
      </button>
    </form>
  );
}
