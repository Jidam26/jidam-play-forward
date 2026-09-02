import { getPool, ensureDb } from "@/lib/db";
import { randomUUID } from "node:crypto";
import type { Plan } from "@/lib/repositories/plans";

export type PlanPurchase = {
  id: string;
  plan_id: string;
  user_id: string;
  sport: string;
  games_included: number;
  price_aed: number;
  payment_status: "pending" | "paid";
  created_at: string;
};

export type RequestPlanPurchaseResult =
  | { ok: true; purchase: PlanPurchase }
  | { ok: false; reason: "PLAN_NOT_FOUND" | "PLAN_INACTIVE" };

/**
 * A member requests to buy a plan -- same "reserve now, pay via WhatsApp,
 * admin confirms" flow as booking a game (see src/lib/config.ts). No
 * credits are granted yet; that only happens once an admin confirms the
 * payment (see confirmPlanPurchase).
 */
export async function requestPlanPurchase(userId: string, planId: string): Promise<RequestPlanPurchaseResult> {
  await ensureDb();
  const { rows } = await getPool().query<Plan>("SELECT * FROM plans WHERE id = $1", [planId]);
  const plan = rows[0];
  if (!plan) return { ok: false, reason: "PLAN_NOT_FOUND" };
  if (!plan.active) return { ok: false, reason: "PLAN_INACTIVE" };

  const inserted = await getPool().query<PlanPurchase>(
    `INSERT INTO plan_purchases (id, plan_id, user_id, sport, games_included, price_aed)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [randomUUID(), plan.id, userId, plan.sport, plan.games_included, plan.price_aed]
  );
  return { ok: true, purchase: inserted.rows[0] };
}

export type PendingPlanPurchase = PlanPurchase & { name: string; email: string; phone: string; plan_name: string };

/** Admin dashboard: purchases awaiting a "Mark as Paid" after reviewing the payment screenshot. */
export async function listPendingPlanPurchases(): Promise<PendingPlanPurchase[]> {
  await ensureDb();
  const { rows } = await getPool().query<PendingPlanPurchase>(
    `SELECT pp.*, u.name, u.email, u.phone, p.name as plan_name
     FROM plan_purchases pp
     JOIN users u ON u.id = pp.user_id
     JOIN plans p ON p.id = pp.plan_id
     WHERE pp.payment_status = 'pending'
     ORDER BY pp.created_at ASC`
  );
  return rows;
}

export type ConfirmPlanPurchaseResult =
  | { ok: true; purchase: PlanPurchase }
  | { ok: false; reason: "PURCHASE_NOT_FOUND" };

/**
 * Admin confirms a plan purchase as paid -- marks it paid AND credits the
 * member's per-sport balance, atomically (one without the other would
 * either grant free credits or take someone's money with nothing to show
 * for it). Locks the purchase row first so a double-click can't double-credit.
 */
export async function confirmPlanPurchase(purchaseId: string): Promise<ConfirmPlanPurchaseResult> {
  await ensureDb();
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const res = await client.query<PlanPurchase>("SELECT * FROM plan_purchases WHERE id = $1 FOR UPDATE", [purchaseId]);
    const purchase = res.rows[0];
    if (!purchase) {
      await client.query("ROLLBACK");
      return { ok: false, reason: "PURCHASE_NOT_FOUND" };
    }
    if (purchase.payment_status === "paid") {
      // Already confirmed elsewhere -- don't credit twice.
      await client.query("ROLLBACK");
      return { ok: true, purchase };
    }

    const updated = await client.query<PlanPurchase>(
      "UPDATE plan_purchases SET payment_status = 'paid' WHERE id = $1 RETURNING *",
      [purchaseId]
    );
    await client.query(
      `INSERT INTO credit_balances (user_id, sport, balance) VALUES ($1, $2, $3)
       ON CONFLICT (user_id, sport) DO UPDATE SET balance = credit_balances.balance + $3`,
      [purchase.user_id, purchase.sport, purchase.games_included]
    );
    await client.query("COMMIT");
    return { ok: true, purchase: updated.rows[0] };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function listPlanPurchasesForUser(userId: string): Promise<PlanPurchase[]> {
  await ensureDb();
  const { rows } = await getPool().query<PlanPurchase>(
    "SELECT * FROM plan_purchases WHERE user_id = $1 ORDER BY created_at DESC",
    [userId]
  );
  return rows;
}

/** A member's remaining credits, per sport -- e.g. { Football: 3, Volleyball: 0 }. */
export async function getCreditBalances(userId: string): Promise<Map<string, number>> {
  await ensureDb();
  const { rows } = await getPool().query<{ sport: string; balance: number }>(
    "SELECT sport, balance FROM credit_balances WHERE user_id = $1 AND balance > 0",
    [userId]
  );
  return new Map(rows.map((r) => [r.sport, r.balance]));
}

/** Revenue collected from plan purchases -- a distinct stream from per-game amount_paid, so Reports totals both separately. */
export async function totalPlanRevenue(): Promise<number> {
  await ensureDb();
  const { rows } = await getPool().query<{ total: number }>(
    "SELECT COALESCE(SUM(price_aed), 0) as total FROM plan_purchases WHERE payment_status = 'paid'"
  );
  return Number(rows[0].total);
}

/** Plan revenue by month (YYYY-MM), for the Reports monthly performance table. */
export async function planRevenueByMonth(): Promise<Map<string, number>> {
  await ensureDb();
  const { rows } = await getPool().query<{ month: string; total: number }>(
    `SELECT substring(created_at, 1, 7) as month, SUM(price_aed) as total
     FROM plan_purchases WHERE payment_status = 'paid' GROUP BY month`
  );
  return new Map(rows.map((r) => [r.month, Number(r.total)]));
}
