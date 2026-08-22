"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, requireSession } from "@/lib/session";
import { markBookingPaid, reserveSpot } from "@/lib/repositories/bookings";

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

/**
 * Admin-only: confirm a booking as paid after reviewing the member's
 * WhatsApp payment screenshot (there's no automated payment webhook --
 * see src/lib/config.ts). Bound to a specific bookingId/amount via
 * `.bind(null, bookingId, amount)` where it's used as a form action.
 */
export async function markPaidAction(bookingId: string, amount: number): Promise<void> {
  await requireAdmin();
  await markBookingPaid(bookingId, amount);
  revalidatePath("/admin");
}
