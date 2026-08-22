"use client";

import { deleteExpenseAction } from "@/lib/actions/expenses";

export function DeleteExpenseButton({ expenseId }: { expenseId: string }) {
  return (
    <form action={deleteExpenseAction.bind(null, expenseId)}>
      <button type="submit" className="text-xs text-navy/40 hover:text-red-600" aria-label="Delete expense">
        Remove
      </button>
    </form>
  );
}
