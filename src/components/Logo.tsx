export function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const textSize = size === "lg" ? "text-4xl sm:text-5xl" : size === "sm" ? "text-xl" : "text-2xl";
  return (
    <span className={`font-extrabold tracking-tight ${textSize} text-navy`}>
      JID<span className="text-gold">AM</span>
    </span>
  );
}
