import { Resend } from "resend";
import { formatTimeRange } from "@/lib/time";

// ---------------------------------------------------------------------------
// Transactional email via Resend (resend.com). Two env vars control it:
//
//   RESEND_API_KEY  -- from your Resend dashboard. Without it, sendEmail()
//                      logs a warning and does nothing (never throws) --
//                      the app works fully without email configured, it
//                      just won't actually send anything.
//   EMAIL_FROM      -- e.g. "Jidam <noreply@jidam.ae>". Until you've added
//                      and verified a domain in Resend, leave this unset
//                      and it falls back to Resend's shared sandbox address,
//                      which can only send to the email you signed up with
//                      -- fine for testing, not for real members.
// ---------------------------------------------------------------------------

const DEFAULT_FROM = "Jidam <onboarding@resend.dev>";

let client: Resend | null | undefined;

function getClient(): Resend | null {
  if (client === undefined) {
    const apiKey = process.env.RESEND_API_KEY;
    client = apiKey ? new Resend(apiKey) : null;
  }
  return client;
}

export type EmailAttachment = { filename: string; content: Buffer };

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  attachments?: EmailAttachment[]
): Promise<void> {
  const resend = getClient();
  if (!resend) {
    // No key configured yet -- log enough to still test the flow (e.g. a
    // password reset link) by reading server/function logs.
    const links = [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
    console.warn(
      `[email] RESEND_API_KEY not set -- skipping email "${subject}" to ${to}` +
        (links.length ? `. Link(s): ${links.join(", ")}` : "")
    );
    return;
  }

  try {
    const { error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || DEFAULT_FROM,
      to,
      subject,
      html,
      attachments,
    });
    if (error) console.error(`[email] Resend rejected "${subject}" to ${to}:`, error);
  } catch (err) {
    // Email is never allowed to break the action that triggered it (a
    // booking, a password reset request) -- log and move on.
    console.error(`[email] failed to send "${subject}" to ${to}:`, err);
  }
}

function emailShell(bodyHtml: string): string {
  return `
    <div style="font-family: -apple-system, Segoe UI, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto;">
      <div style="background:#0a1f44; padding:24px; text-align:center; border-radius:12px 12px 0 0;">
        <span style="font-size:24px; font-weight:800; color:#fafaf8;">JID<span style="color:#b8860b;">AM</span></span>
      </div>
      <div style="background:#ffffff; padding:24px; border-radius:0 0 12px 12px; color:#1c1f26;">
        ${bodyHtml}
      </div>
    </div>
  `;
}

export function passwordResetEmail(resetUrl: string): { subject: string; html: string } {
  return {
    subject: "Reset your Jidam password",
    html: emailShell(`
      <p>We got a request to reset your Jidam password.</p>
      <p style="text-align:center; margin:24px 0;">
        <a href="${resetUrl}" style="background:#b8860b; color:#0a1f44; font-weight:700; padding:12px 24px; border-radius:8px; text-decoration:none; display:inline-block;">
          Reset Password
        </a>
      </p>
      <p style="color:#5b6472; font-size:14px;">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
    `),
  };
}

export function waitlistPromotionEmail(params: {
  sport: string;
  date: string;
  time: string;
  end_time: string | null;
  venue: string;
}): { subject: string; html: string } {
  const formattedDate = new Date(`${params.date}T00:00:00`).toLocaleDateString("en-AE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return {
    subject: `A spot opened up! You're in for ${params.sport}`,
    html: emailShell(`
      <p>Good news — a spot opened up and you were next on the waitlist, so you're confirmed!</p>
      <table style="width:100%; margin:16px 0; font-size:15px;">
        <tr><td style="color:#5b6472; padding:4px 0;">Sport</td><td style="font-weight:600;">${params.sport}</td></tr>
        <tr><td style="color:#5b6472; padding:4px 0;">Date</td><td style="font-weight:600;">${formattedDate}</td></tr>
        <tr><td style="color:#5b6472; padding:4px 0;">Time</td><td style="font-weight:600;">${formatTimeRange(params.time, params.end_time)}</td></tr>
        <tr><td style="color:#5b6472; padding:4px 0;">Venue</td><td style="font-weight:600;">${params.venue}</td></tr>
      </table>
      <p style="color:#5b6472; font-size:14px;">You can view or manage your bookings any time under "My Bookings" on Jidam.</p>
    `),
  };
}

export function bookingConfirmationEmail(params: {
  sport: string;
  date: string;
  time: string;
  end_time: string | null;
  venue: string;
}): { subject: string; html: string } {
  const formattedDate = new Date(`${params.date}T00:00:00`).toLocaleDateString("en-AE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return {
    subject: `You're in! ${params.sport} on ${formattedDate}`,
    html: emailShell(`
      <p>Your spot is reserved. See you on the field!</p>
      <table style="width:100%; margin:16px 0; font-size:15px;">
        <tr><td style="color:#5b6472; padding:4px 0;">Sport</td><td style="font-weight:600;">${params.sport}</td></tr>
        <tr><td style="color:#5b6472; padding:4px 0;">Date</td><td style="font-weight:600;">${formattedDate}</td></tr>
        <tr><td style="color:#5b6472; padding:4px 0;">Time</td><td style="font-weight:600;">${formatTimeRange(params.time, params.end_time)}</td></tr>
        <tr><td style="color:#5b6472; padding:4px 0;">Venue</td><td style="font-weight:600;">${params.venue}</td></tr>
      </table>
      <p style="color:#5b6472; font-size:14px;">You can view or manage your bookings any time under "My Bookings" on Jidam.</p>
    `),
  };
}

/** Sent alongside the PDF attachment the moment a payment is confirmed -- see repositories/receipts.ts. */
export function receiptEmail(params: { receiptNumber: string; description: string; amountAed: number }): {
  subject: string;
  html: string;
} {
  return {
    subject: `Receipt ${params.receiptNumber} — Jidam`,
    html: emailShell(`
      <p>Thanks for your payment! Your receipt is attached as a PDF for your records.</p>
      <table style="width:100%; margin:16px 0; font-size:15px;">
        <tr><td style="color:#5b6472; padding:4px 0;">Receipt No.</td><td style="font-weight:600;">${params.receiptNumber}</td></tr>
        <tr><td style="color:#5b6472; padding:4px 0;">For</td><td style="font-weight:600;">${params.description}</td></tr>
        <tr><td style="color:#5b6472; padding:4px 0;">Amount</td><td style="font-weight:600;">AED ${params.amountAed.toFixed(2)}</td></tr>
      </table>
    `),
  };
}
