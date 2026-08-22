export function Logo({
  size = "md",
  inverted = false,
  glow = false,
}: {
  size?: "sm" | "md" | "lg";
  inverted?: boolean;
  /** Cinematic hero-only treatment: gradient-gold "AM" with a soft glow. Everywhere else stays plain. */
  glow?: boolean;
}) {
  const textSize = size === "lg" ? "text-5xl sm:text-7xl" : size === "sm" ? "text-xl" : "text-2xl";
  const crescentWidth = size === "lg" ? "w-16 sm:w-20" : size === "sm" ? "w-8" : "w-10";
  const wordmarkColor = inverted ? "text-offwhite" : "text-navy";

  return (
    <span
      className="inline-flex flex-col items-start"
      style={glow ? { filter: "drop-shadow(0 0 28px rgba(240, 192, 90, 0.45))" } : undefined}
    >
      <span className={`font-extrabold tracking-tight ${textSize} ${wordmarkColor}`}>
        JID
        <span
          className={glow ? "bg-gradient-to-r from-[var(--cinema-gold)] to-[var(--cinema-gold-deep)] bg-clip-text text-transparent" : "text-gold"}
        >
          AM
        </span>
      </span>
      {/* Small crescent accent under the wordmark -- a nod to the brand mark, kept simple and scalable. */}
      <svg viewBox="0 0 100 20" className={`-mt-1 ${crescentWidth}`} aria-hidden>
        <path d="M2 4 Q50 26 98 4 Q75 16 50 16 Q25 16 2 4 Z" fill={glow ? "var(--cinema-gold)" : "var(--color-gold)"} />
      </svg>
    </span>
  );
}
