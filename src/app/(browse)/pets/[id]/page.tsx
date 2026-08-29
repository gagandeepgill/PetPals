import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container, PageTitle, Prose } from "@/components/ui/primitives";
import { getPetById } from "@/lib/pets";
import { PetDetail } from "./_components/detail";

export const revalidate = 86400; // safety net — revalidateTag is the real freshness path

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const pet = await getPetById(id);
  if (!pet) return { title: "Pet not found" };
  const breed = pet.breed.rawBreedText || "adoptable pet";
  return {
    title: `Adopt ${pet.name}`,
    description: `${pet.name} is a ${breed} at ${pet.organizationName}. See photos and start the adoption at the shelter.`,
  };
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(ms / 3_600_000);
  if (hours < 1) return "under an hour ago";
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default async function PetPage({ params }: Props) {
  const { id } = await params;
  const pet = await getPetById(id);
  if (!pet) notFound();

  return (
    <Container>
      <article style={{ maxWidth: 900, margin: "0 auto", padding: "32px 0 64px" }}>
        <PageTitle>Meet {pet.name}</PageTitle>
        <PetDetail pet={pet} verifiedAgo={timeAgo(pet.updatedAt)} />
        {pet.description ? <Prose>{pet.description}</Prose> : null}
      </article>
    </Container>
  );
}
