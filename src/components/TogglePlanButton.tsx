"use client";

import { setPlanActiveAction } from "@/lib/actions/plans";

export function TogglePlanButton({ planId, active }: { planId: string; active: boolean }) {
  return (
    <form action={setPlanActiveAction.bind(null, planId, !active)}>
      <button
        type="submit"
        className={`rounded-full border px-3 py-1 text-xs font-semibold ${
          active ? "border-red-300 text-red-600 hover:bg-red-50" : "border-navy/20 text-navy hover:bg-navy/5"
        }`}
      >
        {active ? "Retire" : "Restore"}
      </button>
    </form>
  );
}
