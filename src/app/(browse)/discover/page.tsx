import type { Metadata } from "next";
import { Suspense } from "react";
import { Container, Muted, PageTitle } from "@/components/ui/primitives";
import { SwipeDeck } from "./_components/SwipeDeck";

export const metadata: Metadata = {
  title: "Discover",
  description: "Meet nearby adoptable pets one at a time. Save the ones who stick with you.",
};

export default function DiscoverPage() {
  return (
    <Container>
      <div style={{ padding: "32px 0 8px", textAlign: "center" }}>
        <PageTitle>Just browsing? Meet them one at a time.</PageTitle>
        <Muted>Saving costs nothing and makes somebody&apos;s day trackable.</Muted>
      </div>
      {/* useSearchParams inside the deck opts out of static prerender without
          a boundary; the fallback matches the deck's own pending state. */}
      <Suspense fallback={null}>
        <SwipeDeck />
      </Suspense>
    </Container>
  );
}
