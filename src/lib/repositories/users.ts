import { getPool, ensureDb } from "@/lib/db";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";

export type Role = "member" | "admin" | "boss";

export type User = {
  id: string;
  name: string;
  email: string;
  phone: string;
  password_hash: string;
  role: Role;
  created_at: string;
};

export async function findUserByEmail(email: string): Promise<User | undefined> {
  await ensureDb();
  const { rows } = await getPool().query<User>("SELECT * FROM users WHERE email = $1", [email.toLowerCase().trim()]);
  return rows[0];
}

export async function findUserById(id: string): Promise<User | undefined> {
  await ensureDb();
  const { rows } = await getPool().query<User>("SELECT * FROM users WHERE id = $1", [id]);
  return rows[0];
}

export type CreateUserInput = {
  name: string;
  email: string;
  phone: string;
  password: string;
};

/** Throws Error("EMAIL_TAKEN") if the email is already registered. */
export async function createUser(input: CreateUserInput): Promise<User> {
  await ensureDb();
  const email = input.email.toLowerCase().trim();
  if (await findUserByEmail(email)) {
    throw new Error("EMAIL_TAKEN");
  }

  const id = randomUUID();
  const passwordHash = bcrypt.hashSync(input.password, 10);

  try {
    const { rows } = await getPool().query<User>(
      `INSERT INTO users (id, name, email, phone, password_hash, role) VALUES ($1, $2, $3, $4, $5, 'member') RETURNING *`,
      [id, input.name.trim(), email, input.phone.trim(), passwordHash]
    );
    return rows[0];
  } catch (err) {
    // Race-safety net: two signups for the same email at once could both
    // pass the check above; the UNIQUE constraint on email is what actually
    // decides who wins.
    if ((err as { code?: string }).code === "23505") {
      throw new Error("EMAIL_TAKEN");
    }
    throw err;
  }
}

/** Boss-only: create a mini-admin account with a temporary password they'll change themselves. */
export async function createAdminAccount(input: CreateUserInput): Promise<User> {
  await ensureDb();
  const email = input.email.toLowerCase().trim();
  if (await findUserByEmail(email)) {
    throw new Error("EMAIL_TAKEN");
  }

  const id = randomUUID();
  const passwordHash = bcrypt.hashSync(input.password, 10);

  try {
    const { rows } = await getPool().query<User>(
      `INSERT INTO users (id, name, email, phone, password_hash, role) VALUES ($1, $2, $3, $4, $5, 'admin') RETURNING *`,
      [id, input.name.trim(), email, input.phone.trim(), passwordHash]
    );
    return rows[0];
  } catch (err) {
    if ((err as { code?: string }).code === "23505") {
      throw new Error("EMAIL_TAKEN");
    }
    throw err;
  }
}

/** Boss-only: everyone with admin or boss access, boss first then admins by name. */
export async function listAdmins(): Promise<User[]> {
  await ensureDb();
  const { rows } = await getPool().query<User>(
    `SELECT * FROM users WHERE role IN ('admin', 'boss') ORDER BY (role = 'boss') DESC, name ASC`
  );
  return rows;
}

export type MemberSummary = {
  id: string;
  name: string;
  email: string;
  phone: string;
  created_at: string;
  total_bookings: number;
  total_paid: number;
  // Football conduct standing -- see repositories/conduct.ts. warning_count
  // and has_no_show only count still-open (unreviewed) incidents.
  unpaid_fine_aed: number;
  warning_count: number;
  has_no_show: boolean;
};

/**
 * Every registered member (not admins/boss), with lifetime booking stats --
 * the admin Members directory. Optional `search` filters by name or email
 * (case-insensitive substring). total_bookings counts every booking
 * regardless of payment status; total_paid only sums confirmed-paid ones.
 */
