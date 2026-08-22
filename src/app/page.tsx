import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { Logo } from "@/components/Logo";

export default async function LandingPage() {
  const session = await getSession();
  if (session) redirect(session.role === "admin" ? "/admin" : "/games");

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <Logo size="lg" />
      <p className="mt-2 text-lg font-semibold tracking-wide text-gold">Play Forward</p>

      <p className="mx-auto mt-6 max-w-sm text-balance text-navy/70">
        Jidam is a multi-sport community in Abu Dhabi. We organize football, volleyball, and more —
        find a game, reserve your spot, and show up to play.
      </p>

      <div className="mt-10 flex w-full max-w-xs flex-col gap-3">
        <Link
          href="/signup"
          className="rounded-lg bg-navy px-4 py-3 text-base font-semibold text-offwhite transition hover:bg-navy-light"
        >
          Sign Up
        </Link>
        <Link
          href="/login"
          className="rounded-lg border border-navy px-4 py-3 text-base font-semibold text-navy transition hover:bg-navy/5"
        >
          Sign In
        </Link>
      </div>
    </main>
  );
}
