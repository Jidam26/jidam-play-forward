import { getPool, ensureDb } from "@/lib/db";
import { randomUUID } from "node:crypto";

export type ActivityEntry = {
  id: string;
  admin_id: string;
  admin_name: string;
  action: "game_published" | "game_cancelled" | "payment_marked_paid";
  game_id: string | null;
  description: string;
  created_at: string;
};

export async function logActivity(
  adminId: string,
  action: ActivityEntry["action"],
  description: string,
  gameId: string | null = null
): Promise<void> {
  await ensureDb();
  await getPool().query(
    `INSERT INTO admin_activity (id, admin_id, action, game_id, description) VALUES ($1, $2, $3, $4, $5)`,
    [randomUUID(), adminId, action, gameId, description]
  );
}

/** Boss-only: full feed of admin actions, newest first. */
export async function listActivity(limit = 100): Promise<ActivityEntry[]> {
  await ensureDb();
  const { rows } = await getPool().query<ActivityEntry>(
    `SELECT a.id, a.admin_id, u.name as admin_name, a.action, a.game_id, a.description, a.created_at
     FROM admin_activity a JOIN users u ON u.id = a.admin_id
     ORDER BY a.created_at DESC
     LIMIT $1`,
    [limit]
  );
  return rows;
}
