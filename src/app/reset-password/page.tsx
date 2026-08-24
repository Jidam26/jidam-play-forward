import Link from "next/link";
import { Logo } from "@/components/Logo";
import { ResetPasswordForm } from "@/components/ResetPasswordForm";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
      <Link href="/">
        <Logo />
      </Link>
      <h1 className="mt-6 text-2xl font-extrabold text-navy">Set a new password</h1>

      <div className="mt-8">
        {token ? (
          <ResetPasswordForm token={token} />
        ) : (
          <p className="max-w-sm rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            This link is missing its reset code. Please use the link from your email, or{" "}
            <Link href="/forgot-password" className="font-semibold underline">
              request a new one
            </Link>
            .
          </p>
        )}
      </div>
    </main>
  );
}
