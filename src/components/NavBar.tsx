import Link from "next/link";
import type { SessionUser } from "@/lib/session";
import { Logo } from "@/components/Logo";
import { SignOutButton } from "@/components/SignOutButton";

export function NavBar({ session }: { session: SessionUser }) {
  const isAdmin = session.role === "admin" || session.role === "boss";

  const links = isAdmin
    ? [
        { href: "/admin", label: "Admin" },
        { href: "/admin/reports", label: "Reports" },
        ...(session.role === "boss"
          ? [
              { href: "/admin/team", label: "Team" },
              { href: "/admin/activity", label: "Activity" },
            ]
          : []),
      ]
    : [
        { href: "/home", label: "About" },
        { href: "/games", label: "Games" },
        { href: "/bookings", label: "My Bookings" },
        { href: "/plans", label: "Plans" },
      ];

  return (
    <header className="sticky top-0 z-10 border-b border-navy/10 bg-offwhite/95 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-2 px-4 py-3">
        <Link href={isAdmin ? "/admin" : "/games"}>
          <Logo size="sm" />
        </Link>
        <nav className="flex items-center gap-4 overflow-x-auto text-sm font-medium text-navy">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="whitespace-nowrap hover:text-gold">
              {link.label}
            </Link>
          ))}
          <Link href="/account" className="whitespace-nowrap hover:text-gold">
            Account
          </Link>
          <SignOutButton />
        </nav>
      </div>
    </header>
  );
}
