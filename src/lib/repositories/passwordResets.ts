import { getPool, ensureDb } from "@/lib/db";
import { randomBytes } from "node:crypto";

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function createPasswordReset(userId: string): Promise<string> {
  await ensureDb();
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS).toISOString();
  await getPool().query(
    `INSERT INTO password_resets (token, user_id, expires_at) VALUES ($1, $2, $3)`,
    [token, userId, expiresAt]
  );
  return token;
}

export type ResetLookup =
  | { ok: true; userId: string }
  | { ok: false; reason: "NOT_FOUND" | "EXPIRED" | "ALREADY_USED" };

export async function findValidReset(token: string): Promise<ResetLookup> {
  await ensureDb();
  const { rows } = await getPool().query<{ user_id: string; expires_at: string; used_at: string | null }>(
    "SELECT user_id, expires_at, used_at FROM password_resets WHERE token = $1",
    [token]
  );
  const reset = rows[0];
  if (!reset) return { ok: false, reason: "NOT_FOUND" };
  if (reset.used_at) return { ok: false, reason: "ALREADY_USED" };
  if (new Date(reset.expires_at).getTime() < Date.now()) return { ok: false, reason: "EXPIRED" };
  return { ok: true, userId: reset.user_id };
}

export async function consumeReset(token: string): Promise<void> {
  await ensureDb();
  await getPool().query("UPDATE password_resets SET used_at = now()::text WHERE token = $1", [token]);
}
