import { ImageResponse } from "next/og";
import { getPetById } from "@/lib/pets";
import { ageLabel } from "@/lib/search/provider";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Adoptable pet on Pet Pals";

const SAND = "#FAF6F0";
const INK = "#2D2A26";
const INK_SOFT = "#57524B";
const TERRACOTTA = "#E07A5F";

function Paw({ width }: { width: number }) {
  return (
    <svg width={width} height={width} viewBox="0 0 24 24">
      <g fill={TERRACOTTA}>
        <ellipse cx="12" cy="16.2" rx="4.9" ry="4" />
        <circle cx="5.6" cy="10.6" r="2.1" />
        <circle cx="9.8" cy="7.2" r="2.1" />
        <circle cx="14.2" cy="7.2" r="2.1" />
        <circle cx="18.4" cy="10.6" r="2.1" />
      </g>
    </svg>
  );
}

/**
 * Per-pet share card: the pet's actual photo beside their name — the thing
 * someone pastes into a group chat. Falls back to the brand card shape when
 * the pet is gone from the snapshot or has no photo.
 */
export default async function PetShareCard({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pet = await getPetById(id);
  const photo = pet?.photos[0]?.url ?? null;

  const facts = pet
    ? [
        pet.age.group !== "unknown" ? ageLabel(pet.age.group) : null,
        pet.breed.rawBreedText || (pet.breed.isMixed ? "Mixed breed" : null),
        [pet.location.city, pet.location.state].filter(Boolean).join(", ") || null,
      ]
        .filter(Boolean)
        .join(" · ")
    : "";

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: SAND }}>
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo}
            alt=""
            width={560}
            height={630}
            style={{ width: 560, height: 630, objectFit: "cover" }}
          />
        ) : (
          <div
            style={{
              width: 560,
              height: 630,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#F4EDE2",
            }}
          >
            <Paw width={220} />
          </div>
        )}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "60px 56px",
            position: "relative",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <Paw width={40} />
            <div style={{ fontSize: 30, fontWeight: 700, color: INK_SOFT }}>Pet Pals</div>
          </div>
          <div
            style={{
              marginTop: 28,
              fontSize: 84,
              fontWeight: 800,
              color: INK,
              lineHeight: 1.05,
            }}
          >
            {pet ? `Meet ${pet.name}` : "Every adoptable pet"}
          </div>
          {facts ? (
            <div style={{ marginTop: 22, fontSize: 32, color: INK_SOFT, lineHeight: 1.3 }}>
              {facts}
            </div>
          ) : null}
          {pet ? (
            <div style={{ marginTop: 14, fontSize: 26, color: INK_SOFT }}>
              {`${pet.organizationName} · adoptions happen at the shelter`}
            </div>
          ) : (
            <div style={{ marginTop: 22, fontSize: 32, color: INK_SOFT }}>one search.</div>
          )}
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              height: 16,
              background: TERRACOTTA,
              display: "flex",
            }}
          />
        </div>
      </div>
    ),
    size,
  );
}
