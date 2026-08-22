# Jidam — Play Forward

A multi-sport community platform for Abu Dhabi. Members browse upcoming games, reserve a spot, and (soon) pay online. Admins publish games and see who's signed up.

This build covers steps 1–5 of the brief: **auth, admin publish, public games list, reserve-without-payment, and the admin dashboard.** Payment is intentionally not wired up yet — see [Current status](#current-status--whats-next) below.

## Running it locally

```bash
npm install
DATABASE_URL=postgres://user:pass@localhost:5432/jidam npm run dev
```

Open http://localhost:3000. The database is Postgres (reached via `pg`), pointed at by `DATABASE_URL` (or `NETLIFY_DATABASE_URL`, set automatically in a Netlify DB-linked deployment). Tables are created and auto-seeded with demo data the first time the app talks to a fresh database — no manual migration step required. To reset, drop and recreate the database.

## Deploying to Netlify

This app needs a real Postgres database in production — Netlify Functions have no persistent local disk, so the original SQLite-file approach only worked for local dev. It now uses [Netlify DB](https://docs.netlify.com/build/data-and-storage/netlify-db/) (Neon-backed Postgres) instead:

```bash
netlify init          # link this directory to a Netlify site
netlify db init        # provision a Netlify DB and set NETLIFY_DATABASE_URL
netlify deploy --prod
```

No other configuration is needed — `src/lib/db.ts` picks up `NETLIFY_DATABASE_URL` automatically and creates/seeds the schema on first request.

### Demo logins

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@jidam.ae` | `Admin123!` |
| Member | `member@jidam.ae` | `Member123!` |

(Plus a bunch of auto-generated demo members used to populate game rosters — you don't need their credentials, they're just there so the admin dashboard has realistic attendee lists to look at.)

## What's here

- **Landing page** with the Jidam logo, tagline, and Sign In / Sign Up.
- **Sign up / Sign in** with hashed passwords (bcrypt) and a signed session cookie.
- **About page** (`/home`) with the sports on offer.
- **Upcoming Games** (`/games`) — sport, date/time, venue, price, live capacity ("12/20 filled"), and a Reserve button that disables and reads "Full" once a game is at capacity.
- **My Bookings** (`/bookings`) — the games you've reserved.
- **Admin dashboard** (`/admin`, admin-role only) — every upcoming game, its full attendee roster (name/email/phone/payment status), and revenue.
- **Publish a Game** (`/admin/games/new`) — goes live on the public games page immediately.

## Design decisions worth knowing about

- **Data layer is abstracted behind `src/lib/repositories/*`.** Pages and Server Actions never touch SQL directly — they call functions like `reserveSpot()`, `listUpcomingGames()`, `createUser()`. It originally ran on local SQLite; it now talks to Postgres (`src/lib/db.ts`, via `pg`) so it works on serverless hosts like Netlify, which have no persistent local disk. Nothing outside `src/lib/db.ts` and `src/lib/repositories/*` had to change.
- **Capacity is race-safe.** Reserving a spot runs inside one Postgres transaction that locks the game row (`SELECT ... FOR UPDATE`) before checking `spots_filled < total_spots`, so two concurrent requests for the last spot can't both win — see `reserveSpot()` in `src/lib/repositories/bookings.ts`.
- **Auth is a minimal signed-cookie session** (HMAC-SHA256, `src/lib/session.ts`), not a real auth provider. It's a placeholder for Supabase Auth. Set a `SESSION_SECRET` env var in any real deployment — there's an insecure dev-only fallback otherwise.
- **One login page routes by role.** Rather than a separate "admin login" page, `/login` sends admins to `/admin` and members to `/games` based on the account's role. Simpler to maintain; say the word if you'd rather have a distinct admin URL.
- **Booking status** is `reserved` (no payment gateway wired up yet) or `paid` (reserved for once payment lands). "My Bookings" and the admin roster both show this honestly rather than pretending payment happened.

## Current status & what's next

Per the brief's build order, payment is deliberately last and not built yet. When it's time:

1. ~~Swap `src/lib/db.ts` + `src/lib/repositories/*` for real Postgres calls~~ — done (see Deploying to Netlify above).
2. Swap `src/lib/session.ts` for Supabase Auth (or keep the current session shape and just change how it's issued).
3. Add the payment gateway (Telr/PayTabs/Stripe) behind a single interface at reserve-time, in sandbox/test mode first, per the brief's note on keeping it modular and swappable.
