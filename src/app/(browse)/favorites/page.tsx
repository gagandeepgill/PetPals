import type { Metadata } from "next";
import { Container, PageTitle } from "@/components/ui/primitives";
import { FavoritesList } from "./_components/FavoritesList";
import { SavedSearchesList } from "./_components/SavedSearchesList";

export const metadata: Metadata = { title: "Saved" };

export default function FavoritesPage() {
  return (
    <Container>
      <div style={{ padding: "32px 0 64px" }}>
        <PageTitle>Saved</PageTitle>
        <SavedSearchesList />
        <FavoritesList />
      </div>
    </Container>
  );
}
