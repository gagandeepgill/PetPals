import { ButtonLink, Container, Muted, PageTitle } from "@/components/ui/primitives";

export default function PetNotFound() {
  return (
    <Container>
      <div style={{ padding: "64px 0", textAlign: "center" }}>
        <PageTitle>This pet isn&apos;t listed anymore</PageTitle>
        <Muted>
          Chances are they found a home 🎉 — there are plenty of pets still looking for theirs.
        </Muted>
        <ButtonLink href="/search">See available pets</ButtonLink>
      </div>
    </Container>
  );
}
