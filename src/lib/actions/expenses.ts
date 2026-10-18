"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/session";
import { createExpense, updateExpense, deleteExpense } from "@/lib/repositories/expenses";
import { logActivity } from "@/lib/repositories/activity";

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

type ParsedAttachment =
  | { ok: true; attachment: { data: Buffer; contentType: string; filename: string } | null }
  | { ok: false; error: string };

async function parseAttachment(formData: FormData): Promise<ParsedAttachment> {
  const file = formData.get("receipt");
  if (!(file instanceof File) || file.size === 0) return { ok: true, attachment: null };
  if (file.size > MAX_ATTACHMENT_BYTES) {
    return { ok: false, error: "That file is too big -- please attach something under 8MB." };
  }
  if (!ALLOWED_ATTACHMENT_TYPES.includes(file.type)) {
    return { ok: false, error: "Please attach a photo (JPG/PNG/WEBP/HEIC) or a PDF." };
  }
  return {
    ok: true,
    attachment: { data: Buffer.from(await file.arrayBuffer()), contentType: file.type, filename: file.name || "receipt" },
  };
}

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

  const parsedAttachment = await parseAttachment(formData);
  if (!parsedAttachment.ok) return { error: parsedAttachment.error };

  await createExpense({ game_id: gameId, ...parsed.data, date: parsed.data.date || null, attachment: parsedAttachment.attachment });

  revalidatePath("/admin/past");
  return {};
}

/**
 * Admin-only: correct an already-logged expense's description/amount/date.
 * A new file attached here replaces the old one; leaving the file field
 * empty keeps whatever's already attached (not cleared). Bound to
 * `.bind(null, expenseId)`.
 */
export async function updateExpenseAction(
  expenseId: string,
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

  const file = formData.get("receipt");
  const hasNewFile = file instanceof File && file.size > 0;
  const parsedAttachment = hasNewFile ? await parseAttachment(formData) : { ok: true as const, attachment: undefined };
  if (!parsedAttachment.ok) return { error: parsedAttachment.error };

  await updateExpense(expenseId, {
    ...parsed.data,
    date: parsed.data.date || null,
    attachment: hasNewFile ? parsedAttachment.attachment : undefined,
  });

  revalidatePath("/admin/past");
  return {};
}

export async function deleteExpenseAction(expenseId: string): Promise<void> {
  await requireAdmin();
  await deleteExpense(expenseId);
  revalidatePath("/admin/past");
}
