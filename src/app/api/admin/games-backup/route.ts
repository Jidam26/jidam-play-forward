import { NextResponse } from "next/server";
import { requireBoss } from "@/lib/session";
import { buildGamesBackupExport } from "@/lib/repositories/reset";

/**
 * Boss-only: downloads a full JSON snapshot of every game, booking, game
 * expense, waitlist entry, and receipt -- meant to be grabbed right before
 * running the "Reset All Games" fresh-start wipe (see resetAllGamesDataAction),
 * since that wipe has no undo.
 */
export async function GET() {
  await requireBoss();
  const data = await buildGamesBackupExport();
  const filename = `jidam-games-backup-${new Date().toISOString().slice(0, 10)}.json`;

  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
