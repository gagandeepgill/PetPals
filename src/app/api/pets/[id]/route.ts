import { NextRequest, NextResponse } from "next/server";
import { getPetById } from "@/lib/pets";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const pet = await getPetById(id);
  if (!pet) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json(pet, {
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
  });
}
