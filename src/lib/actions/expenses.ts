"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/session";
import { createExpense, deleteExpense } from "@/lib/repositories/expenses";

export type ExpenseFormState = { error?: string };

const addExpenseSchema = z.object({
  description: z.string().trim().min(2, "Please describe the expense."),
  amount: z.coerce.number().positive("Amount must be greater than 0."),
  // Optional -- left blank, this is just null (falls back to created_at for display).
  date: z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal("")]).optional(),
});

// Stored directly in the expenses row (see src/lib/db.ts) -- kept small so a
// phone photo doesn't bloat the database or this form's upload.
const MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024; // 8MB
const ALLOWED_ATTACHMENT_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"];

/** gameId is null for a general (not game-specific) expense. */
export async function addExpenseAction(
  gameId: string | null,
  _prevState: ExpenseFormState,
  formData: FormData
): Promise<ExpenseFormState> {
  await requireAdmin();

  const parsed = addExpenseSchema.safeParse({
    description: formData.get("description"),
    amount: formData.get("amount"),
    date: formData.get("date"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form and try again." };
  }

  let attachment: { data: Buffer; contentType: string; filename: string } | null = null;
  const file = formData.get("receipt");
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_ATTACHMENT_BYTES) {
      return { error: "That file is too big -- please attach something under 8MB." };
    }
    if (!ALLOWED_ATTACHMENT_TYPES.includes(file.type)) {
      return { error: "Please attach a photo (JPG/PNG/WEBP/HEIC) or a PDF." };
    }
    attachment = {
      data: Buffer.from(await file.arrayBuffer()),
      contentType: file.type,
      filename: file.name || "receipt",
    };
  }

  await createExpense({ game_id: gameId, ...parsed.data, date: parsed.data.date || null, attachment });

  revalidatePath("/admin/past");
  return {};
}

export async function deleteExpenseAction(expenseId: string): Promise<void> {
  await requireAdmin();
  await deleteExpense(expenseId);
  revalidatePath("/admin/past");
}
