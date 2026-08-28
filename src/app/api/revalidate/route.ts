import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const BodySchema = z.object({ tags: z.string().min(1).max(100).array().min(1).max(500) });

/**
 * Called by the ingestion pipeline when pet statuses change, so adopted pets
 * fall out of cached pages in seconds instead of the 24h ISR window.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.REVALIDATE_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "expected { tags: string[] }" }, { status: 400 });
  }

  for (const tag of parsed.data.tags) {
    revalidateTag(tag);
  }
  return NextResponse.json({ revalidated: parsed.data.tags.length });
}
