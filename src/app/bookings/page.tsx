import { requireSession } from "@/lib/session";
import { listBookingsForUser } from "@/lib/repositories/bookings";
import { NavBar } from "@/components/NavBar";
import { SportBadge } from "@/components/SportBadge";

function formatDate(dateStr: string) {
  const date = new Date(`${dateStr}T00:00:00`);
  return date.toLocaleDateString("en-AE", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

export default async function BookingsPage() {
  const session = await requireSession();
  const bookings = await listBookingsForUser(session.id);

  return (
    <>
      <NavBar session={session} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <h1 className="text-2xl font-bold text-navy">My Bookings</h1>

        {bookings.length === 0 ? (
          <p className="mt-10 text-center text-navy/50">
            You haven&apos;t reserved any games yet — head to Upcoming Games to grab a spot.
          </p>
        ) : (
          <div className="mt-6 space-y-3">
            {bookings.map((b) => (
              <div
                key={b.id}
                className="flex flex-col gap-3 rounded-2xl border border-navy/10 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <SportBadge sport={b.sport} />
                  <p className="mt-2 font-bold text-navy">
                    {formatDate(b.date)} &middot; {b.time}
                  </p>
                  <p className="text-sm text-navy/70">{b.venue}</p>
                </div>
                <span
                  className={`inline-block w-fit rounded-full px-3 py-1 text-xs font-semibold ${
                    b.payment_status === "paid" ? "bg-green-100 text-green-800" : "bg-gold/15 text-navy"
                  }`}
                >
                  {b.payment_status === "paid" ? "Paid" : "Reserved · payment pending"}
                </span>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
