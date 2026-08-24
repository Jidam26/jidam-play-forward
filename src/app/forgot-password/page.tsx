import Link from "next/link";
import { Logo } from "@/components/Logo";
import { ForgotPasswordForm } from "@/components/ForgotPasswordForm";

export default function ForgotPasswordPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
      <Link href="/">
        <Logo />
      </Link>
      <h1 className="mt-6 text-2xl font-extrabold text-navy">Reset your password</h1>
      <p className="mt-1 text-sm text-navy/60">Enter your email and we'll send you a reset link.</p>

      <div className="mt-8">
        <ForgotPasswordForm />
      </div>

      <Link href="/login" className="mt-6 text-sm font-semibold text-navy hover:text-gold">
        Back to sign in
      </Link>
    </main>
  );
}
