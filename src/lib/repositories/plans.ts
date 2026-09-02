import { getPool, ensureDb } from "@/lib/db";
import { randomUUID } from "node:crypto";

export type Plan = {
  id: string;
  sport: string;
  name: string;
  games_included: number;
  price_aed: number;
  payment_link: string | null;
  active: boolean;
  created_at: string;
};

export type CreatePlanInput = {
  sport: string;
  name: string;
  games_included: number;
  price_aed: number;
  payment_link?: string | null;
};

export async function createPlan(input: CreatePlanInput): Promise<Plan> {
  await ensureDb();
  const { rows } = await getPool().query<Plan>(
    `INSERT INTO plans (id, sport, name, games_included, price_aed, payment_link)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [randomUUID(), input.sport, input.name.trim(), input.games_included, input.price_aed, input.payment_link?.trim() || null]
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
