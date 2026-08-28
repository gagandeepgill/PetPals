import { PetCard } from "@/components/ui/PetCard";
import { ButtonLink, CardGrid, Container, Muted, PageTitle, SectionTitle } from "@/components/ui/primitives";
import { getFeaturedPets } from "@/lib/pets";

export const revalidate = 3600;

export default async function HomePage() {
  const featured = await getFeaturedPets(8);

  return (
    <Container>
      <div style={{ padding: "48px 0 32px" }}>
        <PageTitle>Every adoptable pet near you, in one search</PageTitle>
        <Muted>
          Pet Pals aggregates shelters and rescue networks into a single place. Adoptions always
          happen at the shelter — we just help you find each other.
        </Muted>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <ButtonLink href="/search?species=dog">🐕 Dogs</ButtonLink>
          <ButtonLink href="/search?species=cat">🐈 Cats</ButtonLink>
          <ButtonLink href="/search" variant="secondary">
            Browse all pets
          </ButtonLink>
        </div>
      </div>

      <section style={{ paddingBottom: 64 }}>
        <SectionTitle>New near you</SectionTitle>
        <CardGrid>
          {featured.map((pet, i) => (
            <PetCard key={pet.id} pet={pet} priority={i < 4} />
          ))}
        </CardGrid>
      </section>
    </Container>
  );
}
