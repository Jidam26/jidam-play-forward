import Link from "next/link";
import { requireAdmin } from "@/lib/session";
import { listMembers } from "@/lib/repositories/users";
import { getAllCreditBalances, getAllActiveSubscriptions } from "@/lib/repositories/planPurchases";
import { markFinePaidAction } from "@/lib/actions/conduct";
import { formatMoney } from "@/lib/money";
import { NavBar } from "@/components/NavBar";
import { IssueCreditsForm } from "@/components/IssueCreditsForm";
import { MemberActions } from "@/components/MemberActions";
import { SetCreditBalanceForm } from "@/components/SetCreditBalanceForm";
import { SubscriptionBadge } from "@/components/SubscriptionBadge";

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-AE", { day: "numeric", month: "short", year: "numeric" });
}

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await requireAdmin();
  const { q } = await searchParams;
  const [members, creditBalances, activeSubscriptions] = await Promise.all([
    listMembers(q),
    getAllCreditBalances(),
    getAllActiveSubscriptions(),
  ]);

  return (
    <>
      <NavBar session={session} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold text-navy">Members</h1>
            <p className="mt-1 text-sm text-navy/60">Everyone registered, with their booking history and credits.</p>
          </div>
          <Link href="/admin" className="text-sm font-semibold text-navy hover:text-gold">
            &larr; Back to Dashboard
          </Link>
        </div>

        <form method="GET" className="mt-6">
          <input
            type="search"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search by name or email..."
            className="w-full rounded-lg border border-navy/20 bg-white px-3 py-2.5 text-base text-navy outline-none focus:border-gold focus:ring-2 focus:ring-gold/30"
          />
        </form>

        {members.length === 0 ? (
          <p className="mt-10 text-center text-navy/50">
            {q ? "No members match that search." : "No members have signed up yet."}
          </p>
        ) : (
          <div className="mt-6 space-y-3">
            {members.map((m) => (
              <div key={m.id} className="rounded-2xl border border-navy/10 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-navy">{m.name}</p>
                    <p className="text-sm text-navy/70">
                      {m.email} &middot; {m.phone}
                    </p>
                    <p className="mt-1 text-xs text-navy/50">Joined {formatDate(m.created_at)}</p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-semibold text-navy">{m.total_bookings} bookings</p>
                    <p className="text-navy/60">AED {formatMoney(m.total_paid)} paid</p>
                  </div>
                </div>

                {(m.warning_count > 0 || m.has_no_show || m.unpaid_fine_aed > 0) && (
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    {m.warning_count > 0 && (
                      <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
                        ⚠️ {m.warning_count} warning{m.warning_count === 1 ? "" : "s"}
                      </span>
                    )}
                    {m.has_no_show && (
                      <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">🚩 No-show</span>
                    )}
                    {m.unpaid_fine_aed > 0 && (
                      <>
                        <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">
                          💰 AED {formatMoney(m.unpaid_fine_aed)} unpaid fine
                        </span>
                        <form action={markFinePaidAction.bind(null, m.id, m.name)}>
                          <button type="submit" className="rounded-full border border-navy/20 px-2.5 py-1 text-xs font-semibold text-navy hover:bg-navy/5">
                            Mark Fine Paid
                          </button>
                        </form>
                      </>
                    )}
                  </div>
                )}

                {creditBalances.get(m.id) && creditBalances.get(m.id)!.size > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {[...creditBalances.get(m.id)!.entries()].map(([sport, balance]) => (
                      <span key={sport} className="rounded-full bg-gold/10 px-2.5 py-1 text-xs font-semibold text-navy">
                        {sport}: {balance} credit{balance === 1 ? "" : "s"}
                      </span>
                    ))}
                  </div>
                )}

                {activeSubscriptions.get(m.id) && activeSubscriptions.get(m.id)!.size > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {[...activeSubscriptions.get(m.id)!.entries()].map(([sport, validUntil]) => (
                      <SubscriptionBadge key={sport} userId={m.id} memberName={m.name} sport={sport} validUntil={validUntil} />
                    ))}
                  </div>
                )}

                <div className="mt-3 flex flex-wrap gap-2">
                  <IssueCreditsForm userId={m.id} memberName={m.name} />
                  <SetCreditBalanceForm userId={m.id} memberName={m.name} />
                </div>
                <MemberActions userId={m.id} name={m.name} email={m.email} phone={m.phone} />
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
