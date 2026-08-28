import type { Metadata } from "next";
import { Fraunces, Nunito_Sans } from "next/font/google";
import { EmotionRegistry } from "./emotion-registry";
import { Providers } from "./providers";
import { ThemeShell } from "./theme-shell";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const nunito = Nunito_Sans({
  subsets: ["latin"],
  variable: "--font-nunito",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Pet Pals — every adoptable pet, one search", template: "%s · Pet Pals" },
  description:
    "Pet Pals aggregates adoptable pets from shelters and rescue networks into a single search. Adoptions always happen at the shelter.",
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
