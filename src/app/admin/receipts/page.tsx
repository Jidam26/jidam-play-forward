import Link from "next/link";
import { requireAdmin } from "@/lib/session";
import { listReceipts } from "@/lib/repositories/receipts";
import { formatMoney } from "@/lib/money";
import { NavBar } from "@/components/NavBar";

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-AE", { dateStyle: "medium", timeStyle: "short" });
}

export default async function ReceiptsPage() {
  const session = await requireAdmin();
  const receipts = await listReceipts();
  const total = receipts.reduce((sum, r) => sum + r.amount_aed, 0);

  return (
    <>
      <NavBar session={session} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold text-navy">Receipts</h1>
            <p className="mt-1 text-sm text-navy/60">
              Every payment receipt ever issued -- permanent, even if the booking behind it is later deleted.
            </p>
          </div>
          <Link href="/admin" className="text-sm font-semibold text-navy hover:text-gold">
            &larr; Back to Dashboard
          </Link>
        </div>

        <div className="mt-6 rounded-2xl border border-navy/10 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-navy/50">Total Receipted</p>
          <p className="mt-1 text-2xl font-extrabold text-navy">AED {formatMoney(total)}</p>
        </div>

        {receipts.length === 0 ? (
          <p className="mt-10 text-center text-navy/50">No receipts issued yet.</p>
        ) : (
          <div className="mt-6 overflow-x-auto rounded-2xl border border-navy/10 bg-white shadow-sm">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-navy/10 text-navy/50">
                  <th className="px-4 py-3 font-medium">Receipt No.</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">From</th>
                  <th className="px-4 py-3 font-medium">For</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {receipts.map((r) => (
                  <tr key={r.id} className="border-b border-navy/5 last:border-0">
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-navy">{r.receipt_number}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-navy/70">{formatDateTime(r.created_at)}</td>
                    <td className="px-4 py-3 text-navy">{r.member_name}</td>
                    <td className="px-4 py-3 text-navy/70">{r.description}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-navy">AED {formatMoney(r.amount_aed)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
  );
}
