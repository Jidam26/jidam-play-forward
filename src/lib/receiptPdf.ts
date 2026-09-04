import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Receipt, BusinessSettings } from "@/lib/repositories/receipts";

const NAVY = rgb(0x0a / 255, 0x1f / 255, 0x44 / 255);
const GOLD = rgb(0xb8 / 255, 0x86 / 255, 0x0b / 255);
const GREY = rgb(0x5b / 255, 0x64 / 255, 0x72 / 255);

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-AE", { day: "numeric", month: "short", year: "numeric" });
}

/**
 * Renders a receipt as a single-page A5-ish PDF -- a plain "Payment
 * Receipt", never a "Tax Invoice" (see business.trn comment below), since
 * this business is Corporate-Tax-registered only, not VAT-registered.
 */
export async function renderReceiptPdf(receipt: Receipt, business: BusinessSettings): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([420, 560]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  let logoDims = { width: 0, height: 0 };
  let logoImage;
  try {
    const logoBytes = await readFile(path.join(process.cwd(), "public", "jidam-badge.jpg"));
    logoImage = await doc.embedJpg(logoBytes);
    logoDims = logoImage.scale(40 / logoImage.width);
  } catch {
    // Missing logo file shouldn't ever block issuing a receipt.
  }

  let y = 520;
  if (logoImage) {
    page.drawImage(logoImage, { x: 40, y: y - logoDims.height, width: logoDims.width, height: logoDims.height });
  }

  // Arabic text is left off the PDF -- pdf-lib's standard fonts only
  // support WinAnsi encoding (Latin), and embedding a full Arabic font just
  // for one line isn't worth the added weight. The Arabic name still shows
  // everywhere it renders as real HTML (the receipt email, the site itself).
  const textX = logoImage ? 40 + logoDims.width + 12 : 40;
  page.drawText(business.trade_name_en, { x: textX, y: y - 16, size: 12, font: bold, color: NAVY });
  y -= 60;

  page.drawText("PAYMENT RECEIPT", { x: 40, y, size: 10, font: bold, color: GOLD });
  page.drawText("Not a tax invoice — no VAT applicable", { x: 40, y: y - 14, size: 8, font, color: GREY });
  y -= 40;

  page.drawLine({ start: { x: 40, y }, end: { x: 380, y }, thickness: 0.5, color: GREY });
  y -= 20;

  const row = (label: string, value: string) => {
    page.drawText(label, { x: 40, y, size: 10, font, color: GREY });
    page.drawText(value, { x: 160, y, size: 10, font: bold, color: NAVY });
    y -= 20;
  };
  row("Receipt No.", receipt.receipt_number);
  row("Date", formatDate(receipt.created_at));
  row("Received from", receipt.member_name);
  y -= 10;

  page.drawText("Description", { x: 40, y, size: 9, font: bold, color: GREY });
  page.drawText("Amount (AED)", { x: 300, y, size: 9, font: bold, color: GREY });
  y -= 16;
  page.drawLine({ start: { x: 40, y }, end: { x: 380, y }, thickness: 0.5, color: GREY });
  y -= 18;
  page.drawText(receipt.description, { x: 40, y, size: 10, font, color: NAVY, maxWidth: 240 });
  page.drawText(receipt.amount_aed.toFixed(2), { x: 300, y, size: 10, font, color: NAVY });
  y -= 30;

  page.drawLine({ start: { x: 40, y }, end: { x: 380, y }, thickness: 1, color: NAVY });
  y -= 20;
  page.drawText("Total received", { x: 40, y, size: 11, font: bold, color: NAVY });
  page.drawText(`AED ${receipt.amount_aed.toFixed(2)}`, { x: 280, y, size: 13, font: bold, color: NAVY });
  y -= 50;

  const registrationLine = business.trn
    ? `${business.trade_name_en} is registered for UAE Corporate Tax, TRN ${business.trn}.`
    : `${business.trade_name_en} is registered for UAE Corporate Tax (TRN pending).`;
  page.drawText(registrationLine, {
    x: 40,
    y,
    size: 8,
    font,
    color: GREY,
    maxWidth: 340,
  });
  y -= 12;
  page.drawText("This business is not VAT-registered — no VAT is charged or included above.", {
    x: 40,
    y,
    size: 8,
    font,
    color: GREY,
    maxWidth: 340,
  });

  return doc.save();
}
