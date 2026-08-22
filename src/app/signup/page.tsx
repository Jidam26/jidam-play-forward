import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { signUpAction } from "@/lib/actions/auth";
import { Logo } from "@/components/Logo";
import { SignUpForm } from "@/components/AuthForm";

export default async function SignUpPage() {
  const session = await getSession();
  if (session) redirect(session.role === "admin" || session.role === "boss" ? "/admin" : "/games");

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
      <Link href="/">
        <Logo />
      </Link>
      <h1 className="mt-6 text-2xl font-extrabold text-navy">Create your account</h1>
      <p className="mt-1 text-sm text-navy/60">Join the community and start booking games.</p>

      <div className="mt-8">
        <SignUpForm action={signUpAction} />
      </div>

      <p className="mt-6 text-sm text-navy/60">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-navy hover:text-gold">
          Sign in
        </Link>
      </p>
    </main>
  );
}
