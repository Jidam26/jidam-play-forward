import { requireSession } from "@/lib/session";
import { listActivePlans } from "@/lib/repositories/plans";
import { listPlanPurchasesForUser, getCreditBalances } from "@/lib/repositories/planPurchases";
import { formatMoney } from "@/lib/money";
import { NavBar } from "@/components/NavBar";
import { SportBadge } from "@/components/SportBadge";
import { RequestPlanForm } from "@/components/RequestPlanForm";

export default async function PlansPage() {
  const session = await requireSession();
  const [plans, myPurchases, creditBalances] = await Promise.all([
    listActivePlans(),
    listPlanPurchasesForUser(session.id),
    getCreditBalances(session.id),
  ]);

  // A pending or paid request for a plan already covers it -- no need to buy it twice.
  const requestedPlanIds = new Set(myPurchases.map((p) => p.plan_id));

  return (
    <>
      <NavBar session={session} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <h1 className="text-2xl font-extrabold text-navy">Game Credit Plans</h1>
        <p className="mt-1 text-sm text-navy/60">
          Buy a pack of games upfront and use one credit each time you book — no expiry, and booking with a credit
          confirms your spot instantly.
        </p>

        {creditBalances.size > 0 && (
          <div className="mt-6 flex flex-wrap gap-3">
            {[...creditBalances.entries()].map(([sport, balance]) => (
              <div key={sport} className="rounded-2xl border border-navy/10 bg-white px-5 py-3 shadow-sm">
                <SportBadge sport={sport} />
                <p className="mt-1 text-lg font-extrabold text-navy">{balance} credit{balance === 1 ? "" : "s"}</p>
              </div>
            ))}
          </div>
        )}

        {plans.length === 0 ? (
          <p className="mt-10 text-center text-navy/50">No plans available right now — check back soon.</p>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {plans.map((plan) => (
              <div key={plan.id} className="rounded-2xl border border-navy/10 bg-white p-5 shadow-sm">
                <SportBadge sport={plan.sport} />
                <p className="mt-2 font-bold text-navy">{plan.name}</p>
                <p className="text-sm text-navy/70">{plan.games_included} games</p>
                <p className="mt-1 text-2xl font-extrabold text-navy">AED {formatMoney(plan.price_aed)}</p>
                <div className="mt-4">
                  <RequestPlanForm
                    planId={plan.id}
                    paymentLink={plan.payment_link}
                    planLabel={plan.name}
                    alreadyRequested={requestedPlanIds.has(plan.id)}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {myPurchases.length > 0 && (
          <>
            <h2 className="mt-10 text-xl font-extrabold text-navy">My Plan Purchases</h2>
            <div className="mt-4 space-y-3">
              {myPurchases.map((p) => (
                <div
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-navy/10 bg-white p-5 shadow-sm"
                >
                  <div>
                    <SportBadge sport={p.sport} />
                    <p className="mt-2 font-bold text-navy">
                      {p.games_included} games &middot; AED {formatMoney(p.price_aed)}
                    </p>
                  </div>
                  <span
                    className={`inline-block w-fit rounded-full px-3 py-1 text-xs font-semibold ${
                      p.payment_status === "paid" ? "bg-green-100 text-green-800" : "bg-gold/15 text-navy"
                    }`}
                  >
                    {p.payment_status === "paid" ? "Paid" : "Reserved · payment pending"}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </>
  );
}
