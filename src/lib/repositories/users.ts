import { getPool, ensureDb } from "@/lib/db";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";

export type User = {
  id: string;
  name: string;
  email: string;
  phone: string;
  password_hash: string;
  role: "member" | "admin";
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

export function verifyPassword(user: User, password: string): boolean {
  return bcrypt.compareSync(password, user.password_hash);
}
