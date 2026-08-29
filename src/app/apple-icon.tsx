import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Home-screen icon: same mark as icon.svg, rendered at Apple's 180px. */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#FAF6F0",
        }}
      >
        <svg width="140" height="140" viewBox="0 0 24 24">
          <g fill="#E07A5F">
            <ellipse cx="12" cy="16.2" rx="4.9" ry="4" />
            <circle cx="5.6" cy="10.6" r="2.1" />
            <circle cx="9.8" cy="7.2" r="2.1" />
            <circle cx="14.2" cy="7.2" r="2.1" />
            <circle cx="18.4" cy="10.6" r="2.1" />
          </g>
        </svg>
      </div>
    ),
    size,
  );
}
