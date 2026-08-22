import Link from "next/link";
import { requireBoss } from "@/lib/session";
import { listAdmins } from "@/lib/repositories/users";
import { CreateAdminForm } from "@/components/CreateAdminForm";
import { NavBar } from "@/components/NavBar";

export default async function TeamPage() {
  const session = await requireBoss();
  const admins = await listAdmins();

  return (
    <>
      <NavBar session={session} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold text-navy">Team</h1>
            <p className="mt-1 text-sm text-navy/60">Manage admin accounts for your staff.</p>
          </div>
          <Link href="/admin" className="text-sm font-semibold text-navy hover:text-gold">
            &larr; Back to Dashboard
          </Link>
        </div>

        <div className="mt-8 rounded-2xl border border-navy/10 bg-white p-5 shadow-sm">
          <h2 className="font-bold text-navy">Current admins</h2>
          <div className="mt-3 space-y-2">
            {admins.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-lg bg-navy/5 px-3 py-2 text-sm">
                <div>
                  <span className="font-semibold text-navy">{a.name}</span>{" "}
                  <span className="text-navy/60">{a.email}</span>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    a.role === "boss" ? "bg-gold/20 text-navy" : "bg-navy/10 text-navy/70"
                  }`}
                >
                  {a.role === "boss" ? "Boss" : "Admin"}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-navy/10 bg-white p-5 shadow-sm">
          <h2 className="font-bold text-navy">Add a new admin</h2>
          <p className="mt-1 text-xs text-navy/50">
            Give them the email and temporary password directly -- they can change it themselves from Account
            Settings after logging in.
          </p>
          <div className="mt-4">
            <CreateAdminForm />
          </div>
        </div>
      </main>
    </>
  );
}
