"use client";

import { reviewFlagAction } from "@/lib/actions/conduct";
import type { FlaggedMember } from "@/lib/repositories/conduct";

/**
 * Members who've hit 3+ open late-cancellation warnings or have an
 * unreviewed no-show -- see the "⚠️ Important – Football Rules" policy.
 * "Remove from Football" and "Dismiss" both clear the flag; which one an
 * admin picks is just a record of what they decided to do about it.
 */
export function FlaggedMembersSection({ members }: { members: FlaggedMember[] }) {
  if (members.length === 0) return null;

  return (
    <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-5">
      <h2 className="font-bold text-amber-900">⚠️ Flagged for Review</h2>
      <p className="mt-1 text-xs text-amber-700">
        3+ open late-cancellation warnings, or an unreviewed no-show. This is a flag for you -- the app doesn't
        automatically remove anyone from Football.
      </p>
      <ul className="mt-3 space-y-2">
        {members.map((m) => (
          <li key={m.user_id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 text-sm">
            <div>
              <p className="font-semibold text-navy">{m.name}</p>
              <p className="text-xs text-navy/50">
                {m.email} · {m.warning_count} warning{m.warning_count === 1 ? "" : "s"}
                {m.has_no_show && " · No-show"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <form
                action={reviewFlagAction.bind(null, m.user_id, m.name, "removed")}
                onSubmit={(e) => {
                  if (!confirm(`Mark ${m.name} as removed from Football? This just clears the flag here -- you'll still need to let them know yourself.`)) {
                    e.preventDefault();
                  }
                }}
              >
                <button type="submit" className="rounded-full border border-red-300 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50">
                  Remove from Football
                </button>
              </form>
              <form action={reviewFlagAction.bind(null, m.user_id, m.name, "dismissed")}>
                <button type="submit" className="rounded-full border border-navy/20 px-3 py-1 text-xs font-semibold text-navy hover:bg-navy/5">
                  Dismiss
                </button>
              </form>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
