import { createHash } from "node:crypto";
import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { getPool, hasDatabase } from "@/lib/db";

/**
 * One-click "report adopted" (ghost-listing trust loop). One report per
 * fingerprint per pet; REPORT_THRESHOLD distinct open reports suppress the
 * pet from search and raise an operator alert. Sources often lag reality —
 * that's exactly why this channel exists — so suppression stands until an
 * operator resolves it or the source updates the listing.
 */

const REPORT_THRESHOLD = 3;

function fingerprint(request: NextRequest, petId: string): string {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "local";
  const ua = request.headers.get("user-agent") ?? "";
  const salt = process.env.REVALIDATE_SECRET ?? "";
  return createHash("sha256").update(`${ip}|${ua}|${petId}|${salt}`).digest("hex");
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!hasDatabase()) {
    // Demo mode: acknowledge without persistence so the UX is exercisable.
    return NextResponse.json({ ok: true, demo: true });
  }

  const pool = getPool();
  const { rowCount: petExists } = await pool.query("SELECT 1 FROM pets WHERE id = $1", [id]);
  if (!petExists) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  await pool.query(
    `INSERT INTO pet_reports (pet_id, fingerprint) VALUES ($1, $2)
     ON CONFLICT (pet_id, fingerprint) DO NOTHING`,
    [id, fingerprint(request, id)],
  );

  const { rows } = await pool.query<{ n: string }>(
    "SELECT count(*) AS n FROM pet_reports WHERE pet_id = $1 AND resolved_at IS NULL",
    [id],
  );
  const reports = Number(rows[0]?.n ?? 0);

  if (reports >= REPORT_THRESHOLD) {
    const { rowCount: suppressed } = await pool.query(
      `UPDATE pets SET status = 'removed', status_computed_at = now(), updated_at = now()
       WHERE id = $1 AND status <> 'removed'`,
      [id],
    );
    if (suppressed) {
      await pool.query(
        `INSERT INTO ops_alerts (kind, source, detail)
         SELECT 'user_reports', NULL, $1::jsonb
         WHERE NOT EXISTS (
           SELECT 1 FROM ops_alerts
           WHERE kind = 'user_reports' AND detail->>'petId' = $2 AND resolved_at IS NULL
         )`,
        [JSON.stringify({ petId: id, reports }), id],
      );
      revalidateTag("pets");
      revalidateTag(`pet:${id}`);
    }
  }

  return NextResponse.json({ ok: true, reports });
}
