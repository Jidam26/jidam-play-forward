import { getPool, ensureDb } from "@/lib/db";
import { randomUUID } from "node:crypto";

export type PlanType = "credits" | "subscription";

export type Plan = {
  id: string;
  plan_type: PlanType;
  sport: string;
  name: string;
  /** Credit packs only -- how many games the pack includes. Null for a subscription. */
  games_included: number | null;
  /** Subscriptions only -- how many days it stays valid once confirmed paid. Null for a credit pack. */
  duration_days: number | null;
  price_aed: number;
  payment_link: string | null;
  active: boolean;
  created_at: string;
};

export type CreatePlanInput = {
  plan_type: PlanType;
  sport: string;
  name: string;
  games_included?: number | null;
  duration_days?: number | null;
  price_aed: number;
  payment_link?: string | null;
};

export async function createPlan(input: CreatePlanInput): Promise<Plan> {
  await ensureDb();
  const { rows } = await getPool().query<Plan>(
    `INSERT INTO plans (id, plan_type, sport, name, games_included, duration_days, price_aed, payment_link)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [
      randomUUID(),
      input.plan_type,
      input.sport,
      input.name.trim(),
      input.plan_type === "credits" ? input.games_included : null,
      input.plan_type === "subscription" ? input.duration_days : null,
      input.price_aed,
      input.payment_link?.trim() || null,
    ]
  );
  return rows[0];
}

/** What members see on the Plans page -- only ones the admin hasn't retired. */
export async function listActivePlans(): Promise<Plan[]> {
  await ensureDb();
  const { rows } = await getPool().query<Plan>(
    "SELECT * FROM plans WHERE active = true ORDER BY sport ASC, price_aed ASC"
  );
  return rows;
}

/** Admin plan management -- every plan, active or retired. */
export async function listAllPlans(): Promise<Plan[]> {
  await ensureDb();
  const { rows } = await getPool().query<Plan>("SELECT * FROM plans ORDER BY sport ASC, price_aed ASC");
  return rows;
}

export async function findPlanById(id: string): Promise<Plan | undefined> {
  await ensureDb();
  const { rows } = await getPool().query<Plan>("SELECT * FROM plans WHERE id = $1", [id]);
  return rows[0];
}

/** Retire or restore a plan -- past purchases still reference it fine either way. */
export async function setPlanActive(id: string, active: boolean): Promise<void> {
  await ensureDb();
  await getPool().query("UPDATE plans SET active = $2 WHERE id = $1", [id, active]);
}