export async function listMembers(search?: string): Promise<MemberSummary[]> {
  await ensureDb();
  const params: unknown[] = [];
  let where = "u.role = 'member'";
  if (search && search.trim()) {
    params.push(`%${search.trim()}%`);
    where += ` AND (u.name ILIKE $${params.length} OR u.email ILIKE $${params.length})`;
  }
  const { rows } = await getPool().query<MemberSummary>(
    `SELECT u.id, u.name, u.email, u.phone, u.created_at,
       COALESCE(b.total_bookings, 0) as total_bookings,
       COALESCE(b.total_paid, 0) as total_paid,
       COALESCE(c.unpaid_fine_aed, 0) as unpaid_fine_aed,
       COALESCE(c.warning_count, 0) as warning_count,
       COALESCE(c.has_no_show, false) as has_no_show
     FROM users u
     LEFT JOIN (
       SELECT user_id, COUNT(*) as total_bookings,
         SUM(amount_paid) FILTER (WHERE payment_status = 'paid') as total_paid
       FROM bookings WHERE user_id IS NOT NULL GROUP BY user_id
     ) b ON b.user_id = u.id
     LEFT JOIN (
       SELECT user_id,
         SUM(fine_amount_aed) FILTER (WHERE type = 'late_fine' AND fine_paid = false) as unpaid_fine_aed,
         COUNT(*) FILTER (WHERE type = 'late_cancel_warning' AND reviewed_at IS NULL) as warning_count,
         BOOL_OR(type = 'no_show' AND reviewed_at IS NULL) as has_no_show
       FROM conduct_incidents GROUP BY user_id
     ) c ON c.user_id = u.id
     WHERE ${where}
     ORDER BY u.name ASC`,
    params
  );
  return rows;
}

/** Lightweight id/name/email list for populating a member picker (e.g. the manual add-attendee form). */
export async function listMemberOptions(): Promise<{ id: string; name: string; email: string }[]> {
  await ensureDb();
  const { rows } = await getPool().query<{ id: string; name: string; email: string }>(
    "SELECT id, name, email FROM users WHERE role = 'member' ORDER BY name ASC"
  );
  return rows;
}

/** Admin-only: correct a member's profile fields. Throws Error("EMAIL_TAKEN") if the new email belongs to someone else. */
export async function updateMember(
  userId: string,
  input: { name: string; email: string; phone: string }
): Promise<void> {
  await ensureDb();
  const email = input.email.toLowerCase().trim();
  const existing = await findUserByEmail(email);
  if (existing && existing.id !== userId) {
    throw new Error("EMAIL_TAKEN");
  }
  try {
    await getPool().query(
      "UPDATE users SET name = $2, email = $3, phone = $4 WHERE id = $1 AND role = 'member'",
      [userId, input.name.trim(), email, input.phone.trim()]
    );
  } catch (err) {
    if ((err as { code?: string }).code === "23505") {
      throw new Error("EMAIL_TAKEN");
    }
    throw err;
  }
}

/**
 * Admin-only, irreversible: permanently delete a member and everything
 * tied to them -- bookings, waitlist entries, credit balances, plan
 * purchases, and any "forgot password" tokens they ever requested (even an
 * old, already-used one still has a row here, and its FK has no ON DELETE
 * clause). conduct_incidents cascades automatically (see src/lib/db.ts).
 * Receipts are the one exception -- that FK is ON DELETE SET NULL, so any
 * receipt this member was issued stays in the permanent ledger with its
 * member reference cleared (the receipt already snapshots the name/email
 * at issue time, so it stays meaningful on its own).
 */
export async function deleteMember(userId: string): Promise<void> {
  await ensureDb();
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM bookings WHERE user_id = $1", [userId]);
    await client.query("DELETE FROM waitlist_entries WHERE user_id = $1", [userId]);
    await client.query("DELETE FROM credit_balances WHERE user_id = $1", [userId]);
    await client.query("DELETE FROM plan_purchases WHERE user_id = $1", [userId]);
    await client.query("DELETE FROM password_resets WHERE user_id = $1", [userId]);
    await client.query("DELETE FROM users WHERE id = $1 AND role = 'member'", [userId]);
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export function verifyPassword(user: User, password: string): boolean {
  return bcrypt.compareSync(password, user.password_hash);
}

export async function updatePassword(userId: string, newPassword: string): Promise<void> {
  await ensureDb();
  const passwordHash = bcrypt.hashSync(newPassword, 10);
  await getPool().query("UPDATE users SET password_hash = $2 WHERE id = $1", [userId, passwordHash]);
}
