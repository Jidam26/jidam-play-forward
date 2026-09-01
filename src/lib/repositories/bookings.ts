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

export type PromotedFromWaitlist = {
  userId: string;
  email: string;
  name: string;
  sport: string;
  date: string;
  time: string;
  venue: string;
};

export type CancelResult =
  | { ok: true; promoted: PromotedFromWaitlist | null }
  | { ok: false; reason: "BOOKING_NOT_FOUND" | "NOT_YOUR_BOOKING" };

/**
 * A member cancels their own confirmed spot. If anyone is on that game's
 * waitlist, the longest-waiting person is atomically promoted into the
 * freed spot -- same transaction, so there's no window where the spot is
 * simply open and a different browsing member could grab it ahead of the
 * waitlist. Locks the game row first (mirroring reserveSpot), which also
 * serializes this against any concurrent cancellation on the same game.
 */
export async function cancelBooking(userId: string, bookingId: string): Promise<CancelResult> {
  await ensureDb();
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");

    const bookingRes = await client.query<Booking>("SELECT * FROM bookings WHERE id = $1 FOR UPDATE", [bookingId]);
    const booking = bookingRes.rows[0];
    if (!booking) {
      await client.query("ROLLBACK");
      return { ok: false, reason: "BOOKING_NOT_FOUND" };
    }
    if (booking.user_id !== userId) {
      await client.query("ROLLBACK");
      return { ok: false, reason: "NOT_YOUR_BOOKING" };
    }

    const gameRes = await client.query<Game>("SELECT * FROM games WHERE id = $1 FOR UPDATE", [booking.game_id]);
    const game = gameRes.rows[0];
    await client.query("DELETE FROM bookings WHERE id = $1", [bookingId]);
    await client.query("UPDATE games SET spots_filled = spots_filled - 1 WHERE id = $1", [booking.game_id]);

    const nextRes = await client.query<{ id: string; user_id: string }>(
      `SELECT id, user_id FROM waitlist_entries WHERE game_id = $1 ORDER BY created_at ASC LIMIT 1`,
      [booking.game_id]
    );
    const next = nextRes.rows[0];

    let promoted: PromotedFromWaitlist | null = null;
    if (next && game) {
      await client.query("DELETE FROM waitlist_entries WHERE id = $1", [next.id]);
      await client.query(
        `INSERT INTO bookings (id, user_id, game_id, payment_status, amount_paid) VALUES ($1, $2, $3, 'reserved', 0)`,
        [randomUUID(), next.user_id, booking.game_id]
      );
      await client.query("UPDATE games SET spots_filled = spots_filled + 1 WHERE id = $1", [booking.game_id]);
      const userRes = await client.query<{ name: string; email: string }>("SELECT name, email FROM users WHERE id = $1", [
        next.user_id,
      ]);
      if (userRes.rows[0]) {
        promoted = {
          userId: next.user_id,
          ...userRes.rows[0],
          sport: game.sport,
          date: game.date,
          time: game.time,
          venue: game.venue,
        };
      }
    }

    await client.query("COMMIT");
    return { ok: true, promoted };
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

/**
 * Names of paid attendees for a batch of games, grouped by game -- used to
 * show members "who's playing" once *they* have a paid spot in that game.
 * Only names, never email/phone (those stay admin-only via
 * listAttendeesForGame), and only paid bookings -- someone who's merely
 * reserved but hasn't paid isn't shown as confirmed yet.
 */
export async function listPaidAttendeeNamesForGames(gameIds: string[]): Promise<Map<string, string[]>> {
  await ensureDb();
  const names = new Map<string, string[]>();
  if (gameIds.length === 0) return names;
  const { rows } = await getPool().query<{ game_id: string; name: string }>(
    `SELECT b.game_id, u.name
     FROM bookings b JOIN users u ON u.id = b.user_id
     WHERE b.game_id = ANY($1) AND b.payment_status = 'paid'
     ORDER BY u.name ASC`,
    [gameIds]
  );
  for (const row of rows) {
    const list = names.get(row.game_id) ?? [];
    list.push(row.name);
    names.set(row.game_id, list);
  }
  return names;
}

/**
 * Actual revenue collected per game (sum of confirmed-paid bookings only --
 * not spots_filled * price, which would count unpaid "reserved" spots too).
 * Used for the Past Games profit/loss view.
 */
export async function totalRevenueByGame(gameIds: string[]): Promise<Map<string, number>> {
  await ensureDb();
  const totals = new Map<string, number>();
  if (gameIds.length === 0) return totals;
  const { rows } = await getPool().query<{ game_id: string; total: number }>(
    `SELECT game_id, SUM(amount_paid) as total FROM bookings WHERE game_id = ANY($1) AND payment_status = 'paid' GROUP BY game_id`,
    [gameIds]
  );
  for (const row of rows) totals.set(row.game_id, Number(row.total));
  return totals;
}
