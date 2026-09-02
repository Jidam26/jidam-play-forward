"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, requireSession } from "@/lib/session";
import { cancelBooking, deleteAttendee, markBookingPaid, reserveSpot, reserveSpotWithCredit } from "@/lib/repositories/bookings";
import { joinWaitlist, leaveWaitlist } from "@/lib/repositories/waitlist";
import { findGameById } from "@/lib/repositories/games";
import { sendEmail, bookingConfirmationEmail, waitlistPromotionEmail } from "@/lib/email";
import { logActivity } from "@/lib/repositories/activity";

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

  // Best-effort: a booking is confirmed the moment it's saved, whether or
  // not the email actually goes out (sendEmail never throws).
  const game = await findGameById(gameId);
  if (game) {
    const { subject, html } = bookingConfirmationEmail(game);
    await sendEmail(session.email, subject, html);
  }

  return { success: true };
}

/**
 * Admin-only: confirm a booking as paid after reviewing the member's
 * WhatsApp payment screenshot (there's no automated payment webhook --
 * see src/lib/config.ts). Bound to a specific bookingId/amount/attendee/game
 * via `.bind(null, bookingId, amount, attendeeName, gameLabel, gameId)`
 * where it's used as a form action -- see AdminGameCard. Logged to the
 * boss-only activity log so the boss can see who confirmed which payment.
 */
export async function markPaidAction(
  bookingId: string,
  amount: number,
  attendeeName: string,
  gameLabel: string,
  gameId: string
): Promise<void> {
  const session = await requireAdmin();
  await markBookingPaid(bookingId, amount);
  await logActivity(
    session.id,
    "payment_marked_paid",
    `Marked ${attendeeName} as paid (AED ${amount}) for ${gameLabel}`,
    gameId
  );
  revalidatePath("/admin");
}

export type ReserveWithCreditState = { error?: string; success?: boolean };

/** Reserve a spot using a game credit instead of the manual payment flow -- see reserveSpotWithCredit. */
export async function reserveSpotWithCreditAction(
  _prevState: ReserveWithCreditState,
  formData: FormData
): Promise<ReserveWithCreditState> {
  const session = await requireSession();
  const gameId = String(formData.get("gameId") ?? "");
  if (!gameId) return { error: "Missing game." };

  const result = await reserveSpotWithCredit(session.id, gameId);
  if (!result.ok) {
    switch (result.reason) {
      case "GAME_FULL":
        return { error: "Sorry, that game just filled up." };
      case "ALREADY_BOOKED":
        return { error: "You already have a spot in this game." };
      case "GAME_NOT_FOUND":
        return { error: "That game no longer exists." };
      case "NO_CREDIT":
        return { error: "You don't have a credit for this sport." };
    }
  }

  revalidatePath("/games");
  revalidatePath("/bookings");
  revalidatePath("/admin");

  const game = await findGameById(gameId);
  if (game) {
    const { subject, html } = bookingConfirmationEmail(game);
    await sendEmail(session.email, subject, html);
  }

  return { success: true };
}

export type WaitlistState = { error?: string; success?: boolean };

/** A game is full -- join its waitlist instead of reserving a spot. */
export async function joinWaitlistAction(
  _prevState: WaitlistState,
  formData: FormData
): Promise<WaitlistState> {
  const session = await requireSession();
  const gameId = String(formData.get("gameId") ?? "");
  if (!gameId) return { error: "Missing game." };

  const result = await joinWaitlist(session.id, gameId);
  if (!result.ok) {
    switch (result.reason) {
      case "GAME_NOT_FULL":
        return { error: "That game isn't full -- just reserve a spot instead." };
      case "ALREADY_BOOKED":
        return { error: "You already have a spot in this game." };
      case "ALREADY_WAITLISTED":
        return { error: "You're already on the waitlist for this game." };
      case "GAME_NOT_FOUND":
        return { error: "That game no longer exists." };
    }
  }

  revalidatePath("/games");
  revalidatePath("/bookings");
  return { success: true };
}

/** Leave a waitlist -- bound to a gameId via `.bind(null, gameId)`. */
export async function leaveWaitlistAction(gameId: string): Promise<void> {
  const session = await requireSession();
  await leaveWaitlist(session.id, gameId);
  revalidatePath("/games");
  revalidatePath("/bookings");
}

/**
 * A member cancels their own confirmed spot -- bound to a bookingId via
 * `.bind(null, bookingId)`. If anyone was waiting for this game, they're
 * auto-promoted into the freed spot and emailed the good news.
 */
export async function cancelBookingAction(bookingId: string): Promise<void> {
  const session = await requireSession();
  const result = await cancelBooking(session.id, bookingId);
  if (!result.ok) return; // stale button (already cancelled elsewhere) -- nothing to do

  revalidatePath("/games");
  revalidatePath("/bookings");
  revalidatePath("/admin");

  if (result.promoted) {
    const { subject, html } = waitlistPromotionEmail(result.promoted);
    await sendEmail(result.promoted.email, subject, html);
  }
}

/**
 * Admin-only: permanently delete an attendee's booking from a game --
 * bound to `.bind(null, bookingId, attendeeName, gameLabel, gameId)` where
 * it's used as a form action -- see AdminGameCard. Unlike a self-cancel,
 * this is destructive and admin-initiated on someone else's booking, so
 * it's logged to the boss-only activity log (who deleted whom, from
 * which game). Same waitlist auto-promotion + email as a self-cancel.
 */
export async function deleteAttendeeAction(
  bookingId: string,
  attendeeName: string,
  gameLabel: string,
  gameId: string
): Promise<void> {
  const session = await requireAdmin();
  const result = await deleteAttendee(bookingId);
  if (!result.ok) return; // stale button (already removed elsewhere) -- nothing to do

  await logActivity(session.id, "player_deleted", `Deleted ${attendeeName} from ${gameLabel}`, gameId);

  revalidatePath("/games");
  revalidatePath("/bookings");
  revalidatePath("/admin");
  revalidatePath("/admin/past");

  if (result.promoted) {
    const { subject, html } = waitlistPromotionEmail(result.promoted);
    await sendEmail(result.promoted.email, subject, html);
  }
}
