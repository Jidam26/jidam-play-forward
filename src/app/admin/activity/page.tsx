import Link from "next/link";
import { requireBoss } from "@/lib/session";
import { listActivity, type ActivityEntry } from "@/lib/repositories/activity";
import { NavBar } from "@/components/NavBar";

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-AE", { dateStyle: "medium", timeStyle: "short" });
}

const ACTION_BADGES: Record<ActivityEntry["action"], { label: string; className: string }> = {
  game_published: { label: "Published", className: "bg-green-100 text-green-800" },
  game_cancelled: { label: "Cancelled", className: "bg-red-100 text-red-700" },
  game_deleted: { label: "Game Deleted", className: "bg-red-100 text-red-800" },
  games_reset: { label: "Fresh Start (All Games Wiped)", className: "bg-red-200 text-red-900" },
  conduct_flagged: { label: "Conduct Flagged", className: "bg-amber-100 text-amber-800" },
  conduct_reviewed: { label: "Conduct Reviewed", className: "bg-navy/10 text-navy/70" },
  fine_paid: { label: "Fine Paid", className: "bg-green-100 text-green-800" },
  game_updated: { label: "Game Edited", className: "bg-navy/10 text-navy/70" },
  member_updated: { label: "Member Edited", className: "bg-navy/10 text-navy/70" },
  member_deleted: { label: "Member Deleted", className: "bg-red-100 text-red-800" },
  booking_updated: { label: "Booking Edited", className: "bg-navy/10 text-navy/70" },
  expense_updated: { label: "Expense Edited", className: "bg-navy/10 text-navy/70" },
  plan_updated: { label: "Plan Edited", className: "bg-navy/10 text-navy/70" },
  plan_deleted: { label: "Plan Deleted", className: "bg-red-100 text-red-700" },
  credit_adjusted: { label: "Credits Adjusted", className: "bg-gold/15 text-navy" },
  subscription_updated: { label: "Subscription Edited", className: "bg-navy/10 text-navy/70" },
  subscription_cancelled: { label: "Subscription Cancelled", className: "bg-red-100 text-red-700" },
  receipt_voided: { label: "Receipt Voided", className: "bg-amber-100 text-amber-800" },
  payment_marked_paid: { label: "Payment Confirmed", className: "bg-blue-100 text-blue-700" },
  player_deleted: { label: "Player Deleted", className: "bg-orange-100 text-orange-700" },
  player_added: { label: "Player Added", className: "bg-teal-100 text-teal-700" },
};

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
            <p className="mt-1 text-sm text-navy/60">
              Games published or cancelled, payments confirmed, and players added or deleted, by any admin.
            </p>
          </div>
          <Link href="/admin" className="text-sm font-semibold text-navy hover:text-gold">
            &larr; Back to Dashboard
          </Link>
        </div>

        {entries.length === 0 ? (
          <p className="mt-10 text-center text-navy/50">No admin activity yet.</p>
        ) : (
          <div className="mt-6 space-y-2">
            {entries.map((e) => {
              const badge = ACTION_BADGES[e.action];
              return (
                <div key={e.id} className="rounded-lg border border-navy/10 bg-white px-4 py-3 text-sm shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span>
                      <span className="font-semibold text-navy">{e.admin_name}</span>{" "}
                      <span className={`ml-1 rounded-full px-2 py-0.5 text-xs font-semibold ${badge.className}`}>
                        {badge.label}
                      </span>
                    </span>
                    <span className="text-xs text-navy/50">{formatDateTime(e.created_at)}</span>
                  </div>
                  <p className="mt-1 text-navy/70">{e.description}</p>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
