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
  /** True if a receipt/invoice photo or PDF is attached -- see getExpenseAttachment for the actual bytes. */
  has_attachment: boolean;
};

export type CreateExpenseInput = {
  game_id: string | null;
  description: string;
  amount: number;
  date?: string | null;
  attachment?: { data: Buffer; contentType: string; filename: string } | null;
};

// Every list/select below names its columns instead of `*` -- attachment_data
// is a BYTEA blob that could be a few MB, and dragging it along on every
// expense-list page load (most of which have no attachment at all) would be
// wasteful. The actual bytes are only ever fetched one at a time, by id, via
// getExpenseAttachment -- see its route handler in app/api/expenses/[id]/attachment.
const EXPENSE_COLUMNS = `id, game_id, description, amount, date, created_at, (attachment_data IS NOT NULL) as has_attachment`;

export async function createExpense(input: CreateExpenseInput): Promise<Expense> {
  await ensureDb();
  const id = randomUUID();
  const { rows } = await getPool().query<Expense>(
    `INSERT INTO expenses (id, game_id, description, amount, date, attachment_data, attachment_content_type, attachment_filename)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING ${EXPENSE_COLUMNS}`,
    [
      id,
      input.game_id,
      input.description.trim(),
      input.amount,
      input.date || null,
      input.attachment?.data ?? null,
      input.attachment?.contentType ?? null,
      input.attachment?.filename ?? null,
    ]
  );
  return rows[0];
}

export async function listExpensesForGame(gameId: string): Promise<Expense[]> {
  await ensureDb();
  const { rows } = await getPool().query<Expense>(
    `SELECT ${EXPENSE_COLUMNS} FROM expenses WHERE game_id = $1 ORDER BY created_at ASC`,
    [gameId]
  );
  return rows;
}

/** Expenses not tied to any specific game (equipment, admin costs, etc). */
export async function listGeneralExpenses(): Promise<Expense[]> {
  await ensureDb();
  const { rows } = await getPool().query<Expense>(
    `SELECT ${EXPENSE_COLUMNS} FROM expenses WHERE game_id IS NULL ORDER BY created_at DESC`
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

export type UpdateExpenseInput = {
  description: string;
  amount: number;
  date?: string | null;
  /** Pass to replace the existing attachment; omit to leave it as-is. */
  attachment?: { data: Buffer; contentType: string; filename: string } | null;
};

/** Admin-only: correct a logged expense's description/amount/date, and optionally replace its attachment. */
export async function updateExpense(id: string, input: UpdateExpenseInput): Promise<Expense> {
  await ensureDb();
  const { rows } =
    input.attachment !== undefined
      ? await getPool().query<Expense>(
          `UPDATE expenses SET description=$2, amount=$3, date=$4, attachment_data=$5, attachment_content_type=$6, attachment_filename=$7
           WHERE id=$1 RETURNING ${EXPENSE_COLUMNS}`,
          [
            id,
            input.description.trim(),
            input.amount,
            input.date || null,
            input.attachment?.data ?? null,
            input.attachment?.contentType ?? null,
            input.attachment?.filename ?? null,
          ]
        )
      : await getPool().query<Expense>(
          `UPDATE expenses SET description=$2, amount=$3, date=$4 WHERE id=$1 RETURNING ${EXPENSE_COLUMNS}`,
          [id, input.description.trim(), input.amount, input.date || null]
        );
  return rows[0];
}

export async function deleteExpense(id: string): Promise<void> {
  await ensureDb();
  await getPool().query("DELETE FROM expenses WHERE id = $1", [id]);
}

/** Admin-only: fetch an expense's attached receipt/invoice file -- see the route handler that serves it. */
export async function getExpenseAttachment(
  id: string
): Promise<{ data: Buffer; contentType: string; filename: string } | undefined> {
  await ensureDb();
  const { rows } = await getPool().query<{ attachment_data: Buffer; attachment_content_type: string; attachment_filename: string }>(
    "SELECT attachment_data, attachment_content_type, attachment_filename FROM expenses WHERE id = $1 AND attachment_data IS NOT NULL",
    [id]
  );
  const row = rows[0];
  if (!row) return undefined;
  return { data: row.attachment_data, contentType: row.attachment_content_type, filename: row.attachment_filename };
}
