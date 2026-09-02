import type { Game } from "@/lib/repositories/games";
import { formatMoney } from "@/lib/money";
import { ReserveForm } from "@/components/ReserveForm";
import { SportBadge } from "@/components/SportBadge";

function formatDate(dateStr: string) {
  const date = new Date(`${dateStr}T00:00:00`);
  return date.toLocaleDateString("en-AE", { weekday: "short", day: "numeric", month: "short" });
}

export function GameCard({
  game,
  alreadyBooked,
  paidAttendeeNames,
  waitlistPosition,
  creditBalance,
}: {
  game: Game;
  alreadyBooked: boolean;
  /** Only passed once the current member has a paid spot in this game -- see games/page.tsx. */
  paidAttendeeNames?: string[];
  /** 1-indexed queue position if the current member is on this game's waitlist. */
  waitlistPosition?: number;
  /** Remaining game credits the member has for this sport -- see games/page.tsx. */
  creditBalance?: number;
}) {
  const isFull = game.spots_filled >= game.total_spots;

  return (
    <div className="rounded-2xl border border-navy/10 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <SportBadge sport={game.sport} />
        <span className="rounded-full bg-navy/5 px-3 py-1 text-xs font-semibold text-navy">
          AED {formatMoney(game.price_aed)}
        </span>
      </div>

      <div className="mt-3">
        <p className="text-lg font-bold text-navy">
          {formatDate(game.date)} &middot; {game.time}
        </p>
        <p className="text-sm text-navy/70">{game.venue}</p>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm">
        <span className={`font-semibold ${isFull ? "text-red-600" : "text-navy/70"}`}>
          {game.spots_filled}/{game.total_spots} filled
        </span>
      </div>

      <div className="mt-4">
        <ReserveForm
          gameId={game.id}
          isFull={isFull}
          alreadyBooked={alreadyBooked}
          paymentLink={game.payment_link}
          gameLabel={`${game.sport} on ${formatDate(game.date)}`}
          waitlistPosition={waitlistPosition}
          creditBalance={creditBalance}
        />
      </div>

      {paidAttendeeNames && paidAttendeeNames.length > 0 && (
        <div className="mt-4 border-t border-navy/10 pt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-navy/50">Who&apos;s playing</p>
          <p className="mt-1 text-sm text-navy/80">{paidAttendeeNames.join(", ")}</p>
        </div>
      )}
    </div>
  );
}
