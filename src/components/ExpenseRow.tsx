"use client";

import { useActionState, useState } from "react";
import { updateExpenseAction, type ExpenseFormState } from "@/lib/actions/expenses";
import { formatMoney } from "@/lib/money";
import { SubmitButton } from "@/components/SubmitButton";
import { DeleteExpenseButton } from "@/components/DeleteExpenseButton";
import type { Expense } from "@/lib/repositories/expenses";

const initialState: ExpenseFormState = {};

function formatExpenseDate(dateStr: string) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-AE", { day: "numeric", month: "short", year: "numeric" });
}

/** One row in an expense list -- view mode shows description/amount/date/receipt link, with Edit and Remove. */
export function ExpenseRow({ expense }: { expense: Expense }) {
  const [editing, setEditing] = useState(false);
  const action = updateExpenseAction.bind(null, expense.id);
  const [state, formAction] = useActionState(action, initialState);

  if (editing) {
    return (
      <li className="rounded-lg border border-navy/10 bg-navy/5 p-2.5">
        <form action={formAction} className="flex flex-wrap items-end gap-2">
          <label className="min-w-0 flex-1 basis-32">
            <span className="mb-1 block text-xs font-medium text-navy/70">Description</span>
            <input
              name="description"
              type="text"
              defaultValue={expense.description}
              required
              className="w-full rounded-lg border border-navy/20 bg-white px-2 py-1.5 text-sm text-navy outline-none focus:border-gold focus:ring-2 focus:ring-gold/30"
            />
          </label>
          <label className="w-24">
            <span className="mb-1 block text-xs font-medium text-navy/70">Amount</span>
            <input
              name="amount"
              type="number"
              min={0.01}
              step="0.01"
              defaultValue={expense.amount}
              required
              className="w-full rounded-lg border border-navy/20 bg-white px-2 py-1.5 text-sm text-navy outline-none focus:border-gold focus:ring-2 focus:ring-gold/30"
            />
          </label>
          <label className="w-32">
            <span className="mb-1 block text-xs font-medium text-navy/70">Date</span>
            <input
              name="date"
              type="date"
              defaultValue={expense.date ?? ""}
              className="w-full rounded-lg border border-navy/20 bg-white px-2 py-1.5 text-sm text-navy outline-none focus:border-gold focus:ring-2 focus:ring-gold/30"
            />
          </label>
          <label className="min-w-0 flex-1 basis-32">
            <span className="mb-1 block text-xs font-medium text-navy/70">
              Replace receipt <span className="font-normal text-navy/40">(optional)</span>
            </span>
            <input
              name="receipt"
              type="file"
              accept="image/*,application/pdf"
              className="w-full rounded-lg border border-navy/20 bg-white px-2 py-1 text-xs text-navy outline-none"
            />
          </label>
          <SubmitButton pendingText="Saving..." className="w-auto px-3 py-1.5 text-xs">
            Save
          </SubmitButton>
          <button type="button" onClick={() => setEditing(false)} className="text-xs font-semibold text-navy/50 hover:text-navy">
            Cancel
          </button>
          {state.error && <p className="w-full text-xs text-red-600">{state.error}</p>}
        </form>
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between text-sm">
      <span className="text-navy/80">
        {expense.description}
        {expense.date && <span className="ml-2 text-xs text-navy/40">{formatExpenseDate(expense.date)}</span>}
        {expense.has_attachment && (
          <a
            href={`/api/expenses/${expense.id}/attachment`}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-2 text-xs font-semibold text-navy/50 hover:text-gold"
            title="View attached receipt"
          >
            📎 Receipt
          </a>
        )}
      </span>
      <span className="flex items-center gap-3">
        <span className="font-medium text-navy">AED {formatMoney(expense.amount)}</span>
        <button type="button" onClick={() => setEditing(true)} className="text-xs font-semibold text-navy/50 hover:text-navy">
          Edit
        </button>
        <DeleteExpenseButton expenseId={expense.id} />
      </span>
    </li>
  );
}
