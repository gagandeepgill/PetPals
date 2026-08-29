import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Pet Pals — every adoptable pet, one search";

/**
 * Site-wide social card (Hearth): sand ground, terracotta paw, honest pitch.
 * Text renders in @vercel/og's bundled sans — swapping in Fraunces would need
 * a font fetch at render time; deliberately skipped for reliability.
 */
export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          background: "#FAF6F0",
          padding: "80px",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            right: 60,
            top: 90,
            display: "flex",
            opacity: 0.16,
          }}
        >
          <svg width="460" height="460" viewBox="0 0 24 24">
            <g fill="#E07A5F">
              <ellipse cx="12" cy="16.2" rx="4.9" ry="4" />
              <circle cx="5.6" cy="10.6" r="2.1" />
              <circle cx="9.8" cy="7.2" r="2.1" />
              <circle cx="14.2" cy="7.2" r="2.1" />
              <circle cx="18.4" cy="10.6" r="2.1" />
            </g>
          </svg>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <svg width="72" height="72" viewBox="0 0 24 24">
            <g fill="#E07A5F">
              <ellipse cx="12" cy="16.2" rx="4.9" ry="4" />
              <circle cx="5.6" cy="10.6" r="2.1" />
              <circle cx="9.8" cy="7.2" r="2.1" />
              <circle cx="14.2" cy="7.2" r="2.1" />
              <circle cx="18.4" cy="10.6" r="2.1" />
            </g>
          </svg>
          <div style={{ fontSize: 56, fontWeight: 700, color: "#2D2A26" }}>Pet Pals</div>
        </div>
        <div
          style={{
            marginTop: 40,
            fontSize: 76,
            fontWeight: 800,
            color: "#2D2A26",
            lineHeight: 1.1,
            maxWidth: 820,
          }}
        >
          Every adoptable pet, one search.
        </div>
        <div style={{ marginTop: 32, fontSize: 34, color: "#57524B", maxWidth: 760 }}>
          Real listings from shelters and rescues across Canada and the US — adoptions always
          happen at the shelter.
        </div>
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: 18,
            background: "#E07A5F",
            display: "flex",
          }}
        />
      </div>
    ),
    size,
  );
}
