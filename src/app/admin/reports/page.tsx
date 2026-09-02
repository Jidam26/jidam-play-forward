import Link from "next/link";
import { requireAdmin } from "@/lib/session";
import { listPastGames, type Game } from "@/lib/repositories/games";
import { totalRevenueByGame } from "@/lib/repositories/bookings";
import { totalExpensesByGame, listGeneralExpenses } from "@/lib/repositories/expenses";
import { totalPlanRevenue, planRevenueByMonth } from "@/lib/repositories/planPurchases";
import { formatMoney } from "@/lib/money";
import { NavBar } from "@/components/NavBar";
import { SportBadge } from "@/components/SportBadge";

function formatDate(dateStr: string) {
  const date = new Date(`${dateStr}T00:00:00`);
  return date.toLocaleDateString("en-AE", { day: "numeric", month: "short", year: "numeric" });
}

/** "YYYY-MM-DD" or a full timestamp both start with "YYYY-MM" -- either works here. */
function monthKey(dateStr: string): string {
  return dateStr.slice(0, 7);
}

function monthLabel(key: string): string {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-AE", { month: "long", year: "numeric" });
}

/** A stat card whose per-category breakdown shows on hover -- pure CSS, no client JS needed. */
function HoverStat({
  label,
  value,
  tone,
  breakdown,
}: {
  label: string;
  value: number;
  tone: "navy" | "green" | "red";
  breakdown: { label: string; value: number }[];
}) {
  const toneClass = tone === "green" ? "text-green-700" : tone === "red" ? "text-red-600" : "text-navy";
  return (
    <div className="group relative rounded-2xl border border-navy/10 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-navy/50">{label}</p>
      <p className={`mt-1 text-2xl font-extrabold ${toneClass}`}>AED {formatMoney(Math.abs(value))}</p>
      {breakdown.length > 0 && (
        <div className="pointer-events-none absolute left-0 top-full z-10 mt-2 w-full min-w-[240px] rounded-lg border border-navy/10 bg-white p-3 opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
          <ul className="space-y-1 text-xs">
            {breakdown.map((b) => (
              <li key={b.label} className="flex items-center justify-between gap-3">
                <span className="text-navy/70">{b.label}</span>
                <span className="font-semibold text-navy">AED {formatMoney(b.value)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default async function ReportsPage() {
  const session = await requireAdmin();
  const games = await listPastGames();
  const gameIds = games.map((g) => g.id);

  const [revenueByGame, gameExpensesByGame, generalExpenses, planRevenue, planRevenueMonthly] = await Promise.all([
    totalRevenueByGame(gameIds),
    totalExpensesByGame(gameIds),
    listGeneralExpenses(),
    totalPlanRevenue(),
    planRevenueByMonth(),
  ]);
  const generalTotal = generalExpenses.reduce((sum, e) => sum + e.amount, 0);

  const rows = games.map((game) => {
    // Imported historical games record a known total directly (see
    // src/lib/db.ts) since there's no real per-attendee booking data.
    const revenue = game.imported_revenue ?? revenueByGame.get(game.id) ?? 0;
    const expenseTotal = gameExpensesByGame.get(game.id) ?? 0;
    return { game, revenue, expenseTotal, profit: revenue - expenseTotal };
  });

  // Plan-purchase revenue (see src/lib/repositories/planPurchases.ts) is a
  // distinct stream from per-game amount_paid -- it's collected up front
  // when a member buys a pack, not when they later book a game with one of
  // its credits (that booking is paid_via_credit, amount_paid 0, so it
  // isn't double-counted here).
  const totalRevenue = rows.reduce((sum, r) => sum + r.revenue, 0) + planRevenue;
  const totalGameExpenses = rows.reduce((sum, r) => sum + r.expenseTotal, 0);
  const totalExpenses = totalGameExpenses + generalTotal;
  const totalProfit = totalRevenue - totalExpenses;

  const bySport = new Map<string, { revenue: number; expenses: number }>();
  for (const r of rows) {
    const entry = bySport.get(r.game.sport) ?? { revenue: 0, expenses: 0 };
    entry.revenue += r.revenue;
    entry.expenses += r.expenseTotal;
    bySport.set(r.game.sport, entry);
  }
  const revenueBreakdown = [
    ...[...bySport.entries()].map(([sport, v]) => ({ label: sport, value: v.revenue })),
    ...(planRevenue > 0 ? [{ label: "Credit plans", value: planRevenue }] : []),
  ];
  const profitBreakdown = [
    ...[...bySport.entries()].map(([sport, v]) => ({ label: `${sport} profit`, value: v.revenue - v.expenses })),
    ...(planRevenue > 0 ? [{ label: "Credit plans", value: planRevenue }] : []),
    { label: "Less general expenses", value: -generalTotal },
  ];
  const expenseBreakdown = [
    { label: "Game expenses", value: totalGameExpenses },
    { label: "General expenses", value: generalTotal },
  ];

  // Monthly performance -- general expenses use their own `date` when set
  // (see ExpenseForm), otherwise fall back to when they were logged.
  const byMonth = new Map<string, { revenue: number; expenses: number }>();
  for (const r of rows) {
    const entry = byMonth.get(monthKey(r.game.date)) ?? { revenue: 0, expenses: 0 };
    entry.revenue += r.revenue;
    entry.expenses += r.expenseTotal;
    byMonth.set(monthKey(r.game.date), entry);
  }
  for (const e of generalExpenses) {
    const key = monthKey(e.date ?? e.created_at);
    const entry = byMonth.get(key) ?? { revenue: 0, expenses: 0 };
    entry.expenses += e.amount;
    byMonth.set(key, entry);
  }
  for (const [key, amount] of planRevenueMonthly) {
    const entry = byMonth.get(key) ?? { revenue: 0, expenses: 0 };
    entry.revenue += amount;
    byMonth.set(key, entry);
  }
  const monthlyRows = [...byMonth.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, v]) => ({ key, label: monthLabel(key), revenue: v.revenue, expenses: v.expenses, profit: v.revenue - v.expenses }));

  return (
    <>
      <NavBar session={session} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold text-navy">Reports</h1>
            <p className="mt-1 text-sm text-navy/60">Every completed game, and totals across all of them.</p>
          </div>
          <Link href="/admin" className="text-sm font-semibold text-navy hover:text-gold">
            &larr; Back to Dashboard
          </Link>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <HoverStat label="Total Revenue" value={totalRevenue} tone="navy" breakdown={revenueBreakdown} />
          <HoverStat label="Total Expenses" value={totalExpenses} tone="navy" breakdown={expenseBreakdown} />
          <HoverStat
            label={totalProfit >= 0 ? "Total Profit" : "Total Loss"}
            value={totalProfit}
            tone={totalProfit >= 0 ? "green" : "red"}
            breakdown={profitBreakdown}
          />
        </div>
        <p className="mt-2 text-center text-xs text-navy/40 sm:text-left">Hover a total for its breakdown.</p>

        <h2 className="mt-10 text-sm font-semibold uppercase tracking-wide text-navy/50">Monthly Performance</h2>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-navy/10 bg-white shadow-sm">
          <table className="w-full min-w-[420px] text-left text-sm">
            <thead>
              <tr className="border-b border-navy/10 text-navy/50">
                <th className="px-4 py-3 font-medium">Month</th>
                <th className="px-4 py-3 font-medium">Revenue</th>
                <th className="px-4 py-3 font-medium">Expenses</th>
                <th className="px-4 py-3 font-medium">Profit</th>
              </tr>
            </thead>
            <tbody>
              {monthlyRows.map((m) => (
                <tr key={m.key} className="border-b border-navy/5 last:border-0">
                  <td className="px-4 py-3 font-medium text-navy">{m.label}</td>
                  <td className="px-4 py-3 text-navy">AED {formatMoney(m.revenue)}</td>
                  <td className="px-4 py-3 text-navy">AED {formatMoney(m.expenses)}</td>
                  <td className={`px-4 py-3 font-semibold ${m.profit >= 0 ? "text-green-700" : "text-red-600"}`}>
                    AED {formatMoney(m.profit)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 className="mt-10 text-sm font-semibold uppercase tracking-wide text-navy/50">All Games</h2>
        {rows.length === 0 ? (
          <p className="mt-4 text-center text-navy/50">No completed games yet.</p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-2xl border border-navy/10 bg-white shadow-sm">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-navy/10 text-navy/50">
                  <th className="px-4 py-3 font-medium">Game</th>
                  <th className="px-4 py-3 font-medium">Revenue</th>
                  <th className="px-4 py-3 font-medium">Expenses</th>
                  <th className="px-4 py-3 font-medium">Profit</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ game, revenue, expenseTotal, profit }: { game: Game; revenue: number; expenseTotal: number; profit: number }) => (
                  <tr key={game.id} className="border-b border-navy/5 last:border-0">
                    <td className="px-4 py-3">
                      <SportBadge sport={game.sport} />
                      <span className="ml-2 font-medium text-navy">{formatDate(game.date)}</span>
                      <span className="block text-xs text-navy/50">{game.venue}</span>
                    </td>
                    <td className="px-4 py-3 text-navy">AED {formatMoney(revenue)}</td>
                    <td className="px-4 py-3 text-navy">AED {formatMoney(expenseTotal)}</td>
                    <td className={`px-4 py-3 font-semibold ${profit >= 0 ? "text-green-700" : "text-red-600"}`}>
                      AED {formatMoney(profit)}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/past#game-${game.id}`}
                        className="whitespace-nowrap text-xs font-semibold text-navy hover:text-gold"
                      >
                        Details &rarr;
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
  );
}
