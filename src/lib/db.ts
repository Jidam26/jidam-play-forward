import { Pool, type PoolClient } from "pg";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import {
  IMPORTED_FOOTBALL_V2,
  IMPORTED_FOOTBALL_ATTENDEES_V2,
  IMPORTED_VOLLEYBALL_V2,
  IMPORTED_VOLLEYBALL_ATTENDEES_V2,
  type ImportedAttendee,
} from "@/lib/data/importedGamesV2";

// ---------------------------------------------------------------------------
// Postgres (Neon) database, reached over the standard `pg` driver so this
// runs unchanged on Netlify Functions (no persistent local disk there).
//
// This replaces the original local SQLite file. The schema below is the same
// one described in the build brief, now expressed in Postgres. Repository
// functions in src/lib/repositories/* are the only other files that talk to
// storage -- pages and Server Actions never touch SQL directly.
//
// Connection string comes from Netlify DB (NETLIFY_DB_URL, set
// automatically once a Netlify DB / Neon database is linked to the site) or
// a plain DATABASE_URL for local/dev use against any Postgres instance.
// ---------------------------------------------------------------------------

// Reuse a single pool across hot-reloads in dev and across warm invocations
// of the same serverless function instance.
const globalForDb = globalThis as unknown as { __jidamPool?: Pool };

/**
 * Lazily creates the connection pool on first use. This must NOT run at
 * module load: Next.js imports every route module (including this one,
 * transitively) to collect page data at build time, with no database
 * configured yet -- throwing there would break `next build` itself. The
 * missing-env-var error should only surface when a page/action actually
 * tries to talk to the database at runtime.
 */
export function getPool(): Pool {
  if (!globalForDb.__jidamPool) {
    const connectionString = process.env.NETLIFY_DB_URL || process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error(
        "Missing NETLIFY_DB_URL or DATABASE_URL. Link a Netlify DB to this site " +
          "(`netlify db init`) or set DATABASE_URL to a Postgres connection string."
      );
    }
    // A local Postgres (e.g. for `npm run dev` against `docker run postgres`)
    // typically has SSL off entirely; Neon/Netlify DB always requires it.
    const isLocal = /(localhost|127\.0\.0\.1)/.test(connectionString);

    globalForDb.__jidamPool = new Pool({
      connectionString,
      // Neon's certs are publicly trusted, but some serverless runtimes ship
      // an incomplete CA bundle; relaxing verification here only affects the
      // TLS chain check, the connection itself is still encrypted.
      ssl: isLocal ? false : { rejectUnauthorized: false },
      max: 3,
    });
  }
  return globalForDb.__jidamPool;
}

