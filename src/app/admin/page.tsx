import Link from "next/link";
import { requireAdmin } from "@/lib/session";
import { listUpcomingGames, listCancelledGames, type Game } from "@/lib/repositories/games";
import { listAttendeesForGame, type Attendee } from "@/lib/repositories/bookings";
import { listPendingPlanPurchases } from "@/lib/repositories/planPurchases";
import { AdminGameCard } from "@/components/AdminGameCard";
import { CancelGameButton } from "@/components/CancelGameButton";
import { PendingPlanPurchases } from "@/components/PendingPlanPurchases";
import { NavBar } from "@/components/NavBar";

async function attendeesFor(games: Game[]): Promise<Map<string, Attendee[]>> {
  return new Map(await Promise.all(games.map(async (g): Promise<[string, Attendee[]]> => [g.id, await listAttendeesForGame(g.id)])));
}

export default async function AdminDashboardPage() {
  const session = await requireAdmin();
  const [liveGames, cancelledGames, pendingPlanPurchases] = await Promise.all([
    listUpcomingGames(),
    listCancelledGames(),
    listPendingPlanPurchases(),
  ]);
  const [liveAttendees, cancelledAttendees] = await Promise.all([attendeesFor(liveGames), attendeesFor(cancelledGames)]);

  return (
    <>
      <NavBar session={session} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-extrabold text-navy">Admin Dashboard</h1>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/plans"
              className="rounded-lg border border-navy/20 px-4 py-2 text-sm font-semibold text-navy hover:bg-navy/5"
            >
              Plans
            </Link>
            <Link
              href="/admin/past"
              className="rounded-lg border border-navy/20 px-4 py-2 text-sm font-semibold text-navy hover:bg-navy/5"
            >
              Past Games
            </Link>
            <Link
              href="/admin/games/new"
              className="rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-navy hover:bg-gold-light"
            >
              + Publish a Game
            </Link>
          </div>
        </div>

        <PendingPlanPurchases purchases={pendingPlanPurchases} />

        <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-navy/50">Live</h2>
        {liveGames.length === 0 ? (
          <p className="mt-4 text-center text-navy/50">No upcoming games. Publish one to get started.</p>
        ) : (
          <div className="mt-3 space-y-6">
            {liveGames.map((game) => (
              <AdminGameCard
                key={game.id}
                game={game}
                attendees={liveAttendees.get(game.id) ?? []}
                actions={<CancelGameButton gameId={game.id} />}
              />
            ))}
          </div>
        )}

        {cancelledGames.length > 0 && (
          <>
            <h2 className="mt-10 text-sm font-semibold uppercase tracking-wide text-navy/50">Cancelled</h2>
            <p className="mt-1 text-xs text-navy/50">
              Still visible so you can message everyone who booked. Not shown to members.
            </p>
            <div className="mt-3 space-y-6">
              {cancelledGames.map((game) => (
                <AdminGameCard key={game.id} game={game} attendees={cancelledAttendees.get(game.id) ?? []} />
              ))}
            </div>
          </>
        )}
      </main>
    </>
  );
}
