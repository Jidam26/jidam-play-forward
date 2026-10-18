import { getPool, ensureDb } from "@/lib/db";
import { randomUUID } from "node:crypto";

export type ConductIncidentType = "late_fine" | "late_cancel_warning" | "no_show";

export type ConductIncident = {
  id: string;
  user_id: string;
  game_id: string | null;
  type: ConductIncidentType;
  fine_amount_aed: number | null;
  fine_paid: boolean;
  reviewed_at: string | null;
  note: string | null;
  created_at: string;
};

/** A member's current standing -- everything the booking flow and the Members page need, in one query. */
export type ConductSummary = {
  unpaidFineAed: number;
  warningCount: number;
  hasNoShow: boolean;
  flaggedForReview: boolean;
};

const EMPTY_SUMMARY: ConductSummary = { unpaidFineAed: 0, warningCount: 0, hasNoShow: false, flaggedForReview: false };

/**
 * Admin-only: log a Football conduct incident against a member. Always
 * admin-confirmed with a click -- there's no automatic detection of a real
 * late arrival or no-show (see the comment on the table in src/lib/db.ts).
 */
export async function addConductIncident(input: {
  userId: string;
  gameId: string | null;
  type: ConductIncidentType;
  fineAmountAed?: number;
  note?: string;
}): Promise<ConductIncident> {
  await ensureDb();
  const { rows } = await getPool().query<ConductIncident>(
    `INSERT INTO conduct_incidents (id, user_id, game_id, type, fine_amount_aed, note)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [randomUUID(), input.userId, input.gameId, input.type, input.fineAmountAed ?? null, input.note ?? null]
  );
  return rows[0];
}

/**
 * A member's current standing: unpaid fine total (blocks new Football
 * bookings -- see reserveSpot/reserveSpotWithCredit/reserveSpotWithSubscription),
 * how many late-cancellation warnings are still outstanding, whether an
 * unreviewed no-show exists, and whether that adds up to "Flagged for
 * Review" (3+ warnings, or any no-show).
 */
export async function getConductSummary(userId: string): Promise<ConductSummary> {
  await ensureDb();
  const { rows } = await getPool().query<{ unpaid_fine: number | null; warning_count: string; has_no_show: boolean }>(
    `SELECT
       COALESCE(SUM(fine_amount_aed) FILTER (WHERE type = 'late_fine' AND fine_paid = false), 0) as unpaid_fine,
       COUNT(*) FILTER (WHERE type = 'late_cancel_warning' AND reviewed_at IS NULL) as warning_count,
       EXISTS (SELECT 1 FROM conduct_incidents WHERE user_id = $1 AND type = 'no_show' AND reviewed_at IS NULL) as has_no_show
     FROM conduct_incidents WHERE user_id = $1`,
    [userId]
  );
  const row = rows[0];
  if (!row) return EMPTY_SUMMARY;
  const warningCount = Number(row.warning_count);
  const hasNoShow = row.has_no_show;
  return {
    unpaidFineAed: Number(row.unpaid_fine ?? 0),
    warningCount,
    hasNoShow,
    flaggedForReview: warningCount >= 3 || hasNoShow,
  };
}

/** Quick check used by the booking flow -- true blocks a new Football booking until the fine is paid. */
export async function hasUnpaidFootballFine(userId: string): Promise<boolean> {
  const summary = await getConductSummary(userId);
  return summary.unpaidFineAed > 0;
}

export type FlaggedMember = {
  user_id: string;
  name: string;
  email: string;
  warning_count: number;
  has_no_show: boolean;
};

/** Admin-only: every member currently flagged (3+ open warnings, or any unreviewed no-show). */
export async function listFlaggedMembers(): Promise<FlaggedMember[]> {
  await ensureDb();
  const { rows } = await getPool().query<FlaggedMember>(
    `SELECT u.id as user_id, u.name, u.email,
       COUNT(*) FILTER (WHERE c.type = 'late_cancel_warning' AND c.reviewed_at IS NULL) as warning_count,
       EXISTS (
         SELECT 1 FROM conduct_incidents c2 WHERE c2.user_id = u.id AND c2.type = 'no_show' AND c2.reviewed_at IS NULL
       ) as has_no_show
     FROM users u JOIN conduct_incidents c ON c.user_id = u.id
     GROUP BY u.id, u.name, u.email
     HAVING COUNT(*) FILTER (WHERE c.type = 'late_cancel_warning' AND c.reviewed_at IS NULL) >= 3
       OR EXISTS (
         SELECT 1 FROM conduct_incidents c2 WHERE c2.user_id = u.id AND c2.type = 'no_show' AND c2.reviewed_at IS NULL
       )
     ORDER BY u.name ASC`
  );
  return rows.map((r) => ({ ...r, warning_count: Number(r.warning_count) }));
}

/**
 * Admin-only: mark every one of a member's still-unpaid late-arrival fines
 * as paid in one click -- clears the Football booking block. Simpler than
 * tracking individual incident ids from the Members page, where only the
 * running total is shown.
 */
export async function markAllFinesPaidForUser(userId: string): Promise<void> {
  await ensureDb();
  await getPool().query(
    `UPDATE conduct_incidents SET fine_paid = true WHERE user_id = $1 AND type = 'late_fine' AND fine_paid = false`,
    [userId]
  );
}

/**
 * Admin-only: clears a member off the Flagged for Review list by marking
 * every one of their still-open warnings/no-shows as reviewed. Used by both
 * "Remove from Football" and "Dismiss" -- the difference between those two
 * is purely what the admin does in real life afterward (this app has no
 * actual Football-membership gate to flip -- see the scoping note on
 * conduct rules), so both just clear the flag here.
 */
export async function reviewFlaggedIncidents(userId: string): Promise<void> {
  await ensureDb();
  await getPool().query(
    `UPDATE conduct_incidents SET reviewed_at = now()::text
     WHERE user_id = $1 AND type IN ('late_cancel_warning', 'no_show') AND reviewed_at IS NULL`,
    [userId]
  );
}
