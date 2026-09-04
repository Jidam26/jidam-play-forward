import { issueReceipt, getBusinessSettings, type Receipt } from "@/lib/repositories/receipts";
import { renderReceiptPdf } from "@/lib/receiptPdf";
import { sendEmail, receiptEmail } from "@/lib/email";

export type IssueAndEmailReceiptInput = {
  /** Null for a walk-in -- still gets a permanent ledger entry, just no email (no address to send to). */
  userId: string | null;
  memberName: string;
  memberEmail: string | null;
  description: string;
  amountAed: number;
  source: "booking" | "plan_purchase";
  sourceId: string;
};

/**
 * Issues a permanent receipt for a real payment and, if there's an email on
 * file, sends it as a PDF attachment. Called from markPaidAction,
 * confirmPlanPurchaseAction, and issueCreditsAction -- every place money
 * actually gets marked as received. Skips entirely for a zero-amount
 * transaction (a comp/free credit) -- there's nothing to receipt.
 */
export async function issueAndEmailReceipt(input: IssueAndEmailReceiptInput): Promise<Receipt | null> {
  if (input.amountAed <= 0) return null;

  const receipt = await issueReceipt({
    userId: input.userId,
    memberName: input.memberName,
    memberEmail: input.memberEmail,
    description: input.description,
    amountAed: input.amountAed,
    source: input.source,
    sourceId: input.sourceId,
  });

  if (input.memberEmail) {
    const business = await getBusinessSettings();
    const pdfBytes = await renderReceiptPdf(receipt, business);
    const { subject, html } = receiptEmail({
      receiptNumber: receipt.receipt_number,
      description: receipt.description,
      amountAed: receipt.amount_aed,
    });
    await sendEmail(input.memberEmail, subject, html, [
      { filename: `${receipt.receipt_number}.pdf`, content: Buffer.from(pdfBytes) },
    ]);
  }

  return receipt;
}
