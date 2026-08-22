import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";
import { redirect } from "next/navigation";

// ---------------------------------------------------------------------------
// Minimal signed-cookie session, standing in for real auth (Supabase Auth,
// per the build brief) for this local/mock milestone.
//
// The cookie holds base64url(JSON payload) + "." + base64url(HMAC-SHA256),
// so the server can trust its contents without a session table. It is not
// encrypted, only signed -- do not put secrets in the payload beyond what a
// logged-in user is allowed to read about themselves.
// ---------------------------------------------------------------------------

const COOKIE_NAME = "jidam_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7; // 7 days

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: "member" | "admin" | "boss";
};

type SessionPayload = SessionUser & { exp: number };

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    // Dev fallback so the app runs with zero setup. Never use this path in
    // a real deployment -- set SESSION_SECRET in the environment instead.
    return "dev-only-insecure-secret-change-me";
  }
  return secret;
}

function base64url(input: Buffer): string {
  return input.toString("base64url");
}

function sign(payload: SessionPayload): string {
  const body = base64url(Buffer.from(JSON.stringify(payload), "utf8"));
  const sig = base64url(createHmac("sha256", getSecret()).update(body).digest());
  return `${body}.${sig}`;
}

function verify(token: string): SessionPayload | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;

  const expectedSig = base64url(createHmac("sha256", getSecret()).update(body).digest());
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionPayload;
    if (typeof payload.exp !== "number" || payload.exp < Date.now() / 1000) return null;
    return payload;
  } catch {
    return null;
  }
}

/** Set the session cookie. Must be called from a Server Action or Route Handler. */
export async function createSession(user: SessionUser) {
  const payload: SessionPayload = { ...user, exp: Math.floor(Date.now() / 1000) + SESSION_DURATION_SECONDS };
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, sign(payload), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });
}

/** Clear the session cookie. Must be called from a Server Action or Route Handler. */
export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

/** Read the current session, if any. Safe to call from Server Components. */
export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = verify(token);
  if (!payload) return null;
  const { id, name, email, role } = payload;
  return { id, name, email, role };
}

/** Require any logged-in user; redirects to /login otherwise. For use in pages. */
export async function requireSession(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

/** Require an admin (mini-admin or boss); redirects non-admins away. For use in admin pages. */
export async function requireAdmin(): Promise<SessionUser> {
  const session = await requireSession();
  if (session.role !== "admin" && session.role !== "boss") redirect("/games");
  return session;
}

/** Require the boss account specifically; redirects mini-admins back to the dashboard. */
export async function requireBoss(): Promise<SessionUser> {
  const session = await requireAdmin();
  if (session.role !== "boss") redirect("/admin");
  return session;
}
