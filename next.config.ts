import type { NextConfig } from "next";

const config: NextConfig = {
  compiler: {
    emotion: {
      sourceMap: true,
      autoLabel: "dev-only",
      labelFormat: "[dirname]-[local]",
    },
  },
  images: {
    // Shelter photos live on arbitrary source hosts until CDN re-hosting lands (M1).
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default config;
