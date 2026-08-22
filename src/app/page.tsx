import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { Logo } from "@/components/Logo";
import { Footer } from "@/components/Footer";

const SPORTS = [
  { emoji: "⚽", name: "Football", description: "Weekly 5-a-side and 7-a-side games across Abu Dhabi venues." },
  { emoji: "🏐", name: "Volleyball", description: "Indoor and beach volleyball sessions for all levels." },
  { emoji: "🎾", name: "Padel", description: "On the roadmap — let us know if you'd like to see it sooner.", comingSoon: true },
  { emoji: "🏀", name: "Basketball", description: "On the roadmap — let us know if you'd like to see it sooner.", comingSoon: true },
];

const STATS = [
  { value: "2", label: "Sports live now" },
  { value: "Weekly", label: "Games scheduled" },
  { value: "All", label: "Skill levels welcome" },
];

export default async function LandingPage() {
  const session = await getSession();
  if (session) redirect(session.role === "admin" ? "/admin" : "/games");

  return (
    <>
      <main className="flex-1">
        {/* 1. Hero */}
        <section className="relative overflow-hidden bg-navy px-6 py-24 text-center sm:py-32">
          {/* Decorative texture standing in for a real action photo -- swap this section's
              background for a dimmed photo of a game whenever one's available. */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(135deg, var(--color-gold) 0px, var(--color-gold) 2px, transparent 2px, transparent 40px)",
            }}
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -top-40 right-[-10%] h-96 w-96 rounded-full bg-gold/20 blur-3xl"
            aria-hidden
          />

          <div className="relative mx-auto max-w-2xl">
            <Logo size="lg" inverted />
            <p className="mt-3 text-lg font-semibold tracking-wide text-gold sm:text-xl">Play Forward</p>

            <p className="mx-auto mt-6 max-w-md text-balance text-base text-offwhite/80 sm:text-lg">
              Abu Dhabi&apos;s multi-sport community — volleyball, football, and more.
            </p>

            <div className="mt-10 flex flex-col items-center gap-3">
              <Link
                href="/signup"
                className="rounded-lg bg-gold px-8 py-3.5 text-base font-bold text-navy shadow-lg shadow-gold/20 transition hover:bg-gold-light"
              >
                Get Started
              </Link>
              <Link href="/login" className="text-sm font-medium text-offwhite/70 hover:text-offwhite">
                Already a member? Sign in
              </Link>
            </div>
          </div>
        </section>

        {/* 2. What Jidam does */}
        <section className="px-6 py-16 sm:py-20">
          <div className="mx-auto max-w-xl text-center">
            <h2 className="text-2xl font-extrabold text-navy sm:text-3xl">A community, not just a booking form</h2>
            <p className="mt-4 text-balance text-muted">
              Jidam brings people together to play, regardless of skill level. Browse upcoming games, reserve
              your spot in seconds, and show up ready to play — we handle the organizing.
            </p>
          </div>
        </section>

        {/* 3. Our Sports */}
        <section className="bg-navy/[0.03] px-6 py-16 sm:py-20">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-center text-2xl font-extrabold text-navy sm:text-3xl">Our Sports</h2>
            <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2">
              {SPORTS.map((sport) => (
                <div
                  key={sport.name}
                  className={`rounded-2xl border p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                    sport.comingSoon ? "border-navy/10 bg-navy/5" : "border-navy/10 bg-white"
                  }`}
                >
                  <span className="text-4xl" aria-hidden>
                    {sport.emoji}
                  </span>
                  <p className="mt-3 text-lg font-bold text-navy">{sport.name}</p>
                  {sport.comingSoon && (
                    <p className="text-xs font-semibold uppercase tracking-wide text-gold">Coming soon</p>
                  )}
                  <p className="mt-2 text-sm text-muted">{sport.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 4. Energy strip -- standing in for a real game-day photo gallery.
            Swap this for a photo grid once there are real action shots to show. */}
        <section className="bg-navy px-6 py-14">
          <div className="mx-auto grid max-w-3xl grid-cols-1 gap-6 text-center sm:grid-cols-3">
            {STATS.map((stat) => (
              <div key={stat.label}>
                <p className="text-3xl font-extrabold text-gold sm:text-4xl">{stat.value}</p>
                <p className="mt-1 text-sm font-medium text-offwhite/70">{stat.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 5. Final CTA */}
        <section className="px-6 py-20 text-center">
          <h2 className="text-2xl font-extrabold text-navy sm:text-3xl">Ready to play?</h2>
          <p className="mx-auto mt-3 max-w-sm text-muted">Sign up and reserve your spot in the next game.</p>
          <Link
            href="/signup"
            className="mt-8 inline-block rounded-lg bg-gold px-8 py-3.5 text-base font-bold text-navy transition hover:bg-gold-light"
          >
            Sign Up
          </Link>
        </section>
      </main>

      <Footer />
    </>
  );
}
