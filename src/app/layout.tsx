import type { Metadata, Viewport } from "next";
import { Fraunces, Nunito_Sans } from "next/font/google";
import { EmotionRegistry } from "./emotion-registry";
import { Providers } from "./providers";
import { ThemeShell } from "./theme-shell";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  axes: ["SOFT", "WONK", "opsz"],
});

const nunito = Nunito_Sans({
  subsets: ["latin"],
  variable: "--font-nunito",
  display: "swap",
  // opsz 6-12: free small-size legibility on 12px facts/attribution lines.
  axes: ["opsz"],
});

export const metadata: Metadata = {
  // Absolute URLs for og/twitter images; APP_URL is the deploy-time origin.
  metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
  title: { default: "Pet Pals — every adoptable pet, one search", template: "%s · Pet Pals" },
  description:
    "Pet Pals aggregates adoptable pets from shelters and rescue networks into a single search. Adoptions always happen at the shelter.",
  openGraph: {
    siteName: "Pet Pals",
    type: "website",
    title: "Pet Pals — every adoptable pet, one search",
    description:
      "Real listings from shelters and rescues across Canada and the US — adoptions always happen at the shelter.",
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAF6F0" },
    { media: "(prefers-color-scheme: dark)", color: "#221B16" },
  ],
};

// Runs before first paint so an explicit theme choice never flashes.
const themeScript = `(function(){try{var t=localStorage.getItem('ppTheme');if(t==='dark'||t==='light'){document.documentElement.dataset.theme=t}}catch(e){}})()`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${nunito.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <EmotionRegistry>
          <ThemeShell>
            <Providers>{children}</Providers>
          </ThemeShell>
        </EmotionRegistry>
      </body>
    </html>
  );
}
