import Link from "next/link";
import { requireBoss } from "@/lib/session";
import { getBusinessSettings } from "@/lib/repositories/receipts";
import { NavBar } from "@/components/NavBar";
import { BusinessSettingsForm } from "@/components/BusinessSettingsForm";

export default async function SettingsPage() {
  const session = await requireBoss();
  const settings = await getBusinessSettings();

  return (
    <>
      <NavBar session={session} />
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-10">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold text-navy">Business Settings</h1>
            <p className="mt-1 text-sm text-navy/60">Printed on every payment receipt.</p>
          </div>
          <Link href="/admin" className="text-sm font-semibold text-navy hover:text-gold">
            &larr; Back
          </Link>
        </div>
        <div className="mt-6 rounded-2xl border border-navy/10 bg-white p-5 shadow-sm">
          <BusinessSettingsForm settings={settings} />
        </div>
      </main>
    </>
  );
}
