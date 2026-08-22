"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/session";
import { cancelGame, createGame } from "@/lib/repositories/games";

export type FormState = { error?: string };

const publishGameSchema = z.object({
  sport: z.string().trim().min(2, "Please choose or enter a sport."),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Please choose a valid date."),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Please choose a valid time."),
  venue: z.string().trim().min(2, "Please enter a venue."),
  price_aed: z.coerce.number().min(0, "Price can't be negative."),
  total_spots: z.coerce.number().int().min(1, "There must be at least 1 spot."),
  payment_link: z.union([z.string().trim().url("Please enter a valid payment link."), z.literal("")]).optional(),
});

export async function publishGameAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();

  const parsed = publishGameSchema.safeParse({
    sport: formData.get("sport"),
    date: formData.get("date"),
    time: formData.get("time"),
    venue: formData.get("venue"),
    price_aed: formData.get("price_aed"),
    total_spots: formData.get("total_spots"),
    payment_link: formData.get("payment_link"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form and try again." };
  }

  await createGame({ ...parsed.data, payment_link: parsed.data.payment_link || null });

  revalidatePath("/games");
  revalidatePath("/admin");
  redirect("/admin");
}

/**
 * Admin-only: cancel a game. It's a soft-delete -- the game disappears from
 * the public/member games list immediately, but stays visible to admins
 * (with its attendee list) under a "Cancelled" section so they can message
 * everyone who booked. Bound to a specific gameId via `.bind(null, gameId)`
 * where it's used as a form action.
 */
export async function cancelGameAction(gameId: string): Promise<void> {
  await requireAdmin();
  await cancelGame(gameId);
  revalidatePath("/games");
  revalidatePath("/admin");
}
