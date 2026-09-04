import { requireSession } from "@/lib/session";
import Link from "next/link";
import { listBookingsForUser } from "@/lib/repositories/bookings";
import { listWaitlistForUser } from "@/lib/repositories/waitlist";
import { getCreditBalances, getActiveSubscriptions } from "@/lib/repositories/planPurchases";
import { NavBar } from "@/components/NavBar";
import { SportBadge } from "@/components/SportBadge";
import { PaymentInstructions } from "@/components/PaymentInstructions";
import { CancelBookingButton } from "@/components/CancelBookingButton";
import { leaveWaitlistAction } from "@/lib/actions/bookings";
import { formatTimeRange } from "@/lib/time";

function formatDate(dateStr: string) {
  const date = new Date(`${dateStr}T00:00:00`);
  return date.toLocaleDateString("en-AE", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

export default async function BookingsPage() {
  const session = await requireSession();
  const bookings = await listBookingsForUser(session.id);
  const waitlistEntries = await listWaitlistForUser(session.id);
  const creditBalances = await getCreditBalances(session.id);
  const activeSubscriptions = await getActiveSubscriptions(session.id);

  return (
    <>
      <NavBar session={session} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-extrabold text-navy">My Bookings</h1>
          <Link href="/plans" className="text-sm font-semibold text-navy hover:text-gold">
            View Game Credit Plans &rarr;
          </Link>
        </div>

        {(creditBalances.size > 0 || activeSubscriptions.size > 0) && (
          <div className="mt-4 flex flex-wrap gap-3">
            {[...creditBalances.entries()].map(([sport, balance]) => (
              <div key={sport} className="rounded-2xl border border-navy/10 bg-white px-5 py-3 shadow-sm">
                <SportBadge sport={sport} />
                <p className="mt-1 text-lg font-extrabold text-navy">{balance} credit{balance === 1 ? "" : "s"}</p>
              </div>
            ))}
            {[...activeSubscriptions.entries()].map(([sport, validUntil]) => (
              <div key={sport} className="rounded-2xl border border-navy/10 bg-white px-5 py-3 shadow-sm">
                <SportBadge sport={sport} />
                <p className="mt-1 text-sm font-semibold text-navy">
                  Subscribed until{" "}
                  {new Date(`${validUntil}T00:00:00`).toLocaleDateString("en-AE", { day: "numeric", month: "short" })}
                </p>
              </div>
            ))}
          </div>
        )}

        {bookings.length === 0 ? (
          <p className="mt-10 text-center text-navy/50">
            You haven&apos;t reserved any games yet — head to Upcoming Games to grab a spot.
          </p>
        ) : (
          <div className="mt-6 space-y-3">
            {bookings.map((b) => (
              <div key={b.id} className="rounded-2xl border border-navy/10 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <SportBadge sport={b.sport} />
                    <p className="mt-2 font-bold text-navy">
                      {formatDate(b.date)} &middot; {formatTimeRange(b.time, b.end_time)}
                    </p>
                    <p className="text-sm text-navy/70">{b.venue}</p>
                  </div>
                  <div className="flex flex-col items-start gap-2 sm:items-end">
                    <span
                      className={`inline-block w-fit rounded-full px-3 py-1 text-xs font-semibold ${
                        b.payment_status === "paid" ? "bg-green-100 text-green-800" : "bg-gold/15 text-navy"
                      }`}
                    >
                      {b.payment_status === "paid"
                        ? b.paid_via_credit
                          ? "Paid with credit"
                          : b.paid_via_subscription
                            ? "Paid with subscription"
                            : "Paid"
                        : "Reserved · payment pending"}
                    </span>
                    <CancelBookingButton bookingId={b.id} />
                  </div>
                </div>

                {b.payment_status !== "paid" && (
                  <div className="mt-4">
                    <PaymentInstructions paymentLink={b.payment_link} gameLabel={`${b.sport} on ${formatDate(b.date)}`} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {waitlistEntries.length > 0 && (
          <>
            <h2 className="mt-10 text-xl font-extrabold text-navy">My Waitlist</h2>
            <div className="mt-4 space-y-3">
              {waitlistEntries.map((w) => (
                <div
                  key={w.id}
                  className="flex flex-col gap-3 rounded-2xl border border-navy/10 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <SportBadge sport={w.sport} />
                    <p className="mt-2 font-bold text-navy">
                      {formatDate(w.date)} &middot; {formatTimeRange(w.time, w.end_time)}
                    </p>
                    <p className="text-sm text-navy/70">{w.venue}</p>
                  </div>
                  <div className="flex flex-col items-start gap-2 sm:items-end">
                    <span className="inline-block w-fit rounded-full bg-gold/15 px-3 py-1 text-xs font-semibold text-navy">
                      #{w.position} on waitlist
                    </span>
                    <form action={leaveWaitlistAction.bind(null, w.game_id)}>
                      <button type="submit" className="text-xs font-semibold text-navy/50 hover:text-navy">
                        Leave waitlist
                      </button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </>
  );
}
