"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireBoss } from "@/lib/session";
import { updateBusinessSettings } from "@/lib/repositories/receipts";
import { resetAllGamesData } from "@/lib/repositories/reset";
import { logActivity } from "@/lib/repositories/activity";

export type FormState = { error?: string; success?: boolean };

const settingsSchema = z.object({
  trade_name_en: z.string().trim().min(2, "Please enter the business name."),
  trade_name_ar: z.string().trim().min(2, "Please enter the Arabic business name."),
  trn: z.union([z.string().trim().min(1), z.literal("")]).optional(),
  address: z.union([z.string().trim().min(1), z.literal("")]).optional(),
});

/** Boss-only: business details printed on every receipt (see src/lib/db.ts business_settings table). */
export async function updateBusinessSettingsAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  await requireBoss();

  const parsed = settingsSchema.safeParse({
    trade_name_en: formData.get("trade_name_en"),
    trade_name_ar: formData.get("trade_name_ar"),
    trn: formData.get("trn"),
    address: formData.get("address"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form and try again." };
  }

  await updateBusinessSettings({
    trade_name_en: parsed.data.trade_name_en,
    trade_name_ar: parsed.data.trade_name_ar,
    trn: parsed.data.trn || null,
    address: parsed.data.address || null,
  });

  revalidatePath("/admin/settings");
  return { success: true };
}

export type ResetGamesState = { error?: string };

/**
 * Boss-only, irreversible: wipes every game and everything tied to one
 * (bookings, game expenses, waitlist entries) plus the entire receipts
 * ledger. Members/credits/subscriptions/plans are untouched -- see
 * resetAllGamesData. Requires the confirmation phrase to be typed exactly,
 * checked here (not just in the UI) since this is destructive enough that
 * client-side-only validation isn't enough.
 */
export async function resetAllGamesDataAction(_prevState: ResetGamesState, formData: FormData): Promise<ResetGamesState> {
  const session = await requireBoss();
  const confirmation = String(formData.get("confirmation") ?? "");
  if (confirmation !== "DELETE") {
    return { error: 'Type "DELETE" exactly to confirm.' };
  }

  await resetAllGamesData();
  await logActivity(session.id, "games_reset", "Fresh start: permanently wiped all games, bookings, expenses, and receipts.");

  revalidatePath("/admin");
  revalidatePath("/admin/past");
  revalidatePath("/admin/reports");
  revalidatePath("/admin/receipts");
  revalidatePath("/games");
  redirect("/admin");
}
