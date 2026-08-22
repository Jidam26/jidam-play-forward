import { paymentWhatsAppLink } from "@/lib/config";

/**
 * Shown for a booking that's reserved but not yet paid. There's no payment
 * webhook (see src/lib/config.ts), so this walks the member through the
 * manual flow: pay via the organizer's link, then WhatsApp a screenshot.
 */
export function PaymentInstructions({
  paymentLink,
  gameLabel,
}: {
  paymentLink: string | null;
  gameLabel: string;
}) {
  if (!paymentLink) return null;

  const whatsappHref = paymentWhatsAppLink(
    `Hi! I just paid for ${gameLabel}. Here's my payment screenshot to confirm my spot.`
  );

  return (
    <div className="space-y-2 rounded-lg border border-gold/30 bg-gold/10 p-3 text-sm text-navy">
      <p className="font-semibold">Complete your payment to confirm your spot:</p>
      <a
        href={paymentLink}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full rounded-lg bg-navy px-4 py-2.5 text-center font-semibold text-offwhite transition hover:bg-navy-light"
      >
        Pay Now
      </a>
      <p className="text-navy/70">
        After paying, send a screenshot of your payment on{" "}
        <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="font-semibold underline">
          WhatsApp
        </a>{" "}
        so we can confirm it.
      </p>
    </div>
  );
}
