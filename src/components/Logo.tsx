export function Logo({ size = "md", inverted = false }: { size?: "sm" | "md" | "lg"; inverted?: boolean }) {
  const textSize = size === "lg" ? "text-5xl sm:text-7xl" : size === "sm" ? "text-xl" : "text-2xl";
  const crescentWidth = size === "lg" ? "w-16 sm:w-20" : size === "sm" ? "w-8" : "w-10";
  const wordmarkColor = inverted ? "text-offwhite" : "text-navy";

  return (
    <span className="inline-flex flex-col items-start">
      <span className={`font-extrabold tracking-tight ${textSize} ${wordmarkColor}`}>
        JID<span className="text-gold">AM</span>
      </span>
      {/* Small crescent accent under the wordmark -- a nod to the brand mark, kept simple and scalable. */}
      <svg viewBox="0 0 100 20" className={`-mt-1 ${crescentWidth}`} aria-hidden>
        <path d="M2 4 Q50 26 98 4 Q75 16 50 16 Q25 16 2 4 Z" fill="var(--color-gold)" />
      </svg>
    </span>
  );
}
