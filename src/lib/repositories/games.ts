import { getPool, ensureDb } from "@/lib/db";
import { randomUUID } from "node:crypto";

export type Sport = "Football" | "Volleyball" | "Padel" | "Basketball";

export type Game = {
  id: string;
  sport: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  venue: string;
  price_aed: number;
  total_spots: number;
  spots_filled: number;
  payment_link: string | null;
  status: "active" | "cancelled";
  // Set only on imported historical games with no real per-attendee
  // bookings -- see the comment on the column in src/lib/db.ts.
  imported_revenue: number | null;
  created_at: string;
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Upcoming, non-cancelled games -- what members and the public games page see. */
export async function listUpcomingGames(): Promise<Game[]> {
  await ensureDb();
  const { rows } = await getPool().query<Game>(
    "SELECT * FROM games WHERE date >= $1 AND status = 'active' ORDER BY date ASC, time ASC",
    [today()]
  );
  return rows;
}

/**
 * Cancelled games that hadn't happened yet -- admin-only, so they can still
 * see who to notify. A cancellation from a game whose date has already
 * passed has no one left to notify, so it only lives in Past Games instead
 * of cluttering this list forever.
 */
export async function listCancelledGames(): Promise<Game[]> {
  await ensureDb();
  const { rows } = await getPool().query<Game>(
    "SELECT * FROM games WHERE status = 'cancelled' AND date >= $1 ORDER BY date ASC, time ASC",
    [today()]
  );
  return rows;
}

/** Games whose date has passed (any status) -- the admin Past Games archive, most recent first. */
export async function listPastGames(): Promise<Game[]> {
  await ensureDb();
  const { rows } = await getPool().query<Game>(
    "SELECT * FROM games WHERE date < $1 ORDER BY date DESC, time DESC",
    [today()]
  );
  return rows;
}

export async function findGameById(id: string): Promise<Game | undefined> {
  await ensureDb();
  const { rows } = await getPool().query<Game>("SELECT * FROM games WHERE id = $1", [id]);
  return rows[0];
}

export type CreateGameInput = {
  sport: string;
  date: string;
  time: string;
  venue: string;
  price_aed: number;
  total_spots: number;
  payment_link?: string | null;
};

export async function createGame(input: CreateGameInput): Promise<Game> {
  await ensureDb();
  const id = randomUUID();
  const { rows } = await getPool().query<Game>(
    `INSERT INTO games (id, sport, date, time, venue, price_aed, total_spots, spots_filled, payment_link)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 0, $8) RETURNING *`,
    [
      id,
      input.sport,
      input.date,
      input.time,
      input.venue.trim(),
      input.price_aed,
      input.total_spots,
      input.payment_link?.trim() || null,
    ]
  );
  return rows[0];
}

export type UpdateGameInput = {
  sport: string;
  date: string;
  time: string;
  venue: string;
  price_aed: number;
  total_spots: number;
  /**
   * How many actually played. A real, active game keeps this in sync with
   * its booking rows automatically (see reserveSpot/cancelBooking) -- this
   * is here so a *past* game with no real per-attendee data (e.g. one from
   * before the booking system, or an imported historical game) can be
   * corrected to reflect what actually happened.
   */
  spots_filled: number;
  payment_link: string | null;
  imported_revenue: number | null;
};

/** Admin-only: correct any of a game's details after the fact -- see UpdateGameInput. */
export async function updateGame(id: string, input: UpdateGameInput): Promise<void> {
  await ensureDb();
  await getPool().query(
    `UPDATE games SET sport=$2, date=$3, time=$4, venue=$5, price_aed=$6, total_spots=$7, spots_filled=$8, payment_link=$9, imported_revenue=$10
     WHERE id = $1`,
    [
      id,
      input.sport,
      input.date,
      input.time,
      input.venue.trim(),
      input.price_aed,
      input.total_spots,
      input.spots_filled,
      input.payment_link?.trim() || null,
      input.imported_revenue,
    ]
  );
}

/**
 * Cancel a game (soft-delete). It disappears from the public/member games
 * list immediately but stays visible to admins -- along with its attendee
 * list -- so they can message everyone who booked. There's no automated
 * notification (see src/lib/config.ts): the admin reaches out manually.
 */
export async function cancelGame(id: string): Promise<void> {
  await ensureDb();
  await getPool().query("UPDATE games SET status = 'cancelled' WHERE id = $1", [id]);
}
