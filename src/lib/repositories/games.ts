import { getPool, ensureDb } from "@/lib/db";
import { randomUUID } from "node:crypto";

export type Sport = "Football" | "Volleyball" | "Padel" | "Basketball";

export type Game = {
  id: string;
  sport: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  venue: string;
  price_aed: number;
  total_spots: number;
  spots_filled: number;
  payment_link: string | null;
  created_at: string;
};

/** Upcoming = today or later, soonest first. */
export async function listUpcomingGames(): Promise<Game[]> {
  await ensureDb();
  const today = new Date().toISOString().slice(0, 10);
  const { rows } = await getPool().query<Game>(
    "SELECT * FROM games WHERE date >= $1 ORDER BY date ASC, time ASC",
    [today]
  );
  return rows;
}

/** All games (past + upcoming), soonest first -- used by the admin dashboard. */
export async function listAllGames(): Promise<Game[]> {
  await ensureDb();
  const { rows } = await getPool().query<Game>("SELECT * FROM games ORDER BY date ASC, time ASC");
  return rows;
}

export async function findGameById(id: string): Promise<Game | undefined> {
  await ensureDb();
  const { rows } = await getPool().query<Game>("SELECT * FROM games WHERE id = $1", [id]);
  return rows[0];
}

export type CreateGameInput = {
  sport: string;
  date: string;
  time: string;
  venue: string;
  price_aed: number;
  total_spots: number;
  payment_link?: string | null;
};

export async function createGame(input: CreateGameInput): Promise<Game> {
  await ensureDb();
  const id = randomUUID();
  const { rows } = await getPool().query<Game>(
    `INSERT INTO games (id, sport, date, time, venue, price_aed, total_spots, spots_filled, payment_link)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 0, $8) RETURNING *`,
    [
      id,
      input.sport,
      input.date,
      input.time,
      input.venue.trim(),
      input.price_aed,
      input.total_spots,
      input.payment_link?.trim() || null,
    ]
  );
  return rows[0];
}