async function migrate(client: PoolClient) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS app_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      phone TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('member', 'admin', 'boss')) DEFAULT 'member',
      created_at TEXT NOT NULL DEFAULT (now()::text)
    );

    CREATE TABLE IF NOT EXISTS games (
      id TEXT PRIMARY KEY,
      sport TEXT NOT NULL,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      venue TEXT NOT NULL,
      price_aed DOUBLE PRECISION NOT NULL,
      total_spots INTEGER NOT NULL,
      spots_filled INTEGER NOT NULL DEFAULT 0,
      payment_link TEXT,
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled')),
      -- Set only for imported historical games where real per-attendee
      -- bookings aren't available, just a known total from records kept
      -- outside the app. When set, this is shown instead of the sum of
      -- real 'paid' bookings. Null for every game the app created itself.
      imported_revenue DOUBLE PRECISION,
      created_at TEXT NOT NULL DEFAULT (now()::text)
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      game_id TEXT NOT NULL REFERENCES games(id),
      payment_status TEXT NOT NULL CHECK (payment_status IN ('reserved', 'paid')) DEFAULT 'reserved',
      amount_paid DOUBLE PRECISION NOT NULL DEFAULT 0,
      booking_date TEXT NOT NULL DEFAULT (now()::text),
      UNIQUE (user_id, game_id)
    );

    -- General expenses aren't tied to a game (e.g. equipment, admin costs);
    -- game-specific ones (venue rental, referee fees) reference a game and
    -- feed into that game's profit/loss on the Past Games page.
    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      game_id TEXT REFERENCES games(id) ON DELETE SET NULL,
      description TEXT NOT NULL,
      amount DOUBLE PRECISION NOT NULL,
      created_at TEXT NOT NULL DEFAULT (now()::text)
    );

    -- Boss-only feed of admin actions: games published/cancelled, and
    -- bookings marked as paid.
    CREATE TABLE IF NOT EXISTS admin_activity (
      id TEXT PRIMARY KEY,
      admin_id TEXT NOT NULL REFERENCES users(id),
      action TEXT NOT NULL,
      game_id TEXT REFERENCES games(id) ON DELETE SET NULL,
      description TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (now()::text)
    );

    -- A game at capacity can take waitlist joins instead of bookings.
    -- created_at ordering is the queue order (first to join, first
    -- promoted) -- see cancelBooking in repositories/bookings.ts, which
    -- auto-promotes the earliest entry the moment a spot frees up.
    CREATE TABLE IF NOT EXISTS waitlist_entries (
      id TEXT PRIMARY KEY,
      game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (now()::text),
      UNIQUE (game_id, user_id)
    );

    -- Admin-configurable game-credit packages (e.g. "4-Game Football Pack --
    -- 120 AED"). "active" lets an admin retire a plan from the member-facing
    -- list without deleting it -- past purchases still reference it by id.
    CREATE TABLE IF NOT EXISTS plans (
      id TEXT PRIMARY KEY,
      sport TEXT NOT NULL,
      name TEXT NOT NULL,
      games_included INTEGER NOT NULL,
      price_aed DOUBLE PRECISION NOT NULL,
      payment_link TEXT,
      active BOOLEAN NOT NULL DEFAULT true,
      created_at TEXT NOT NULL DEFAULT (now()::text)
    );

    -- A member's request to buy a plan -- same manual payment-link +
    -- WhatsApp-screenshot flow as everything else in this app (see
    -- src/lib/config.ts). sport/games_included/price_aed are copied from
    -- the plan at request time so a purchase's own record stays accurate
    -- even if the plan is edited or deactivated later.
    CREATE TABLE IF NOT EXISTS plan_purchases (
      id TEXT PRIMARY KEY,
      plan_id TEXT NOT NULL REFERENCES plans(id),
      user_id TEXT NOT NULL REFERENCES users(id),
      sport TEXT NOT NULL,
      games_included INTEGER NOT NULL,
      price_aed DOUBLE PRECISION NOT NULL,
      payment_status TEXT NOT NULL CHECK (payment_status IN ('pending', 'paid')) DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT (now()::text)
    );

    -- A member's remaining game credits, per sport. Credited when an admin
    -- confirms a plan purchase as paid; debited by one when the member
    -- books a game using a credit instead of the per-game payment flow
    -- (see reserveSpotWithCredit in repositories/bookings.ts). Never
    -- expires -- just a running balance, no per-credit expiry tracking.
    CREATE TABLE IF NOT EXISTS credit_balances (
      user_id TEXT NOT NULL REFERENCES users(id),
      sport TEXT NOT NULL,
      balance INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (user_id, sport)
    );

    -- Named attendees on an imported historical game (see
    -- importDetailedGamesV2IfNeeded below) -- there's no real member
    -- account behind these names, so this is a simple read-only roster for
    -- admins, not a bookings row. "status" carries the source record's own
    -- label verbatim (e.g. "Paid", "Free - organiser", "Unconfirmed",
    -- "Waitlist") rather than forcing it into the app's reserved/paid enum.
    CREATE TABLE IF NOT EXISTS imported_attendees (
      id TEXT PRIMARY KEY,
      game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      status TEXT NOT NULL,
      amount_paid DOUBLE PRECISION NOT NULL DEFAULT 0,
      is_waitlist BOOLEAN NOT NULL DEFAULT false,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    -- "Forgot password" tokens. The token itself is the primary key (a long
    -- random string, unguessable), so looking one up doubles as validating
    -- it exists. used_at is set the moment it's redeemed so a token can't
    -- be replayed even within its expiry window.
    CREATE TABLE IF NOT EXISTS password_resets (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      expires_at TEXT NOT NULL,
      used_at TEXT,
      created_at TEXT NOT NULL DEFAULT (now()::text)
    );

    -- Columns added after initial release: CREATE TABLE IF NOT EXISTS above
    -- won't add them to a database that already has the table, so these
    -- backfill them explicitly. No-ops once the columns already exist.
    ALTER TABLE games ADD COLUMN IF NOT EXISTS payment_link TEXT;
    ALTER TABLE games ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
    ALTER TABLE games ADD COLUMN IF NOT EXISTS imported_revenue DOUBLE PRECISION;
    -- Optional: when the expense was actually incurred, which can differ
    -- from created_at (when it was logged into the app). Left blank if the
    -- admin doesn't need to backdate it.
    ALTER TABLE expenses ADD COLUMN IF NOT EXISTS date TEXT;
    -- Set when a booking was paid for with a game credit (see
    -- reserveSpotWithCredit) instead of the per-game manual payment flow --
    -- so admins can tell the two apart in the attendee list, and so this
    -- booking's amount_paid (always 0) isn't mistaken for a free spot.
    ALTER TABLE bookings ADD COLUMN IF NOT EXISTS paid_via_credit BOOLEAN NOT NULL DEFAULT false;
  `);

  // The 'role' CHECK constraint above only applies to a freshly created
  // table; a database from before the 'boss' role existed still has the
  // old ('member','admin') check and would reject promoting anyone to
  // boss. Postgres's default name for an inline column CHECK is
  // <table>_<column>_check, so this drops and re-adds it with 'boss'
  // included -- a no-op on a database that already allows it.
  await client.query(`
    ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
    ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('member', 'admin', 'boss'));
  `);
}

// ---------------------------------------------------------------------------
// First-run setup: create the one boss account so a fresh deployment has
// someone who can log in and start adding real admins/games. No demo
// member, games, or bookings -- those were only ever useful for the earlier
// demo build (see purgeDemoDataIfNeeded below for cleaning an existing
// deployment that still has them).
//
// Concurrent cold starts could otherwise race to seed twice. The gate below
// is the Postgres equivalent of relying on a UNIQUE-constraint failure to
// detect a lost race: whichever caller manages to insert the 'seeded' row
// into app_meta is the one that proceeds; anyone else sees ON CONFLICT DO
// NOTHING insert zero rows and backs off.
// ---------------------------------------------------------------------------

async function seedIfNeeded(client: PoolClient) {
  await client.query("BEGIN");
  try {
    const gate = await client.query(
      `INSERT INTO app_meta (key, value) VALUES ('seeded', '1') ON CONFLICT (key) DO NOTHING RETURNING key`
    );
    if (gate.rowCount === 0) {
      await client.query("ROLLBACK");
      return;
    }
    const bossPasswordHash = bcrypt.hashSync("Admin123!", 10);
    await client.query(
      `INSERT INTO users (id, name, email, phone, password_hash, role) VALUES ($1, $2, $3, $4, $5, 'boss')`,
      [randomUUID(), "Jidam Admin", "admin@jidam.ae", "+971500000000", bossPasswordHash]
    );
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  }
}

// ---------------------------------------------------------------------------
// One-time cleanup for a deployment that already ran the old demo-data seed
// (member@jidam.ae, 15 "*.example.com" members, and 5 example games at four
// fixed venue names). Runs exactly once, gated the same way as the seed
// above, so it never touches a database twice -- and it only ever deletes
// rows matching those exact seed identifiers, never a blanket "all games" or
// "all users" wipe, so anything added for real since deployment is untouched.
// Also promotes the original admin@jidam.ae to boss, whether it was created
// by the old seed or the new one above.
// ---------------------------------------------------------------------------

const DEMO_VENUES = [
  "Zayed Sports City, Abu Dhabi",
  "NYU Abu Dhabi Sports Hall",
  "Al Nahyan Stadium",
  "Corniche Beach Courts",
];

async function purgeDemoDataIfNeeded(client: PoolClient) {
  await client.query("BEGIN");
  try {
    const gate = await client.query(
      `INSERT INTO app_meta (key, value) VALUES ('demo_data_purged_v1', '1') ON CONFLICT (key) DO NOTHING RETURNING key`
    );
    if (gate.rowCount === 0) {
      await client.query("ROLLBACK");
      return;
    }

    await client.query(`UPDATE users SET role = 'boss' WHERE email = 'admin@jidam.ae'`);

    await client.query(
      `DELETE FROM expenses WHERE game_id IN (SELECT id FROM games WHERE venue = ANY($1))`,
      [DEMO_VENUES]
    );
    await client.query(
      `DELETE FROM expenses WHERE game_id IS NULL AND description = 'First-aid kit restock (general)'`
    );
    await client.query(
      `DELETE FROM bookings WHERE game_id IN (SELECT id FROM games WHERE venue = ANY($1))`,
      [DEMO_VENUES]
    );
    await client.query(
      `DELETE FROM bookings WHERE user_id IN (SELECT id FROM users WHERE email = 'member@jidam.ae' OR email LIKE '%@example.com')`
    );
    await client.query(`DELETE FROM games WHERE venue = ANY($1)`, [DEMO_VENUES]);
    await client.query(
      `DELETE FROM users WHERE email = 'member@jidam.ae' OR email LIKE '%@example.com'`
    );

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  }
}

// ---------------------------------------------------------------------------
// One-time import of the real Jul-Aug 2026 football and volleyball games,
// from JIDAM_Simple_Summary.docx and Jidam_football_games_Julaug.docx. These
// only have aggregate totals (no per-attendee data), so revenue is recorded
// directly via `imported_revenue` rather than fabricated bookings. Gated
// like the migrations above so it only ever runs once.
// ---------------------------------------------------------------------------

const IMPORTED_VOLLEYBALL = [
  { date: "2026-07-25", time: "18:30", venue: "Sports Hub (Open Level)", rent: 450, operator: 0, revenue: 0 },
  { date: "2026-08-01", time: "18:30", venue: "The Sports Hub (Open Level)", rent: 450, operator: 26, revenue: 578 },
  { date: "2026-08-05", time: "18:30", venue: "The Sports Hub (Open Level)", rent: 375, operator: 37, revenue: 560 },
  { date: "2026-08-07", time: "18:30", venue: "The Sports Hub (Collab)", rent: 450, operator: 0, revenue: 450 },
  { date: "2026-08-08", time: "18:30", venue: "The Sports Hub AD (5-1)", rent: 450, operator: 14, revenue: 520 },
  { date: "2026-08-15", time: "18:00", venue: "The Sports Hub AD (5-1)", rent: 450, operator: 22, revenue: 560 },
  { date: "2026-08-15", time: "20:00", venue: "The Sports Hub AD (Open Level)", rent: 450, operator: 29, revenue: 595 },
  { date: "2026-08-18", time: "18:30", venue: "The Sports Hub AD (Open Level)", rent: 450, operator: 36, revenue: 630 },
  { date: "2026-08-20", time: "18:30", venue: "The Sports Hub AD (Open Level)", rent: 450, operator: 36, revenue: 630 },
];

const IMPORTED_FOOTBALL = [
  { date: "2026-07-21", status: "active", free: true, revenue: 0, expense: 354 },
  { date: "2026-07-23", status: "active", free: false, revenue: 540, expense: 348 },
  { date: "2026-07-26", status: "active", free: false, revenue: 510, expense: 348 },
  { date: "2026-07-28", status: "active", free: false, revenue: 510, expense: 348 },
  { date: "2026-08-02", status: "active", free: false, revenue: 540, expense: 336 },
  { date: "2026-08-04", status: "active", free: false, revenue: 540, expense: 336 },
  { date: "2026-08-06", status: "active", free: false, revenue: 540, expense: 336 },
  { date: "2026-08-11", status: "active", free: false, revenue: 540, expense: 336 },
  { date: "2026-08-13", status: "active", free: false, revenue: 540, expense: 336 },
  { date: "2026-08-16", status: "active", free: false, revenue: 810, expense: 250 },
  { date: "2026-08-18", status: "active", free: false, revenue: 720, expense: 250 },
  { date: "2026-08-20", status: "cancelled", free: false, revenue: 0, expense: 336 },
];

async function importRealGamesIfNeeded(client: PoolClient) {
  await client.query("BEGIN");
  try {
    const gate = await client.query(
      `INSERT INTO app_meta (key, value) VALUES ('imported_real_games_v1', '1') ON CONFLICT (key) DO NOTHING RETURNING key`
    );
    if (gate.rowCount === 0) {
      await client.query("ROLLBACK");
      return;
    }

    const insertGame = async (
      sport: string,
      date: string,
      time: string,
      venue: string,
      priceAed: number,
      totalSpots: number,
      status: string,
      importedRevenue: number
    ) => {
      const id = randomUUID();
      await client.query(
        `INSERT INTO games (id, sport, date, time, venue, price_aed, total_spots, spots_filled, status, imported_revenue)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 0, $8, $9)`,
        [id, sport, date, time, venue, priceAed, totalSpots, status, importedRevenue]
      );
      return id;
    };

    const insertExpense = (gameId: string, description: string, amount: number) =>
      client.query(`INSERT INTO expenses (id, game_id, description, amount) VALUES ($1, $2, $3, $4)`, [
        randomUUID(),
        gameId,
        description,
        amount,
      ]);

    for (const g of IMPORTED_VOLLEYBALL) {
      const id = await insertGame("Volleyball", g.date, g.time, g.venue, 25, 12, "active", g.revenue);
      await insertExpense(id, "Venue rent", g.rent);
      if (g.operator > 0) await insertExpense(id, "Operator fee", g.operator);
    }

    for (const g of IMPORTED_FOOTBALL) {
      const id = await insertGame(
        "Football",
        g.date,
        "19:00",
        "Venue not recorded",
        g.free ? 0 : 30,
        20,
        g.status,
        g.revenue
      );
      await insertExpense(id, "Game expenses", g.expense);
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  }
}

// ---------------------------------------------------------------------------
// One-time replacement of the rough import above with the real trackers
// (JIDAM_Football_Tracker.xlsx / JIDAM_Volleyball_Tracker.xlsx), which have
// full per-attendee detail the original two Word docs didn't. Runs after
// importRealGamesIfNeeded, whether that ran just now or long ago: first
// deletes the exact games it inserted (matched by the same sport+date pairs,
// which importRealGamesIfNeeded also used to identify its own rows), then
// inserts the richer replacement -- games, their expense line items, and a
// named attendee roster per game. Gated separately so it still runs exactly
// once even though it depends on the older migration.
// ---------------------------------------------------------------------------

async function importDetailedGamesV2IfNeeded(client: PoolClient) {
  await client.query("BEGIN");
  try {
    const gate = await client.query(
      `INSERT INTO app_meta (key, value) VALUES ('imported_detailed_games_v2', '1') ON CONFLICT (key) DO NOTHING RETURNING key`
    );
    if (gate.rowCount === 0) {
      await client.query("ROLLBACK");
      return;
    }

    const oldVolleyballDates = IMPORTED_VOLLEYBALL.map((g) => g.date);
    const oldFootballDates = IMPORTED_FOOTBALL.map((g) => g.date);
    const oldIdsRes = await client.query<{ id: string }>(
      `SELECT id FROM games WHERE (sport = 'Volleyball' AND date = ANY($1)) OR (sport = 'Football' AND date = ANY($2))`,
      [oldVolleyballDates, oldFootballDates]
    );
    const oldIds = oldIdsRes.rows.map((r) => r.id);
    if (oldIds.length > 0) {
      // expenses.game_id is ON DELETE SET NULL, not CASCADE -- deleting the
      // games first would leave their old expense rows behind, misattributed
      // as general (not-tied-to-a-game) expenses. Clear those explicitly.
      await client.query(`DELETE FROM expenses WHERE game_id = ANY($1)`, [oldIds]);
      await client.query(`DELETE FROM games WHERE id = ANY($1)`, [oldIds]);
    }

    const insertGame = async (
      sport: string,
      date: string,
      time: string,
      venue: string,
      priceAed: number,
      totalSpots: number,
      importedRevenue: number
    ) => {
      const id = randomUUID();
      await client.query(
        `INSERT INTO games (id, sport, date, time, venue, price_aed, total_spots, spots_filled, status, imported_revenue)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 0, 'active', $8)`,
        [id, sport, date, time, venue, priceAed, totalSpots, importedRevenue]
      );
      return id;
    };

    const insertExpense = (gameId: string, description: string, amount: number) =>
      client.query(`INSERT INTO expenses (id, game_id, description, amount) VALUES ($1, $2, $3, $4)`, [
        randomUUID(),
        gameId,
        description,
        amount,
      ]);

    const insertAttendees = (gameId: string, attendees: ImportedAttendee[] | undefined) => {
      if (!attendees) return Promise.resolve();
      return Promise.all(
        attendees.map((a, i) =>
          client.query(
            `INSERT INTO imported_attendees (id, game_id, name, status, amount_paid, is_waitlist, sort_order)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [randomUUID(), gameId, a.name, a.status, a.amount, a.waitlist, i]
          )
        )
      );
    };

    for (const g of IMPORTED_FOOTBALL_V2) {
      const id = await insertGame("Football", g.date, "19:00", g.venue, g.price, g.totalSpots, g.revenue);
      await insertExpense(id, "Court hire", g.court);
      await insertExpense(id, "Water", g.water);
      if (g.operatorCut > 0) await insertExpense(id, "Operator cut", g.operatorCut);
      await insertAttendees(id, IMPORTED_FOOTBALL_ATTENDEES_V2[g.date]);
    }

    for (const g of IMPORTED_VOLLEYBALL_V2) {
      const id = await insertGame("Volleyball", g.date, g.time, g.venue, g.fee, g.totalSpots, g.revenue);
      await insertExpense(id, "Venue cost", g.venueCost);
      if (g.operatorCut > 0) await insertExpense(id, "Operator cut", g.operatorCut);
      if (g.otherCost > 0) await insertExpense(id, "Other cost", g.otherCost);
      await insertAttendees(id, IMPORTED_VOLLEYBALL_ATTENDEES_V2[g.session]);
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  }
}

// Runs once per warm function instance (or dev process); later calls reuse
// the same resolved promise instead of hitting the database again.
let initialized: Promise<void> | null = null;

export function ensureDb(): Promise<void> {
  if (!initialized) {
    initialized = (async () => {
      const client = await getPool().connect();
      try {
        await migrate(client);
        await seedIfNeeded(client);
        await purgeDemoDataIfNeeded(client);
        await importRealGamesIfNeeded(client);
        await importDetailedGamesV2IfNeeded(client);
      } finally {
        client.release();
      }
    })().catch((err) => {
      // Let the next call retry instead of caching a permanent failure.
      initialized = null;
      throw err;
    });
  }
  return initialized;
}
