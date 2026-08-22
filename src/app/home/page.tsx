import { requireSession } from "@/lib/session";
import { NavBar } from "@/components/NavBar";
import { SportCard } from "@/components/SportCard";

export default async function AboutPage() {
  const session = await requireSession();

  return (
    <>
      <NavBar session={session} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <h1 className="text-2xl font-bold text-navy">About Jidam</h1>
        <p className="mt-3 max-w-xl text-navy/70">
          Jidam is a multi-sport community in Abu Dhabi. We bring people together to play, regardless
          of skill level — book a spot, show up, and play forward.
        </p>

        <h2 className="mt-8 text-lg font-bold text-navy">Sports we offer</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SportCard emoji="⚽" name="Football" description="Weekly 5-a-side and 7-a-side games across Abu Dhabi venues." />
          <SportCard emoji="🏐" name="Volleyball" description="Indoor and beach volleyball sessions for all levels." />
          <SportCard emoji="🎾" name="Padel" description="On the roadmap — let us know if you'd like to see it sooner." comingSoon />
          <SportCard emoji="🏀" name="Basketball" description="On the roadmap — let us know if you'd like to see it sooner." comingSoon />
        </div>
      </main>
    </>
  );
}
