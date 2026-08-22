const SPORT_EMOJI: Record<string, string> = {
  Football: "⚽",
  Volleyball: "🏐",
  Padel: "🎾",
  Basketball: "🏀",
};

export function SportBadge({ sport }: { sport: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-gold/15 px-3 py-1 text-sm font-semibold text-navy">
      <span aria-hidden>{SPORT_EMOJI[sport] ?? "🏅"}</span>
      {sport}
    </span>
  );
}
