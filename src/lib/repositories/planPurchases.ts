import { getPool, ensureDb } from "@/lib/db";
import { randomUUID } from "node:crypto";
import type { Plan } from "@/lib/repositories/plans";

export type PlanPurchase = {
  id: string;
  plan_id: string | null;
  plan_type: "credits" | "subscription";
  user_id: string;
  sport: string;
  games_included: number | null;
  duration_days: number | null;
  price_aed: number;
  payment_status: "pending" | "paid";
  /** Set only for a subscription purchase, the moment it's confirmed paid -- null for credit packs, which never expire. */
  valid_until: string | null;
  created_at: string;
};

export type RequestPlanPurchaseResult =
  | { ok: true; purchase: PlanPurchase }
  | { ok: false; reason: "PLAN_NOT_FOUND" | "PLAN_INACTIVE" };

/**
 * A member requests to buy a plan -- same "reserve now, pay via WhatsApp,
 * admin confirms" flow as booking a game (see src/lib/config.ts). No
 * credits/subscription are granted yet; that only happens once an admin
 * confirms the payment (see confirmPlanPurchase).
 */
export async function requestPlanPurchase(userId: string, planId: string): Promise<RequestPlanPurchaseResult> {
  await ensureDb();
  const { rows } = await getPool().query<Plan>("SELECT * FROM plans WHERE id = $1", [planId]);
  const plan = rows[0];
  if (!plan) return { ok: false, reason: "PLAN_NOT_FOUND" };
  if (!plan.active) return { ok: false, reason: "PLAN_INACTIVE" };

  const inserted = await getPool().query<PlanPurchase>(
    `INSERT INTO plan_purchases (id, plan_id, plan_type, user_id, sport, games_included, duration_days, price_aed)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [randomUUID(), plan.id, plan.plan_type, userId, plan.sport, plan.games_included, plan.duration_days, plan.price_aed]
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
 * Admin confirms a plan purchase as paid. For a credits-type plan, this
 * credits the member's per-sport balance; for a subscription-type plan, it
 * instead sets valid_until to duration_days from now. Either way, marking
 * paid and granting access happen atomically -- one without the other
 * would either grant free access or take someone's money with nothing to
 * show for it. Locks the purchase row first so a double-click can't
 * double-grant.
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
      // Already confirmed elsewhere -- don't grant twice.
      await client.query("ROLLBACK");
      return { ok: true, purchase };
    }

    let updated: PlanPurchase;
    if (purchase.plan_type === "subscription") {
      const durationDays = purchase.duration_days ?? 30;
      const validUntilRes = await client.query<PlanPurchase>(
        `UPDATE plan_purchases SET payment_status = 'paid', valid_until = (now() + ($2 || ' days')::interval)::date::text
         WHERE id = $1 RETURNING *`,
        [purchaseId, durationDays]
      );
      updated = validUntilRes.rows[0];
    } else {
      const paidRes = await client.query<PlanPurchase>(
        "UPDATE plan_purchases SET payment_status = 'paid' WHERE id = $1 RETURNING *",
        [purchaseId]
      );
      updated = paidRes.rows[0];
      await client.query(
        `INSERT INTO credit_balances (user_id, sport, balance) VALUES ($1, $2, $3)
         ON CONFLICT (user_id, sport) DO UPDATE SET balance = credit_balances.balance + $3`,
        [purchase.user_id, purchase.sport, purchase.games_included ?? 0]
      );
    }
    await client.query("COMMIT");
    return { ok: true, purchase: updated };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Admin-only: grant credits directly to a member, no request/confirm step
 * -- for a cash-in-person payment, a comp/promo (priceAed 0), or correcting
 * a mistake. Always credits-type, paid immediately, no plan_id behind it.
 */
export async function issueCreditsDirectly(
  userId: string,
  sport: string,
  gamesIncluded: number,
  priceAed: number
): Promise<PlanPurchase> {
  await ensureDb();
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const inserted = await client.query<PlanPurchase>(
      `INSERT INTO plan_purchases (id, plan_id, plan_type, user_id, sport, games_included, price_aed, payment_status)
       VALUES ($1, NULL, 'credits', $2, $3, $4, $5, 'paid') RETURNING *`,
      [randomUUID(), userId, sport, gamesIncluded, priceAed]
    );
    await client.query(
      `INSERT INTO credit_balances (user_id, sport, balance) VALUES ($1, $2, $3)
       ON CONFLICT (user_id, sport) DO UPDATE SET balance = credit_balances.balance + $3`,
      [userId, sport, gamesIncluded]
    );
    await client.query("COMMIT");
    return inserted.rows[0];
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

/** Every member's credit balances at once, for the Members directory -- avoids one query per row. */
export async function getAllCreditBalances(): Promise<Map<string, Map<string, number>>> {
  await ensureDb();
  const { rows } = await getPool().query<{ user_id: string; sport: string; balance: number }>(
    "SELECT user_id, sport, balance FROM credit_balances WHERE balance > 0"
  );
  const map = new Map<string, Map<string, number>>();
  for (const r of rows) {
    const bySport = map.get(r.user_id) ?? new Map<string, number>();
    bySport.set(r.sport, r.balance);
    map.set(r.user_id, bySport);
  }
  return map;
}

/** Whether a member has a currently-valid (paid, not yet expired) subscription for a sport. */
export async function hasActiveSubscription(userId: string, sport: string): Promise<boolean> {
  await ensureDb();
  const { rows } = await getPool().query(
    `SELECT 1 FROM plan_purchases
     WHERE user_id = $1 AND sport = $2 AND plan_type = 'subscription' AND payment_status = 'paid'
       AND valid_until >= $3
     LIMIT 1`,
    [userId, sport, new Date().toISOString().slice(0, 10)]
  );
  return (rows.length ?? 0) > 0;
}

/** A member's active subscriptions, per sport -- e.g. { Football: "2026-10-04" } (the expiry date). */
export async function getActiveSubscriptions(userId: string): Promise<Map<string, string>> {
  await ensureDb();
  const { rows } = await getPool().query<{ sport: string; valid_until: string }>(
    `SELECT sport, valid_until FROM plan_purchases
     WHERE user_id = $1 AND plan_type = 'subscription' AND payment_status = 'paid' AND valid_until >= $2
     ORDER BY valid_until DESC`,
    [userId, new Date().toISOString().slice(0, 10)]
  );
  const map = new Map<string, string>();
  // Keep the furthest-out expiry per sport if there happen to be more than one.
  for (const r of rows) if (!map.has(r.sport)) map.set(r.sport, r.valid_until);
  return map;
}

/** Revenue collected from plan purchases (credit packs + subscriptions) -- a distinct stream from per-game amount_paid, so Reports totals both separately. */
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
