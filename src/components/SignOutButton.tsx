import { signOutAction } from "@/lib/actions/auth";

export function SignOutButton() {
  return (
    <form action={signOutAction}>
      <button type="submit" className="whitespace-nowrap text-navy/60 hover:text-navy">
        Sign out
      </button>
    </form>
  );
}
