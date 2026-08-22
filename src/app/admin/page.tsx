import Link from "next/link";
import { requireAdmin } from "@/lib/session";
import { listUpcomingGames, type Game } from "@/lib/repositories/games";
import { listAttendeesForGame, type Attendee } from "@/lib/repositories/bookings";
import { NavBar } from "@/components/NavBar";
import { SportBadge } from "@/components/SportBadge";

function formatDate(dateStr: string) {
  const date = new Date(`${dateStr}T00:00:00`);
  return date.toLocaleDateString("en-AE", { weekday: "short", day: "numeric", month: "short" });
}

export default async function AdminDashboardPage() {
  const session = await requireAdmin();
  const games = await listUpcomingGames();
  const attendeesByGame = new Map<string, Attendee[]>(
    await Promise.all(games.map(async (g: Game): Promise<[string, Attendee[]]> => [g.id, await listAttendeesForGame(g.id)]))
  );

  return (
    <>
      <NavBar session={session} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-navy">Admin Dashboard</h1>
          <Link
            href="/admin/games/new"
            className="rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-navy hover:bg-gold-light"
          >
            + Publish a Game
          </Link>
        </div>

        {games.length === 0 ? (
          <p className="mt-10 text-center text-navy/50">No upcoming games. Publish one to get started.</p>
        ) : (
          <div className="mt-6 space-y-6">
            {games.map((game) => {
              const attendees = attendeesByGame.get(game.id) ?? [];
              const revenue = game.spots_filled * game.price_aed;
              return (
                <div key={game.id} className="rounded-2xl border border-navy/10 bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <SportBadge sport={game.sport} />
                      <p className="mt-2 font-bold text-navy">
                        {formatDate(game.date)} &middot; {game.time}
                      </p>
                      <p className="text-sm text-navy/70">{game.venue}</p>
                    </div>
                    <div className="text-right text-sm">
                      <p className="font-semibold text-navy">
                        {game.spots_filled}/{game.total_spots} filled
                      </p>
                      <p className="text-navy/60">Revenue: AED {revenue}</p>
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
                                <span
                                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                                    a.payment_status === "paid"
                                      ? "bg-green-100 text-green-800"
                                      : "bg-gold/15 text-navy"
                                  }`}
                                >
                                  {a.payment_status === "paid" ? "Paid" : "Reserved"}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
