import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { Logo } from "@/components/Logo";
import { Footer } from "@/components/Footer";
import { HexBackground } from "@/components/HexBackground";
import { FloatingFootball } from "@/components/FloatingFootball";
import { CinematicButton } from "@/components/CinematicButton";
import { Reveal } from "@/components/Reveal";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { ImageCarousel } from "@/components/ImageCarousel";

const SPORTS = [
  { emoji: "⚽", name: "Football", description: "Weekly 5-a-side and 7-a-side games across Abu Dhabi venues." },
  { emoji: "🏐", name: "Volleyball", description: "Indoor and beach volleyball sessions for all levels." },
];

export default async function LandingPage() {
  const session = await getSession();
  if (session) redirect(session.role === "admin" || session.role === "boss" ? "/admin" : "/games");

  return (
    <>
      <main className="flex-1">
        {/* 1. Hero -- full-viewport dark backdrop with a connected grid of
            hexagon panels (soccer-ball paneling, flattened out), pentagon
            panels inset on a sparse subset of cells, and a random subset of
            panels glowing softly from within on an independent loop -- see
            HexBackground. No real game photos/video yet (see the note
            further down), so the drama comes entirely from this paneling. */}
        <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--cinema-void)] px-6 py-24 text-center">
          <HexBackground />
          <FloatingFootball />
          <div
            className="pointer-events-none absolute left-1/2 top-1/2 h-[70vw] w-[70vw] max-h-[700px] max-w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--cinema-gold)] opacity-[0.06] blur-3xl"
            aria-hidden
          />

          <div className="relative mx-auto max-w-2xl">
            <Logo size="lg" inverted glow />
            <p className="mt-3 text-lg font-semibold tracking-wide text-[var(--cinema-gold)] sm:text-xl">
              Play Forward
            </p>

            <p className="mx-auto mt-6 max-w-md text-balance text-base text-offwhite/80 sm:text-lg">
              Abu Dhabi&apos;s multi-sport community — volleyball, football, and more.
            </p>

            <div className="mt-10 flex flex-col items-center gap-4">
              <CinematicButton href="/signup">Get Started</CinematicButton>
              <Link href="/login" className="text-sm font-medium text-offwhite/60 hover:text-offwhite">
                Already a member? Sign in
              </Link>
            </div>
          </div>

          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-offwhite/30">
            <svg width="20" height="28" viewBox="0 0 20 28" fill="none" aria-hidden>
              <rect x="1" y="1" width="18" height="26" rx="9" stroke="currentColor" strokeWidth="1.5" />
              <circle className="cinema-motion" cx="10" cy="9" r="2.5" fill="currentColor" style={{ animation: "drift-a 2s ease-in-out infinite" }} />
            </svg>
          </div>
        </section>

        {/* 2. What Jidam does */}
        <section className="px-6 py-16 sm:py-20">
          <Reveal className="mx-auto max-w-xl text-center">
            <h2 className="text-2xl font-extrabold text-navy sm:text-3xl">A community, not just a booking form</h2>
            <p className="mt-4 text-balance text-muted">
              Jidam brings people together to play, regardless of skill level. Browse upcoming games, reserve
              your spot in seconds, and show up ready to play — we handle the organizing.
            </p>
          </Reveal>
        </section>

        {/* 3. Our Sports -- each with an auto-advancing carousel underneath.
            Slides are plain numbered placeholders for now; swap ImageCarousel
            for real photos whenever they're ready. */}
        <section className="bg-navy/[0.03] px-6 py-16 sm:py-20">
          <div className="mx-auto max-w-4xl">
            <Reveal>
              <h2 className="text-center text-2xl font-extrabold text-navy sm:text-3xl">Our Sports</h2>
            </Reveal>
            <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2">
              {SPORTS.map((sport, i) => (
                <Reveal key={sport.name} delayMs={i * 80}>
                  <div className="h-full rounded-2xl border border-navy/10 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-[0_12px_30px_-8px_rgba(184,134,11,0.35)]">
                    <span className="text-4xl" aria-hidden>
                      {sport.emoji}
                    </span>
                    <p className="mt-3 text-lg font-bold text-navy">{sport.name}</p>
                    <p className="mt-2 text-sm text-muted">{sport.description}</p>
                    <ImageCarousel label={sport.name} slideCount={5} />
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* 4. Energy strip -- standing in for a real game-day photo gallery.
            Swap this for a photo grid once there are real action shots to show;
            faking stock-style photos here would work against the "real, not
            stock" brief, so this stays motion/stats-driven instead. */}
        <section className="relative overflow-hidden bg-[var(--cinema-void)] px-6 py-16">
          <div
            className="cinema-motion pointer-events-none absolute left-1/2 top-1/2 h-[40vw] w-[40vw] max-h-[400px] max-w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--cinema-glow)] opacity-[0.12] blur-3xl"
            style={{ animation: "drift-a 18s ease-in-out infinite" }}
          />
          <Reveal className="relative mx-auto grid max-w-3xl grid-cols-1 gap-8 text-center sm:grid-cols-3">
            <div>
              <p className="text-3xl font-extrabold text-[var(--cinema-gold)] sm:text-4xl">
                <AnimatedCounter value={SPORTS.length} />
              </p>
              <p className="mt-1 text-sm font-medium text-offwhite/70">Sports live now</p>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-[var(--cinema-gold)] sm:text-4xl">Weekly</p>
              <p className="mt-1 text-sm font-medium text-offwhite/70">Games scheduled</p>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-[var(--cinema-gold)] sm:text-4xl">All</p>
              <p className="mt-1 text-sm font-medium text-offwhite/70">Skill levels welcome</p>
            </div>
          </Reveal>
        </section>

        {/* 5. Final CTA */}
        <section className="px-6 py-20 text-center">
          <Reveal>
            <h2 className="text-2xl font-extrabold text-navy sm:text-3xl">Ready to play?</h2>
            <p className="mx-auto mt-3 max-w-sm text-muted">Sign up and reserve your spot in the next game.</p>
            <div className="mt-8 flex justify-center">
              <CinematicButton href="/signup">Sign Up</CinematicButton>
            </div>
          </Reveal>
        </section>
      </main>

      <Footer />
    </>
  );
}
