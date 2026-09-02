"use client";

import { deleteAttendeeAction } from "@/lib/actions/bookings";

export function DeleteAttendeeButton({
  bookingId,
  attendeeName,
  gameLabel,
  gameId,
}: {
  bookingId: string;
  attendeeName: string;
  gameLabel: string;
  gameId: string;
}) {
  return (
    <form
      action={deleteAttendeeAction.bind(null, bookingId, attendeeName, gameLabel, gameId)}
      onSubmit={(e) => {
        if (!confirm(`Permanently delete ${attendeeName} from this game? This can't be undone.`)) {
          e.preventDefault();
        }
      }}
    >
      <button type="submit" className="rounded-full border border-red-300 px-2 py-0.5 text-xs font-semibold text-red-600 hover:bg-red-50">
        Delete
      </button>
    </form>
  );
}
