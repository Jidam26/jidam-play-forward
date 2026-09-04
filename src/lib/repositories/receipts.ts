import { getPool, ensureDb } from "@/lib/db";
import { randomUUID } from "node:crypto";

export type Receipt = {
  id: string;
  receipt_number: string;
  user_id: string | null;
  member_name: string;
  member_email: string | null;
  description: string;
  amount_aed: number;
  source: "booking" | "plan_purchase";
  source_id: string | null;
  created_at: string;
};

export type IssueReceiptInput = {
  userId: string | null;
  memberName: string;
  memberEmail: string | null;
  description: string;
  amountAed: number;
  source: "booking" | "plan_purchase";
  sourceId: string;
};

/**
 * Issues a new, permanently-numbered receipt -- see the comment on the
 * receipts table in src/lib/db.ts for why this never references its
 * source row as a foreign key.
 */
export async function issueReceipt(input: IssueReceiptInput): Promise<Receipt> {
  await ensureDb();
  const pool = getPool();
  const seqRes = await pool.query<{ n: string }>("SELECT nextval('receipt_number_seq') as n");
  const receiptNumber = `JS-${new Date().getFullYear()}-${String(seqRes.rows[0].n).padStart(4, "0")}`;
  const { rows } = await pool.query<Receipt>(
    `INSERT INTO receipts (id, receipt_number, user_id, member_name, member_email, description, amount_aed, source, source_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
    [
      randomUUID(),
      receiptNumber,
      input.userId,
      input.memberName,
      input.memberEmail,
      input.description,
      input.amountAed,
      input.source,
      input.sourceId,
    ]
  );
  return rows[0];
}

/** Admin-only: every receipt ever issued, newest first -- the permanent ledger. */
export async function listReceipts(limit = 500): Promise<Receipt[]> {
  await ensureDb();
  const { rows } = await getPool().query<Receipt>(
    "SELECT * FROM receipts ORDER BY created_at DESC LIMIT $1",
    [limit]
  );
  return rows;
}

export async function findReceiptById(id: string): Promise<Receipt | undefined> {
  await ensureDb();
  const { rows } = await getPool().query<Receipt>("SELECT * FROM receipts WHERE id = $1", [id]);
  return rows[0];
}

export type BusinessSettings = {
  id: string;
  trade_name_en: string;
  trade_name_ar: string;
  trn: string | null;
  address: string | null;
};

/** The one row of business details printed on every receipt -- see src/lib/db.ts, seeded with defaults on first migration. */
export async function getBusinessSettings(): Promise<BusinessSettings> {
  await ensureDb();
  const { rows } = await getPool().query<BusinessSettings>("SELECT * FROM business_settings WHERE id = 'default'");
  return (
    rows[0] ?? {
      id: "default",
      trade_name_en: "JIDAM SPORTS SERVICES — L.L.C",
      trade_name_ar: "جدام للخدمات الرياضية - ذ.م.م",
      trn: null,
      address: null,
    }
  );
}

export async function updateBusinessSettings(input: {
  trade_name_en: string;
  trade_name_ar: string;
  trn: string | null;
  address: string | null;
}): Promise<void> {
  await ensureDb();
  await getPool().query(
    `UPDATE business_settings SET trade_name_en = $1, trade_name_ar = $2, trn = $3, address = $4 WHERE id = 'default'`,
    [input.trade_name_en, input.trade_name_ar, input.trn, input.address]
  );
}
