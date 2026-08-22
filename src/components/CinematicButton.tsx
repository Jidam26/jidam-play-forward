import Link from "next/link";

/** Gold gradient CTA with a hover shine-sweep. Pure CSS (no JS) via group-hover translate. */
export function CinematicButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="group relative inline-block overflow-hidden rounded-lg bg-gradient-to-r from-[var(--cinema-gold)] to-[var(--cinema-gold-deep)] px-8 py-3.5 text-base font-bold text-navy shadow-[0_0_30px_rgba(240,192,90,0.35)] transition hover:shadow-[0_0_45px_rgba(240,192,90,0.5)]"
    >
      <span className="relative z-10">{children}</span>
      <span className="absolute inset-0 -translate-x-full skew-x-[-15deg] bg-white/40 transition-transform duration-700 ease-out group-hover:translate-x-full" />
    </Link>
  );
}
