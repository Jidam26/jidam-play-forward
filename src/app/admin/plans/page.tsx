import Link from "next/link";
import { requireAdmin } from "@/lib/session";
import { listAllPlans } from "@/lib/repositories/plans";
import { formatMoney } from "@/lib/money";
import { NavBar } from "@/components/NavBar";
import { SportBadge } from "@/components/SportBadge";
import { PlanForm } from "@/components/PlanForm";
import { TogglePlanButton } from "@/components/TogglePlanButton";

export default async function AdminPlansPage() {
  const session = await requireAdmin();
  const plans = await listAllPlans();

  return (
    <>
      <NavBar session={session} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold text-navy">Game Credit Plans</h1>
            <p className="mt-1 text-sm text-navy/60">Pre-paid game packs members can buy, e.g. 4 games for AED 120.</p>
          </div>
          <Link href="/admin" className="text-sm font-semibold text-navy hover:text-gold">
            &larr; Back to Dashboard
          </Link>
        </div>

        <div className="mt-6 rounded-2xl border border-navy/10 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-navy/50">New Plan</h2>
          <div className="mt-4">
            <PlanForm />
          </div>
        </div>

        <h2 className="mt-10 text-sm font-semibold uppercase tracking-wide text-navy/50">All Plans</h2>
        {plans.length === 0 ? (
          <p className="mt-4 text-center text-navy/50">No plans yet -- create one above.</p>
        ) : (
          <div className="mt-3 space-y-3">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-navy/10 bg-white p-5 shadow-sm"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <SportBadge sport={plan.sport} />
                    {!plan.active && (
                      <span className="rounded-full bg-navy/10 px-2 py-0.5 text-xs font-semibold text-navy/60">Retired</span>
                    )}
                  </div>
                  <p className="mt-2 font-bold text-navy">{plan.name}</p>
                  <p className="text-sm text-navy/70">
                    {plan.plan_type === "subscription"
                      ? `Unlimited for ${plan.duration_days} days`
                      : `${plan.games_included} games`}{" "}
                    &middot; AED {formatMoney(plan.price_aed)}
                  </p>
                </div>
                <TogglePlanButton planId={plan.id} active={plan.active} />
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
