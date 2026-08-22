"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/session";
import { createExpense, deleteExpense } from "@/lib/repositories/expenses";

export type ExpenseFormState = { error?: string };

const addExpenseSchema = z.object({
  description: z.string().trim().min(2, "Please describe the expense."),
  amount: z.coerce.number().positive("Amount must be greater than 0."),
});

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
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form and try again." };
  }

  await createExpense({ game_id: gameId, ...parsed.data });

  revalidatePath("/admin/past");
  return {};
}

export async function deleteExpenseAction(expenseId: string): Promise<void> {
  await requireAdmin();
  await deleteExpense(expenseId);
  revalidatePath("/admin/past");
}
