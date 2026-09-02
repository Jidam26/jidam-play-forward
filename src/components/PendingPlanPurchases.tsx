import type { PendingPlanPurchase } from "@/lib/repositories/planPurchases";
import { formatMoney } from "@/lib/money";
import { confirmPlanPurchaseAction } from "@/lib/actions/plans";
import { SportBadge } from "@/components/SportBadge";

/** Admin dashboard section: plan purchase requests awaiting payment confirmation -- see confirmPlanPurchase. */
export function PendingPlanPurchases({ purchases }: { purchases: PendingPlanPurchase[] }) {
  if (purchases.length === 0) return null;

  return (
    <>
      <h2 className="mt-10 text-sm font-semibold uppercase tracking-wide text-navy/50">Pending Plan Purchases</h2>
      <div className="mt-3 space-y-3">
        {purchases.map((p) => (
          <div
            key={p.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-navy/10 bg-white p-5 shadow-sm"
          >
            <div>
              <div className="flex items-center gap-2">
                <SportBadge sport={p.sport} />
              </div>
              <p className="mt-2 font-bold text-navy">{p.plan_name}</p>
              <p className="text-sm text-navy/70">
                {p.name} &middot; {p.email} &middot; {p.phone}
              </p>
              <p className="text-sm text-navy/70">
                {p.games_included} games &middot; AED {formatMoney(p.price_aed)}
              </p>
            </div>
            <form action={confirmPlanPurchaseAction.bind(null, p.id, p.name, p.plan_name)}>
              <button
                type="submit"
                className="rounded-full bg-gold px-4 py-2 text-xs font-semibold text-navy hover:bg-gold-light"
              >
                Mark as Paid
              </button>
            </form>
          </div>
        ))}
      </div>
    </>
  );
}
