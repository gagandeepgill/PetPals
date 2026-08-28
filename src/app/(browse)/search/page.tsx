import type { Metadata } from "next";
import { Container, PageTitle } from "@/components/ui/primitives";
import { parseSearchParams } from "@/lib/domain/search";
import { searchPets } from "@/lib/pets";
import { FilterBar } from "./_components/FilterBar";
import { ResultsGrid } from "./_components/ResultsGrid";

export const metadata: Metadata = { title: "Search adoptable pets" };

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function SearchPage({ searchParams }: Props) {
  const params = await searchParams;
  const filter = parseSearchParams(params);
  const response = await searchPets(filter);

  let nextHref: string | null = null;
  if (response.nextCursor) {
    const next = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (key === "cursor" || value === undefined) continue;
      for (const v of Array.isArray(value) ? value : [value]) next.append(key, v);
    }
    next.set("cursor", response.nextCursor);
    nextHref = `/search?${next.toString()}`;
  }

  return (
    <Container>
      <div style={{ padding: "32px 0 0" }}>
        <PageTitle>Find your pet</PageTitle>
      </div>
      <FilterBar />
      <ResultsGrid response={response} nextHref={nextHref} />
    </Container>
  );
}
