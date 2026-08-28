import type { Metadata } from "next";
import { Container, PageTitle } from "@/components/ui/primitives";
import { FavoritesList } from "./_components/FavoritesList";

export const metadata: Metadata = { title: "Saved pets" };

export default function FavoritesPage() {
  return (
    <Container>
      <div style={{ padding: "32px 0 64px" }}>
        <PageTitle>Saved pets</PageTitle>
        <FavoritesList />
      </div>
    </Container>
  );
}
