import { requireSession } from "@/lib/session";
import { NavBar } from "@/components/NavBar";
import { ChangePasswordForm } from "@/components/ChangePasswordForm";

export default async function AccountPage() {
  const session = await requireSession();

  return (
    <>
      <NavBar session={session} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <h1 className="text-2xl font-extrabold text-navy">Account Settings</h1>
        <p className="mt-1 text-sm text-navy/60">
          Signed in as {session.name} ({session.email})
        </p>

        <div className="mt-8">
          <h2 className="font-bold text-navy">Change password</h2>
          <div className="mt-4">
            <ChangePasswordForm />
          </div>
        </div>
      </main>
    </>
  );
}
