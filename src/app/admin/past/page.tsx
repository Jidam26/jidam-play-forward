import Link from "next/link";
import { requireAdmin } from "@/lib/session";
import { listPastGames } from "@/lib/repositories/games";
import { listAttendeesForGame, totalRevenueByGame, type Attendee } from "@/lib/repositories/bookings";
import { listExpensesForGame, listGeneralExpenses, type Expense } from "@/lib/repositories/expenses";
import { listImportedAttendeesForGames } from "@/lib/repositories/importedAttendees";
import { formatMoney } from "@/lib/money";
import { AdminGameCard } from "@/components/AdminGameCard";
import { ExpenseForm } from "@/components/ExpenseForm";
import { DeleteExpenseButton } from "@/components/DeleteExpenseButton";
import { NavBar } from "@/components/NavBar";

function formatExpenseDate(dateStr: string) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-AE", { day: "numeric", month: "short", year: "numeric" });
}

function ExpenseList({ expenses }: { expenses: Expense[] }) {
  if (expenses.length === 0) return <p className="text-xs text-navy/50">No expenses logged.</p>;
  return (
    <ul className="space-y-1">
      {expenses.map((e) => (
        <li key={e.id} className="flex items-center justify-between text-sm">
          <span className="text-navy/80">
            {e.description}
            {e.date && <span className="ml-2 text-xs text-navy/40">{formatExpenseDate(e.date)}</span>}
          </span>
          <span className="flex items-center gap-3">
            <span className="font-medium text-navy">AED {formatMoney(e.amount)}</span>
            <DeleteExpenseButton expenseId={e.id} />
          </span>
        </li>
      ))}
    </ul>
  );
}

export default async function PastGamesPage() {
  const session = await requireAdmin();
  const games = await listPastGames();
  const gameIds = games.map((g) => g.id);

  const [attendeesEntries, expensesEntries, revenueByGame, importedAttendeesByGame] = await Promise.all([
    Promise.all(games.map(async (g): Promise<[string, Attendee[]]> => [g.id, await listAttendeesForGame(g.id)])),
    Promise.all(games.map(async (g): Promise<[string, Expense[]]> => [g.id, await listExpensesForGame(g.id)])),
    totalRevenueByGame(gameIds),
    listImportedAttendeesForGames(gameIds),
  ]);
  const attendeesByGame = new Map(attendeesEntries);
  const expensesByGame = new Map(expensesEntries);
  const generalExpenses = await listGeneralExpenses();
  const generalTotal = generalExpenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <>
      <NavBar session={session} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold text-navy">Past Games</h1>
            <p className="mt-1 text-sm text-navy/60">Completed games, revenue, expenses, and profit/loss.</p>
          </div>
          <Link href="/admin" className="text-sm font-semibold text-navy hover:text-gold">
            &larr; Back to Dashboard
          </Link>
        </div>

        <div className="mt-8 rounded-2xl border border-navy/10 bg-white p-5 shadow-sm">
          <h2 className="font-bold text-navy">General Expenses</h2>
          <p className="text-xs text-navy/50">Not tied to a specific game -- equipment, admin costs, etc.</p>
          <div className="mt-3">
            <ExpenseList expenses={generalExpenses} />
          </div>
          <p className="mt-2 text-sm font-semibold text-navy">Total: AED {generalTotal}</p>
          <div className="mt-4 border-t border-navy/10 pt-4">
            <ExpenseForm gameId={null} />
          </div>
        </div>

        <h2 className="mt-10 text-sm font-semibold uppercase tracking-wide text-navy/50">Completed Games</h2>
        {games.length === 0 ? (
          <p className="mt-4 text-center text-navy/50">No past games yet.</p>
        ) : (
          <div className="mt-3 space-y-6">
            {games.map((game) => {
              const expenses = expensesByGame.get(game.id) ?? [];
              // Imported historical games record a known total directly
              // (see src/lib/db.ts) since there's no real per-attendee
              // booking data for them; everything else uses real payments.
              const revenue = game.imported_revenue ?? revenueByGame.get(game.id) ?? 0;
              const expenseTotal = expenses.reduce((sum, e) => sum + e.amount, 0);
              const profit = revenue - expenseTotal;
              return (
                <AdminGameCard
                  key={game.id}
                  game={game}
                  attendees={attendeesByGame.get(game.id) ?? []}
                  importedAttendees={importedAttendeesByGame.get(game.id)}
                  actions={
                    <Link
                      href={`/admin/past/${game.id}/edit`}
                      className="rounded-full border border-navy/20 px-3 py-1 text-xs font-semibold text-navy hover:bg-navy/5"
                    >
                      Edit
                    </Link>
                  }
                  footer={
                    <div className="mt-4 border-t border-navy/10 pt-4">
                      <h3 className="text-sm font-semibold text-navy">Expenses</h3>
                      <div className="mt-2">
                        <ExpenseList expenses={expenses} />
                      </div>
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-navy/5 px-3 py-2 text-sm">
                        <span className="text-navy/70">
                          Revenue AED {formatMoney(revenue)} &minus; Expenses AED {formatMoney(expenseTotal)}
                        </span>
                        <span className={`font-bold ${profit >= 0 ? "text-green-700" : "text-red-600"}`}>
                          {profit >= 0 ? "Profit" : "Loss"}: AED {formatMoney(Math.abs(profit))}
                        </span>
                      </div>
                      <div className="mt-4">
                        <ExpenseForm gameId={game.id} />
                      </div>
                    </div>
                  }
                />
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
