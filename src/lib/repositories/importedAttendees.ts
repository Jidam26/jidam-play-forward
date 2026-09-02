import { getPool, ensureDb } from "@/lib/db";

/**
 * A named attendee on an imported historical game -- see
 * importDetailedGamesV2IfNeeded in src/lib/db.ts. There's no real member
 * account behind these (just names from the source spreadsheet), so this
 * is a read-only roster for admin viewing, not a bookings row.
 */
export type ImportedAttendeeRow = {
  id: string;
  name: string;
  status: string;
  amount_paid: number;
  is_waitlist: boolean;
};

export async function listImportedAttendeesForGames(
  gameIds: string[]
): Promise<Map<string, ImportedAttendeeRow[]>> {
  await ensureDb();
  const byGame = new Map<string, ImportedAttendeeRow[]>();
  if (gameIds.length === 0) return byGame;
  const { rows } = await getPool().query<ImportedAttendeeRow & { game_id: string }>(
    `SELECT id, game_id, name, status, amount_paid, is_waitlist
     FROM imported_attendees
     WHERE game_id = ANY($1)
     ORDER BY sort_order ASC`,
    [gameIds]
  );
  for (const row of rows) {
    const list = byGame.get(row.game_id) ?? [];
    list.push(row);
    byGame.set(row.game_id, list);
  }
  return byGame;
}
