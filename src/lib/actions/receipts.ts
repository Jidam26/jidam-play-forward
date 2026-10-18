"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/session";
import { voidReceipt, findReceiptById } from "@/lib/repositories/receipts";
import { logActivity } from "@/lib/repositories/activity";

/**
 * Admin-only: void a receipt -- it stays in the permanent ledger (never
 * deleted) but is marked cancelled so it's excluded from the Receipts
 * page total. Bound to `.bind(null, receiptId)`.
 */
export async function voidReceiptAction(receiptId: string): Promise<void> {
  const session = await requireAdmin();
  const receipt = await findReceiptById(receiptId);
  await voidReceipt(receiptId);
  if (receipt) {
    await logActivity(session.id, "receipt_voided", `Voided receipt ${receipt.receipt_number} (AED ${receipt.amount_aed}, ${receipt.member_name})`);
  }
  revalidatePath("/admin/receipts");
}
