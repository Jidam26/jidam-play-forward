/** The real Jidam crest badge -- a circular image, so no inverted/light-dark variant is needed (it looks right on any background). */
export function Logo({ size = "md", glow = false }: { size?: "sm" | "md" | "lg"; glow?: boolean }) {
  const px = size === "lg" ? 88 : size === "sm" ? 36 : 48;
  return (
    <span
      className="inline-block shrink-0 overflow-hidden rounded-full"
      style={{ width: px, height: px, ...(glow ? { filter: "drop-shadow(0 0 28px rgba(240, 192, 90, 0.45))" } : undefined) }}
    >
      <img src="/jidam-badge.jpg" alt="Jidam" width={px} height={px} className="h-full w-full object-cover" />
    </span>
  );
}
