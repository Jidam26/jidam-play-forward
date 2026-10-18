import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/session";
import { getExpenseAttachment } from "@/lib/repositories/expenses";

/** Admin-only: serves an expense's attached receipt/invoice photo or PDF. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const attachment = await getExpenseAttachment(id);
  if (!attachment) return new NextResponse("Not found", { status: 404 });

  return new NextResponse(new Uint8Array(attachment.data), {
    headers: {
      "Content-Type": attachment.contentType,
      "Content-Disposition": `inline; filename="${attachment.filename.replace(/"/g, "")}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
