// ---------------------------------------------------------------------------
// Contact info shown to members for confirming a payment made outside the
// app (via an ADCB Pace Pay link). There's no API/webhook for Pace Pay, so
// confirmation is manual: the payer sends a screenshot on WhatsApp, and an
// admin reviews it and clicks "Mark as Paid" in the Admin Dashboard.
//
// TODO: replace with your real WhatsApp number before going live. Use
// international format, digits only, no "+", spaces, or leading zeros
// (e.g. a UAE number 050 123 4567 becomes "971501234567").
// ---------------------------------------------------------------------------
export const PAYMENT_WHATSAPP_NUMBER = "971500000000"; // <-- PLACEHOLDER, replace me

export function paymentWhatsAppLink(message: string): string {
  return `https://wa.me/${PAYMENT_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

/**
 * The site's own public URL, for building links inside emails (password
 * reset, etc). Netlify sets URL automatically for every deploy; falls back
 * to localhost for `npm run dev`.
 */
export function getSiteUrl(): string {
  return process.env.URL || "http://localhost:3000";
}
