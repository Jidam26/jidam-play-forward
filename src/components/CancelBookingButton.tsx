"use client";

import { cancelBookingAction } from "@/lib/actions/bookings";

export function CancelBookingButton({ bookingId }: { bookingId: string }) {
  return (
    <form
      action={cancelBookingAction.bind(null, bookingId)}
      onSubmit={(e) => {
        if (!confirm("Cancel your spot in this game? If anyone's on the waitlist, it'll go to them next.")) {
          e.preventDefault();
        }
      }}
    >
      <button
        type="submit"
        className="rounded-full border border-red-300 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
      >
        Cancel my spot
      </button>
    </form>
  );
}
