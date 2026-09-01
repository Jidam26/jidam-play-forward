import { getPool, ensureDb } from "@/lib/db";
import { randomUUID } from "node:crypto";

export type Expense = {
  id: string;
  game_id: string | null;
  description: string;
  amount: number;
  /** Optional -- when the expense was actually incurred, if the admin backdated it. */
  date: string | null;
  created_at: string;
};

export type CreateExpenseInput = {
  game_id: string | null;
  description: string;
  amount: number;
  date?: string | null;
};

export async function createExpense(input: CreateExpenseInput): Promise<Expense> {
  await ensureDb();
  const id = randomUUID();
  const { rows } = await getPool().query<Expense>(
    `INSERT INTO expenses (id, game_id, description, amount, date) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [id, input.game_id, input.description.trim(), input.amount, input.date || null]
  );
  return rows[0];
}

export async function listExpensesForGame(gameId: string): Promise<Expense[]> {
  await ensureDb();
  const { rows } = await getPool().query<Expense>(
    "SELECT * FROM expenses WHERE game_id = $1 ORDER BY created_at ASC",
    [gameId]
  );
  return rows;
}

/** Expenses not tied to any specific game (equipment, admin costs, etc). */
export async function listGeneralExpenses(): Promise<Expense[]> {
  await ensureDb();
  const { rows } = await getPool().query<Expense>(
    "SELECT * FROM expenses WHERE game_id IS NULL ORDER BY created_at DESC"
  );
  return rows;
}

/** Total expenses per game, for computing profit/loss across many games at once. */
export async function totalExpensesByGame(gameIds: string[]): Promise<Map<string, number>> {
  await ensureDb();
  const totals = new Map<string, number>();
  if (gameIds.length === 0) return totals;
  const { rows } = await getPool().query<{ game_id: string; total: number }>(
    `SELECT game_id, SUM(amount) as total FROM expenses WHERE game_id = ANY($1) GROUP BY game_id`,
    [gameIds]
  );
  for (const row of rows) totals.set(row.game_id, Number(row.total));
  return totals;
}

export async function deleteExpense(id: string): Promise<void> {
  await ensureDb();
  await getPool().query("DELETE FROM expenses WHERE id = $1", [id]);
}
