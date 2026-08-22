"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/session";
import { createGame } from "@/lib/repositories/games";

export type FormState = { error?: string };

const publishGameSchema = z.object({
  sport: z.string().trim().min(2, "Please choose or enter a sport."),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Please choose a valid date."),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Please choose a valid time."),
  venue: z.string().trim().min(2, "Please enter a venue."),
  price_aed: z.coerce.number().min(0, "Price can't be negative."),
  total_spots: z.coerce.number().int().min(1, "There must be at least 1 spot."),
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
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form and try again." };
  }

  await createGame(parsed.data);

  revalidatePath("/games");
  revalidatePath("/admin");
  redirect("/admin");
}
