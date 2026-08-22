import { Logo } from "@/components/Logo";

export function Footer() {
  return (
    <footer className="bg-navy px-6 py-12 text-offwhite/70">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 text-center">
        <Logo inverted />
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gold">Play Forward</p>
        <p className="text-sm">Abu Dhabi, UAE</p>
        <a
          href="https://instagram.com/jidam"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium hover:text-gold"
        >
          @jidam on Instagram
        </a>
        <p className="mt-4 text-xs text-offwhite/40">© {new Date().getFullYear()} Jidam. All rights reserved.</p>
      </div>
    </footer>
  );
}
