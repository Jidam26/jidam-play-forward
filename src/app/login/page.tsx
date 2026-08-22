import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { signInAction } from "@/lib/actions/auth";
import { Logo } from "@/components/Logo";
import { SignInForm } from "@/components/AuthForm";

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect(session.role === "admin" ? "/admin" : "/games");

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
      <Link href="/">
        <Logo />
      </Link>
      <h1 className="mt-6 text-2xl font-bold text-navy">Welcome back</h1>
      <p className="mt-1 text-sm text-navy/60">Sign in to see upcoming games.</p>

      <div className="mt-8">
        <SignInForm action={signInAction} />
      </div>

      <p className="mt-6 text-sm text-navy/60">
        New to Jidam?{" "}
        <Link href="/signup" className="font-semibold text-navy hover:text-gold">
          Create an account
        </Link>
      </p>
    </main>
  );
}
