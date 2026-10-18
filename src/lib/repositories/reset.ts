import { getPool, ensureDb } from "@/lib/db";

/**
 * Everything a "fresh start" wipe (see resetAllGamesData) is about to
 * permanently delete, gathered into one JSON-friendly snapshot so the boss
 * has a record to look back at. Attachment bytes are deliberately left out
 * -- noted by filename/content-type only -- to keep this small; the
 * original photo is gone once the wipe runs, same as everything else here.
 */
export async function buildGamesBackupExport() {
  await ensureDb();
  const pool = getPool();

  const [games, bookings, expenses, waitlist, receipts] = await Promise.all([
    pool.query(`SELECT * FROM games ORDER BY date ASC`),
    pool.query(
      `SELECT b.*, u.name as member_name, u.email as member_email
       FROM bookings b LEFT JOIN users u ON u.id = b.user_id
       ORDER BY b.booking_date ASC`
    ),
    pool.query(
      `SELECT id, game_id, description, amount, date, created_at,
              (attachment_data IS NOT NULL) as had_attachment, attachment_filename
       FROM expenses WHERE game_id IS NOT NULL ORDER BY created_at ASC`
    ),
    pool.query(
      `SELECT w.*, u.name as member_name, u.email as member_email
       FROM waitlist_entries w LEFT JOIN users u ON u.id = w.user_id
       ORDER BY w.created_at ASC`
    ),
    pool.query(`SELECT * FROM receipts ORDER BY created_at ASC`),
  ]);

  return {
    exported_at: new Date().toISOString(),
    games: games.rows,
    bookings: bookings.rows,
    game_expenses: expenses.rows,
    waitlist_entries: waitlist.rows,
    receipts: receipts.rows,
  };
}

/**
 * Permanently wipes every game and everything tied to one -- bookings,
 * game-specific expenses, waitlist entries -- plus the entire receipts
 * ledger. Deliberately leaves members, credit balances, subscriptions,
 * plans, and business settings untouched; also leaves general expenses
 * (game_id IS NULL) alone since those were never tied to a game. No undo --
 * call buildGamesBackupExport first if a record of this is wanted.
 */
export async function resetAllGamesData(): Promise<void> {
  await ensureDb();
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM bookings");
    await client.query("DELETE FROM expenses WHERE game_id IS NOT NULL");
    await client.query("DELETE FROM waitlist_entries");
    await client.query("DELETE FROM imported_attendees");
    await client.query("DELETE FROM games");
    await client.query("DELETE FROM receipts");
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
