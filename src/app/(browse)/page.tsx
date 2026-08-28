import { PetCard } from "@/components/ui/PetCard";
import { ButtonLink, CardGrid, Container } from "@/components/ui/primitives";
import { getFeaturedPets, getHeroStats } from "@/lib/pets";
import { CelebrationClose, HomeHero, SectionHeading, TrustStrip } from "./_components/home";

export const revalidate = 3600;

export default async function HomePage() {
  const [hero, featured] = await Promise.all([getHeroStats(), getFeaturedPets(8)]);

  return (
    <Container>
      <HomeHero total={hero.total} faces={hero.faces} />

      <section aria-labelledby="quick-intent" style={{ padding: "0 0 48px" }}>
        <SectionHeading id="quick-intent">What kind of friend are you picturing?</SectionHeading>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <ButtonLink href="/search?species=dog">🐕 Dogs</ButtonLink>
          <ButtonLink href="/search?species=cat">🐈 Cats</ButtonLink>
          <ButtonLink href="/search?species=rabbit" variant="secondary">
            🐰 Rabbits
          </ButtonLink>
          <ButtonLink href="/search" variant="ghost">
            Not sure yet? Just browse
          </ButtonLink>
        </div>
      </section>

      <section aria-labelledby="new-faces" style={{ paddingBottom: 48 }}>
        <SectionHeading id="new-faces">New faces this week</SectionHeading>
        <CardGrid>
          {featured.map((pet, i) => (
            <PetCard key={pet.id} pet={pet} priority={i < 4} />
          ))}
        </CardGrid>
      </section>

      <TrustStrip />
      <CelebrationClose />
    </Container>
  );
}
