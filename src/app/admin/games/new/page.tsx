import { requireAdmin } from "@/lib/session";
import { NavBar } from "@/components/NavBar";
import { PublishGameForm } from "@/components/PublishGameForm";

export default async function NewGamePage() {
  const session = await requireAdmin();

  return (
    <>
      <NavBar session={session} />
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-10">
        <h1 className="text-2xl font-extrabold text-navy">Publish a Game</h1>
        <p className="mt-1 text-sm text-navy/60">This will appear immediately on the public Upcoming Games page.</p>
        <div className="mt-6">
          <PublishGameForm />
        </div>
      </main>
    </>
  );
}
