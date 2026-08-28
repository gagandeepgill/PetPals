import { NextRequest, NextResponse } from "next/server";
import { parseSearchParams } from "@/lib/domain/search";
import { searchPets } from "@/lib/pets";

export async function GET(request: NextRequest) {
  const params: Record<string, string | string[]> = {};
  for (const key of request.nextUrl.searchParams.keys()) {
    const values = request.nextUrl.searchParams.getAll(key);
    params[key] = values.length === 1 ? values[0]! : values;
  }
  const response = await searchPets(parseSearchParams(params));
  return NextResponse.json(response, {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
  });
}
