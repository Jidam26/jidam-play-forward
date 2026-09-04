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
       COALESCE(b.total_paid, 0) as total_paid
     FROM users u
     LEFT JOIN (
       SELECT user_id, COUNT(*) as total_bookings,
         SUM(amount_paid) FILTER (WHERE payment_status = 'paid') as total_paid
       FROM bookings WHERE user_id IS NOT NULL GROUP BY user_id
     ) b ON b.user_id = u.id
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

export function verifyPassword(user: User, password: string): boolean {
  return bcrypt.compareSync(password, user.password_hash);
}

export async function updatePassword(userId: string, newPassword: string): Promise<void> {
  await ensureDb();
  const passwordHash = bcrypt.hashSync(newPassword, 10);
  await getPool().query("UPDATE users SET password_hash = $2 WHERE id = $1", [userId, passwordHash]);
}
