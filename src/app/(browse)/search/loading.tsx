import { Container, Muted } from "@/components/ui/primitives";

export default function SearchLoading() {
  return (
    <Container>
      <Muted style={{ padding: "48px 0" }}>Searching shelters…</Muted>
    </Container>
  );
}
