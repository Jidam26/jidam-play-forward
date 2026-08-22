import { requireSession } from "@/lib/session";
import { listUpcomingGames } from "@/lib/repositories/games";
import { listBookingsForUser } from "@/lib/repositories/bookings";
import { NavBar } from "@/components/NavBar";
import { GameCard } from "@/components/GameCard";

export default async function GamesPage() {
  const session = await requireSession();
  const games = await listUpcomingGames();
  const myBookedGameIds = new Set((await listBookingsForUser(session.id)).map((b) => b.game_id));

  return (
    <>
      <NavBar session={session} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <h1 className="text-2xl font-extrabold text-navy">Upcoming Games</h1>
        <p className="mt-1 text-sm text-navy/60">Reserve your spot before it fills up.</p>

        {games.length === 0 ? (
          <p className="mt-10 text-center text-navy/50">No games scheduled yet — check back soon.</p>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {games.map((game) => (
              <GameCard key={game.id} game={game} alreadyBooked={myBookedGameIds.has(game.id)} />
            ))}
          </div>
        )}
      </main>
    </>
  );
}
