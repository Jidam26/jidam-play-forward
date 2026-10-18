"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/session";
import { cancelGame, createGame, deleteGame, findGameById, updateGame } from "@/lib/repositories/games";
import { logActivity } from "@/lib/repositories/activity";

export type FormState = { error?: string };

const baseGameSchema = z.object({
  sport: z.string().trim().min(2, "Please choose or enter a sport."),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Please choose a valid date."),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Please choose a valid start time."),
  end_time: z.string().regex(/^\d{2}:\d{2}$/, "Please choose a valid end time."),
  venue: z.string().trim().min(2, "Please enter a venue."),
  price_aed: z.coerce.number().min(0, "Price can't be negative."),
  total_spots: z.coerce.number().int().min(1, "There must be at least 1 spot."),
  payment_link: z.union([z.string().trim().url("Please enter a valid payment link."), z.literal("")]).optional(),
});

const timeOrderRefinement = (data: { time: string; end_time: string }) => data.end_time > data.time;
const timeOrderMessage = { message: "End time must be after the start time.", path: ["end_time"] };

const publishGameSchema = baseGameSchema.refine(timeOrderRefinement, timeOrderMessage);

export async function publishGameAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const session = await requireAdmin();

  const parsed = publishGameSchema.safeParse({
    sport: formData.get("sport"),
    date: formData.get("date"),
    time: formData.get("time"),
    end_time: formData.get("end_time"),
    venue: formData.get("venue"),
    price_aed: formData.get("price_aed"),
    total_spots: formData.get("total_spots"),
    payment_link: formData.get("payment_link"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form and try again." };
  }

  const game = await createGame({ ...parsed.data, payment_link: parsed.data.payment_link || null });
  await logActivity(
    session.id,
    "game_published",
    `Published ${game.sport} on ${game.date} at ${game.venue}`,
    game.id
  );

  revalidatePath("/games");
  revalidatePath("/admin");
  redirect("/admin");
}

const editGameSchema = baseGameSchema
  .extend({
    spots_filled: z.coerce.number().int().min(0, "Can't be negative."),
    // z.literal("") must come before the coercion branch -- z.coerce.number()
    // happily coerces an empty string to 0 (Number("") === 0 in JS), so with
    // the branches the other way around an untouched/cleared field would
    // silently become a real 0 override instead of staying blank/null. This
    // used to only affect past games (showing AED 0 instead of real revenue
    // whenever one was edited); extending editing to live games surfaced it
    // harder, since 0 isn't null, so a live game forced to imported_revenue=0
    // drops out of listUpcomingGames' `imported_revenue IS NULL` filter
    // entirely and disappears from view.
    imported_revenue: z.union([z.literal(""), z.coerce.number().min(0)]).optional(),
  })
  .refine(timeOrderRefinement, timeOrderMessage);

/**
 * Admin-only: correct any of a game's details -- e.g. a game logged before
 * the booking system tracked real attendees, so it shows 0/20 filled when
 * 20 people actually played. Works for a live, cancelled, or past game
 * alike; `returnPath` sends the admin back to wherever they came from
 * (Past Games vs the main Dashboard) once saved. Logged to the boss-only
 * activity log, same as other edits.
 */
export async function updateGameAction(
  gameId: string,
  returnPath: string,
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await requireAdmin();

  const parsed = editGameSchema.safeParse({
    sport: formData.get("sport"),
    date: formData.get("date"),
    time: formData.get("time"),
    end_time: formData.get("end_time"),
    venue: formData.get("venue"),
    price_aed: formData.get("price_aed"),
    total_spots: formData.get("total_spots"),
    payment_link: formData.get("payment_link"),
    spots_filled: formData.get("spots_filled"),
    imported_revenue: formData.get("imported_revenue"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form and try again." };
  }
  if (parsed.data.spots_filled > parsed.data.total_spots) {
    return { error: "Attendees played can't be more than total spots." };
  }

  await updateGame(gameId, {
    ...parsed.data,
    payment_link: parsed.data.payment_link || null,
    imported_revenue: parsed.data.imported_revenue === "" || parsed.data.imported_revenue === undefined
      ? null
      : parsed.data.imported_revenue,
  });
  await logActivity(
    session.id,
    "game_updated",
    `Edited ${parsed.data.sport} on ${parsed.data.date} at ${parsed.data.venue}`,
    gameId
  );

  revalidatePath("/admin");
  revalidatePath("/admin/past");
  redirect(returnPath);
}

/**
 * Admin-only: cancel a game. It's a soft-delete -- the game disappears from
 * the public/member games list immediately, but stays visible to admins
 * (with its attendee list) under a "Cancelled" section so they can message
 * everyone who booked. Bound to a specific gameId via `.bind(null, gameId)`
 * where it's used as a form action.
 */
export async function cancelGameAction(gameId: string): Promise<void> {
  const session = await requireAdmin();
  const game = await findGameById(gameId);
  await cancelGame(gameId);
  if (game) {
    await logActivity(
      session.id,
      "game_cancelled",
      `Cancelled ${game.sport} on ${game.date} at ${game.venue}`,
      game.id
    );
  }
  revalidatePath("/games");
  revalidatePath("/admin");
}

/**
 * Admin-only: permanently delete a game -- removes it and everyone's
 * bookings for it, no undo. Usable on Live, Cancelled, or Past games.
 * Logged with a snapshot description since the game won't exist to look up
 * afterward. Bound to a specific gameId via `.bind(null, gameId)` where
 * it's used as a form action -- see DeleteGameButton.
 */
export async function deleteGameAction(gameId: string): Promise<void> {
  const session = await requireAdmin();
  const game = await findGameById(gameId);
  await deleteGame(gameId);
  if (game) {
    await logActivity(
      session.id,
      "game_deleted",
      `Deleted ${game.sport} on ${game.date} at ${game.venue}`,
      null
    );
  }
  revalidatePath("/games");
  revalidatePath("/admin");
  revalidatePath("/admin/past");
}
