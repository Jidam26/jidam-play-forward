export function SportCard({
  emoji,
  name,
  description,
  comingSoon = false,
}: {
  emoji: string;
  name: string;
  description: string;
  comingSoon?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 ${
        comingSoon ? "border-navy/10 bg-navy/5" : "border-navy/10 bg-white shadow-sm"
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="text-3xl" aria-hidden>
          {emoji}
        </span>
        <div>
          <p className="font-bold text-navy">{name}</p>
          {comingSoon && <p className="text-xs font-semibold uppercase tracking-wide text-gold">Coming soon</p>}
        </div>
      </div>
      <p className="mt-2 text-sm text-navy/70">{description}</p>
    </div>
  );
}
