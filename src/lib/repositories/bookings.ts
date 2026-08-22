import { getPool, ensureDb } from "@/lib/db";
import { randomUUID } from "node:crypto";
import type { Game } from "@/lib/repositories/games";

export type Booking = {
  id: string;
  user_id: string;
  game_id: string;
  payment_status: "reserved" | "paid";
  amount_paid: number;
  booking_date: string;
};

export type ReserveResult =
  | { ok: true; booking: Booking }
  | { ok: false; reason: "GAME_NOT_FOUND" | "GAME_FULL" | "ALREADY_BOOKED" };

/**
 * Reserve one spot on a game for a user, atomically.
 *
 * Runs as a single Postgres transaction that locks the game row with
 * `SELECT ... FOR UPDATE` up front. A second concurrent reservation attempt
 * on the same game blocks at that line until this transaction commits or
 * rolls back, so it always sees this one's updated spots_filled before it
 * decides anything -- the same guarantee the original SQLite version got
 * for free from running on a single connection.
 */
export async function reserveSpot(userId: string, gameId: string): Promise<ReserveResult> {
  await ensureDb();
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");

    const gameRes = await client.query<Game>("SELECT * FROM games WHERE id = $1 FOR UPDATE", [gameId]);
    const game = gameRes.rows[0];
    if (!game) {
      await client.query("ROLLBACK");
      return { ok: false, reason: "GAME_NOT_FOUND" };
    }

    const existingRes = await client.query(
      "SELECT id FROM bookings WHERE user_id = $1 AND game_id = $2",
      [userId, gameId]
    );
    if ((existingRes.rowCount ?? 0) > 0) {
      await client.query("ROLLBACK");
      return { ok: false, reason: "ALREADY_BOOKED" };
    }

    const updateRes = await client.query(
      "UPDATE games SET spots_filled = spots_filled + 1 WHERE id = $1 AND spots_filled < total_spots",
      [gameId]
    );
    if (updateRes.rowCount === 0) {
      await client.query("ROLLBACK");
      return { ok: false, reason: "GAME_FULL" };
    }

    const id = randomUUID();
    const bookingRes = await client.query<Booking>(
      `INSERT INTO bookings (id, user_id, game_id, payment_status, amount_paid) VALUES ($1, $2, $3, 'reserved', 0) RETURNING *`,
      [id, userId, gameId]
    );

    await client.query("COMMIT");
    return { ok: true, booking: bookingRes.rows[0] };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export type BookingWithGame = Booking & {
  sport: string;
  date: string;
  time: string;
  venue: string;
  price_aed: number;
  payment_link: string | null;
};

export async function listBookingsForUser(userId: string): Promise<BookingWithGame[]> {
  await ensureDb();
  const { rows } = await getPool().query<BookingWithGame>(
    `SELECT b.*, g.sport, g.date, g.time, g.venue, g.price_aed, g.payment_link
     FROM bookings b JOIN games g ON g.id = b.game_id
     WHERE b.user_id = $1
     ORDER BY g.date ASC, g.time ASC`,
    [userId]
  );
  return rows;
}

/** Admin confirms a payment (e.g. after reviewing a WhatsApp screenshot). */
export async function markBookingPaid(bookingId: string, amountPaid: number): Promise<void> {
  await ensureDb();
  await getPool().query(
    `UPDATE bookings SET payment_status = 'paid', amount_paid = $2 WHERE id = $1`,
    [bookingId, amountPaid]
  );
}

export type Attendee = {
  booking_id: string;
  name: string;
  email: string;
  phone: string;
  payment_status: "reserved" | "paid";
  amount_paid: number;
  booking_date: string;
};

export async function listAttendeesForGame(gameId: string): Promise<Attendee[]> {
  await ensureDb();
  const { rows } = await getPool().query<Attendee>(
    `SELECT b.id as booking_id, u.name, u.email, u.phone, b.payment_status, b.amount_paid, b.booking_date
     FROM bookings b JOIN users u ON u.id = b.user_id
     WHERE b.game_id = $1
     ORDER BY b.booking_date ASC`,
    [gameId]
  );
  return rows;
}
