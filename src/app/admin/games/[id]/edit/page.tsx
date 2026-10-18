import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/session";
import { findGameById } from "@/lib/repositories/games";
import { EditGameForm } from "@/components/EditGameForm";
import { NavBar } from "@/components/NavBar";

/** Edit a Live or Cancelled game -- see /admin/past/[id]/edit for the equivalent on a past game. */
export default async function EditLiveGamePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  const { id } = await params;
  const game = await findGameById(id);
  if (!game) notFound();

  return (
    <>
      <NavBar session={session} />
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-10">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-extrabold text-navy">Edit Game</h1>
          <Link href="/admin" className="text-sm font-semibold text-navy hover:text-gold">
            &larr; Back to Dashboard
          </Link>
        </div>
        <p className="mt-1 text-sm text-navy/60">
          {game.sport} on {game.date} at {game.venue}
        </p>
        <div className="mt-6">
          <EditGameForm game={game} returnPath="/admin" />
        </div>
      </main>
    </>
  );
}
