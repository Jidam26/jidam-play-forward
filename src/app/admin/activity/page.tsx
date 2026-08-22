import Link from "next/link";
import { requireBoss } from "@/lib/session";
import { listActivity } from "@/lib/repositories/activity";
import { NavBar } from "@/components/NavBar";

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-AE", { dateStyle: "medium", timeStyle: "short" });
}

export default async function ActivityLogPage() {
  const session = await requireBoss();
  const entries = await listActivity();

  return (
    <>
      <NavBar session={session} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold text-navy">Activity Log</h1>
            <p className="mt-1 text-sm text-navy/60">Games published or cancelled by any admin.</p>
          </div>
          <Link href="/admin" className="text-sm font-semibold text-navy hover:text-gold">
            &larr; Back to Dashboard
          </Link>
        </div>

        {entries.length === 0 ? (
          <p className="mt-10 text-center text-navy/50">No admin activity yet.</p>
        ) : (
          <div className="mt-6 space-y-2">
            {entries.map((e) => (
              <div key={e.id} className="rounded-lg border border-navy/10 bg-white px-4 py-3 text-sm shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span>
                    <span className="font-semibold text-navy">{e.admin_name}</span>{" "}
                    <span
                      className={`ml-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                        e.action === "game_cancelled" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-800"
                      }`}
                    >
                      {e.action === "game_cancelled" ? "Cancelled" : "Published"}
                    </span>
                  </span>
                  <span className="text-xs text-navy/50">{formatDateTime(e.created_at)}</span>
                </div>
                <p className="mt-1 text-navy/70">{e.description}</p>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
