import type { Game } from "@/lib/repositories/games";
import type { Attendee } from "@/lib/repositories/bookings";
import { markPaidAction } from "@/lib/actions/bookings";
import { SportBadge } from "@/components/SportBadge";

function formatDate(dateStr: string) {
  const date = new Date(`${dateStr}T00:00:00`);
  return date.toLocaleDateString("en-AE", { weekday: "short", day: "numeric", month: "short" });
}

/**
 * A game's card in the admin views: header (sport/date/venue/capacity),
 * attendee roster with a "Mark as Paid" toggle, plus optional slots for
 * per-card actions (e.g. Cancel Game) and extra content below the roster
 * (e.g. expenses/profit on the Past Games page).
 */
export function AdminGameCard({
  game,
  attendees,
  actions,
  footer,
}: {
  game: Game;
  attendees: Attendee[];
  actions?: React.ReactNode;
  footer?: React.ReactNode;
}) {
  // Imported historical games (see src/lib/db.ts) record a known total
  // directly since there's no real per-attendee booking data for them.
  const revenue =
    game.imported_revenue ?? attendees.reduce((sum, a) => sum + (a.payment_status === "paid" ? a.amount_paid : 0), 0);

  return (
    <div className="rounded-2xl border border-navy/10 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <SportBadge sport={game.sport} />
            {game.status === "cancelled" && (
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">Cancelled</span>
            )}
          </div>
          <p className="mt-2 font-bold text-navy">
            {formatDate(game.date)} &middot; {game.time}
          </p>
          <p className="text-sm text-navy/70">{game.venue}</p>
        </div>
        <div className="flex flex-col items-end gap-2 text-right text-sm">
          <div>
            <p className="font-semibold text-navy">
              {game.spots_filled}/{game.total_spots} filled
            </p>
            <p className="text-navy/60">Revenue: AED {revenue}</p>
          </div>
          {actions}
        </div>
      </div>

      {attendees.length === 0 ? (
        <p className="mt-4 text-sm text-navy/50">No signups yet.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[420px] text-left text-sm">
            <thead>
              <tr className="border-b border-navy/10 text-navy/50">
                <th className="py-2 pr-4 font-medium">Name</th>
                <th className="py-2 pr-4 font-medium">Email</th>
                <th className="py-2 pr-4 font-medium">Phone</th>
                <th className="py-2 font-medium">Payment</th>
              </tr>
            </thead>
            <tbody>
              {attendees.map((a) => (
                <tr key={a.booking_id} className="border-b border-navy/5 last:border-0">
                  <td className="py-2 pr-4 text-navy">{a.name}</td>
                  <td className="py-2 pr-4 text-navy/70">{a.email}</td>
                  <td className="py-2 pr-4 text-navy/70">{a.phone}</td>
                  <td className="py-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          a.payment_status === "paid" ? "bg-green-100 text-green-800" : "bg-gold/15 text-navy"
                        }`}
                      >
                        {a.payment_status === "paid" ? "Paid" : "Reserved"}
                      </span>
                      {a.payment_status !== "paid" && (
                        <form action={markPaidAction.bind(null, a.booking_id, game.price_aed)}>
                          <button
                            type="submit"
                            className="rounded-full border border-navy/20 px-2 py-0.5 text-xs font-semibold text-navy hover:bg-navy/5"
                          >
                            Mark as Paid
                          </button>
                        </form>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {footer}
    </div>
  );
}
