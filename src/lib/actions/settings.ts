"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireBoss } from "@/lib/session";
import { updateBusinessSettings } from "@/lib/repositories/receipts";

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
