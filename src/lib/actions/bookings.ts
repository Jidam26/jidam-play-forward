"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/session";
import { reserveSpot } from "@/lib/repositories/bookings";

export type ReserveState = { error?: string; success?: boolean };

export async function reserveSpotAction(_prevState: ReserveState, formData: FormData): Promise<ReserveState> {
  const session = await requireSession();
  const gameId = String(formData.get("gameId") ?? "");
  if (!gameId) return { error: "Missing game." };

  const result = await reserveSpot(session.id, gameId);

  if (!result.ok) {
    switch (result.reason) {
      case "GAME_FULL":
        return { error: "Sorry, that game just filled up." };
      case "ALREADY_BOOKED":
        return { error: "You already have a spot in this game." };
      case "GAME_NOT_FOUND":
        return { error: "That game no longer exists." };
    }
  }

  revalidatePath("/games");
  revalidatePath("/bookings");
  revalidatePath("/admin");
  return { success: true };
}
