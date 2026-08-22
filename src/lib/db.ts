import { Pool, type PoolClient } from "pg";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";

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
      role TEXT NOT NULL CHECK (role IN ('member', 'admin')) DEFAULT 'member',
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

    -- Columns added after initial release: CREATE TABLE IF NOT EXISTS above
    -- won't add them to a database that already has the table, so these
    -- backfill them explicitly. No-ops once the columns already exist.
    ALTER TABLE games ADD COLUMN IF NOT EXISTS payment_link TEXT;
    ALTER TABLE games ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
  `);
}

// ---------------------------------------------------------------------------
// Auto-seed with demo data the first time the app runs against a fresh
// database, so a new deployment works immediately with no manual setup.
//
// Concurrent cold starts could otherwise race to seed twice. The gate below
// is the Postgres equivalent of the old SQLite approach (which relied on a
// UNIQUE-constraint failure to detect a lost race): whichever caller manages
// to insert the 'seeded' row into app_meta is the one that proceeds; anyone
// else sees ON CONFLICT DO NOTHING insert zero rows and backs off.
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
    await seedDemoData(client);
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  }
}

async function seedDemoData(client: PoolClient) {
  const insertUser = (id: string, name: string, email: string, phone: string, passwordHash: string, role: string) =>
    client.query(
      `INSERT INTO users (id, name, email, phone, password_hash, role) VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, name, email, phone, passwordHash, role]
    );

  const adminPasswordHash = bcrypt.hashSync("Admin123!", 10);
  const memberPasswordHash = bcrypt.hashSync("Member123!", 10);

  await insertUser(randomUUID(), "Jidam Admin", "admin@jidam.ae", "+971500000000", adminPasswordHash, "admin");
  const demoMemberId = randomUUID();
  await insertUser(demoMemberId, "Sample Member", "member@jidam.ae", "+971500000001", memberPasswordHash, "member");

  // A pool of extra demo members, so games can show a realistic, non-empty
  // roster on the admin side. All share the same password hash above.
  const demoNames = [
    "Amina Khalid", "Omar Haddad", "Layla Saeed", "Youssef Mansour", "Fatima Rashid",
    "Karim Nasser", "Hana Youssef", "Tariq Obaid", "Maryam Salem", "Zayed Ahmed",
    "Noor Hassan", "Rashid Ali", "Salma Ibrahim", "Faisal Juma", "Aisha Rahman",
  ];
  const demoUserIds: string[] = [];
  for (let i = 0; i < demoNames.length; i++) {
    const name = demoNames[i];
    const id = randomUUID();
    const email = `${name.toLowerCase().replace(/ /g, ".")}@example.com`;
    await insertUser(id, name, email, `+9715000001${String(i).padStart(2, "0")}`, memberPasswordHash, "member");
    demoUserIds.push(id);
  }

  const insertGame = (
    id: string,
    sport: string,
    date: string,
    time: string,
    venue: string,
    priceAed: number,
    totalSpots: number
  ) =>
    client.query(
      `INSERT INTO games (id, sport, date, time, venue, price_aed, total_spots, spots_filled) VALUES ($1, $2, $3, $4, $5, $6, $7, 0)`,
      [id, sport, date, time, venue, priceAed, totalSpots]
    );

  const insertBooking = (id: string, userId: string, gameId: string, paymentStatus: string, amountPaid: number) =>
    client.query(
      `INSERT INTO bookings (id, user_id, game_id, payment_status, amount_paid) VALUES ($1, $2, $3, $4, $5)`,
      [id, userId, gameId, paymentStatus, amountPaid]
    );

  const bumpGame = (gameId: string) => client.query(`UPDATE games SET spots_filled = spots_filled + 1 WHERE id = $1`, [gameId]);

  const insertExpense = (id: string, gameId: string | null, description: string, amount: number) =>
    client.query(`INSERT INTO expenses (id, game_id, description, amount) VALUES ($1, $2, $3, $4)`, [
      id,
      gameId,
      description,
      amount,
    ]);

  // Books `count` distinct users onto a game, inserting a real booking row
  // for each so spots_filled always matches the roster admins actually see.
  async function seedBookings(gameId: string, userIds: string[], paidCount: number, pricePerSpot: number) {
    for (let i = 0; i < userIds.length; i++) {
      const paid = i < paidCount;
      await insertBooking(randomUUID(), userIds[i], gameId, paid ? "paid" : "reserved", paid ? pricePerSpot : 0);
      await bumpGame(gameId);
    }
  }

  const today = new Date();
  const inDays = (n: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
  };

  const footballPrice = 30;
  const volleyballPrice = 25;

  const g1 = randomUUID(); // Football, 12/20 filled
  await insertGame(g1, "Football", inDays(3), "19:00", "Zayed Sports City, Abu Dhabi", footballPrice, 20);
  await seedBookings(g1, [demoMemberId, ...demoUserIds.slice(0, 11)], 8, footballPrice);

  const g2 = randomUUID(); // Volleyball, full (12/12)
  await insertGame(g2, "Volleyball", inDays(5), "18:30", "NYU Abu Dhabi Sports Hall", volleyballPrice, 12);
  await seedBookings(g2, demoUserIds.slice(0, 12), 12, volleyballPrice);

  const g3 = randomUUID(); // Football, 4/18 filled
  await insertGame(g3, "Football", inDays(7), "20:00", "Al Nahyan Stadium", footballPrice, 18);
  await seedBookings(g3, demoUserIds.slice(0, 4), 2, footballPrice);

  const g4 = randomUUID(); // Volleyball, 9/16 filled
  await insertGame(g4, "Volleyball", inDays(10), "17:00", "Corniche Beach Courts", volleyballPrice, 16);
  await seedBookings(g4, demoUserIds.slice(0, 9), 5, volleyballPrice);

  // A past game with expenses logged, so the Past Games archive has a
  // real example of the profit/loss view on a fresh deployment.
  const g5 = randomUUID(); // Football, 7 days ago, 10/16 filled, all paid
  await insertGame(g5, "Football", inDays(-7), "19:00", "Zayed Sports City, Abu Dhabi", footballPrice, 16);
  await seedBookings(g5, demoUserIds.slice(0, 10), 10, footballPrice);
  await insertExpense(randomUUID(), g5, "Venue rental", 150);
  await insertExpense(randomUUID(), g5, "Match balls", 40);
  await insertExpense(randomUUID(), null, "First-aid kit restock (general)", 60);
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
