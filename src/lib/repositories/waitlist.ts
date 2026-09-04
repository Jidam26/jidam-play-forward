import { getPool, ensureDb } from "@/lib/db";
import { randomUUID } from "node:crypto";
import { findGameById } from "@/lib/repositories/games";

export type JoinWaitlistResult =
  | { ok: true }
  | { ok: false; reason: "GAME_NOT_FOUND" | "GAME_NOT_FULL" | "ALREADY_BOOKED" | "ALREADY_WAITLISTED" };

/** Join the waitlist for a game that's already full. */
export async function joinWaitlist(userId: string, gameId: string): Promise<JoinWaitlistResult> {
  await ensureDb();
  const game = await findGameById(gameId);
  if (!game) return { ok: false, reason: "GAME_NOT_FOUND" };
  if (game.spots_filled < game.total_spots) return { ok: false, reason: "GAME_NOT_FULL" };

  const pool = getPool();
  const existing = await pool.query("SELECT id FROM bookings WHERE user_id = $1 AND game_id = $2", [userId, gameId]);
  if ((existing.rowCount ?? 0) > 0) return { ok: false, reason: "ALREADY_BOOKED" };

  try {
    await pool.query(`INSERT INTO waitlist_entries (id, game_id, user_id) VALUES ($1, $2, $3)`, [
      randomUUID(),
      gameId,
      userId,
    ]);
    return { ok: true };
  } catch (err) {
    // Unique violation on (game_id, user_id) -- already on this waitlist.
    if ((err as { code?: string }).code === "23505") return { ok: false, reason: "ALREADY_WAITLISTED" };
    throw err;
  }
}

export async function leaveWaitlist(userId: string, gameId: string): Promise<void> {
  await ensureDb();
  await getPool().query("DELETE FROM waitlist_entries WHERE user_id = $1 AND game_id = $2", [userId, gameId]);
}

export type WaitlistEntryWithGame = {
  id: string;
  game_id: string;
  sport: string;
  date: string;
  time: string;
  end_time: string | null;
  venue: string;
  /** 1-indexed queue position -- 1 means next in line to be promoted. */
  position: number;
};

/** A member's own waitlist spots, with their queue position in each. */
export async function listWaitlistForUser(userId: string): Promise<WaitlistEntryWithGame[]> {
  await ensureDb();
  const { rows } = await getPool().query<WaitlistEntryWithGame>(
    `SELECT w.id, w.game_id, g.sport, g.date, g.time, g.end_time, g.venue,
       (SELECT COUNT(*)::int FROM waitlist_entries w2
        WHERE w2.game_id = w.game_id AND w2.created_at <= w.created_at) as position
     FROM waitlist_entries w JOIN games g ON g.id = w.game_id
     WHERE w.user_id = $1
     ORDER BY g.date ASC, g.time ASC`,
    [userId]
  );
  return rows;
}
