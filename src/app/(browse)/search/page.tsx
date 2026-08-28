import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import type { Metadata } from "next";
import Link from "next/link";
import { Container, Muted, PageTitle } from "@/components/ui/primitives";
import { parseSearchParams } from "@/lib/domain/search";
import { searchPets } from "@/lib/pets";
import { petKeys } from "@/lib/query-keys";
import { FilterBar } from "./_components/FilterBar";
import { SearchView } from "./_components/SearchView";

export const metadata: Metadata = { title: "Search adoptable pets" };

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function SearchPage({ searchParams }: Props) {
  const params = await searchParams;
  const filter = parseSearchParams(params);

  // Page 1 is server-fetched (crawlable HTML) and handed to the client cache
  // via hydration — zero double-fetch; refinement is client-side from there.
  const queryClient = new QueryClient();
  await queryClient.prefetchInfiniteQuery({
    queryKey: petKeys.search(filter),
    // Strip any URL-carried cursor: the key is cursor-free, so page 1 must be too.
    queryFn: () => searchPets({ ...filter, cursor: undefined }),
    initialPageParam: null as string | null,
  });

  return (
    <Container>
      <div style={{ padding: "32px 0 0" }}>
        <PageTitle>Find your pet</PageTitle>
        {params.from === "quiz" ? (
          <Muted>
            Filtered from your quiz answers — tweak anything below, or{" "}
            <Link href="/quiz">retake the quiz</Link>.
          </Muted>
        ) : null}
      </div>
      <FilterBar />
      <HydrationBoundary state={dehydrate(queryClient)}>
        <SearchView />
      </HydrationBoundary>
    </Container>
  );
}
