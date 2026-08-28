/**
 * Two-layer token system: a raw palette (only GlobalStyles imports it, to emit
 * CSS variables) and a semantic theme whose values are var(--pp-*) references.
 * Dark mode is therefore one data-theme attribute write — zero Emotion
 * re-serialization, zero hydration mismatch.
 */

export const palette = {
  terracotta: {
    50: "#FDF1EC",
    100: "#FADDD1",
    300: "#F0A588",
    500: "#E07A5F",
    600: "#C96248",
    700: "#A84B35",
  },
  sand: { 50: "#FAF6F0", 100: "#F4EDE2", 200: "#E8DCCB", 700: "#8A7B68" },
  ink: { 900: "#2D2A26", 700: "#57524B", 500: "#847C72" },
  sage: { 500: "#6A8E7F", 600: "#54786A" },
  honey: { 500: "#E9B44C", 700: "#B5822A" },
  clay: { 500: "#C4443C", 600: "#A33630" },
  // Trust secondary (verified shelters, adoption-of-record affordances) — see DESIGN.md
  spruce: { 300: "#8FB3A3", 500: "#3E5C50" },
  // Dark mode is espresso, not charcoal: warmth survives inversion.
  night: {
    bg: "#221B16",
    surface: "#2A221C",
    raised: "#332A22",
    text: "#F2EAE0",
    textMuted: "#B8A99A",
    border: "#3A3129",
  },
} as const;

const v = (name: string) => `var(--pp-${name})`;

export const theme = {
  colors: {
    surface: v("surface"),
    surfaceRaised: v("surface-raised"),
    surfaceSunken: v("surface-sunken"),
    surfaceOverlay: v("surface-overlay"),
    trust: v("trust"),
    textPrimary: v("text-primary"),
    textSecondary: v("text-secondary"),
    textInverse: v("text-inverse"),
    accent: v("accent"),
    accentHover: v("accent-hover"),
    accentSubtle: v("accent-subtle"),
    border: v("border"),
    focusRing: v("focus-ring"),
    success: v("success"),
    warning: v("warning"),
    danger: v("danger"),
    overlay: v("overlay"),
    favorite: v("favorite"),
  },
  typography: {
    fontDisplay: `var(--font-fraunces), Georgia, serif`,
    // SOFT high / WONK off: warm, without the wonky-swash cliché — see DESIGN.md
    displayVariation: `'SOFT' 100, 'WONK' 0`,
    fontBody: `var(--font-nunito), system-ui, sans-serif`,
    size: {
      xs: "0.75rem",
      sm: "0.875rem",
      md: "1rem",
      lg: "1.25rem",
      xl: "1.5625rem",
      "2xl": "1.9531rem",
      "3xl": "2.4414rem",
    },
    weight: { regular: 400, medium: 600, bold: 700, display: 800 },
    lineHeight: { tight: 1.15, snug: 1.3, body: 1.55 },
  },
  space: (n: number) => `${n * 4}px`,
  radii: { sm: "6px", md: "12px", lg: "20px", pill: "999px", card: "16px" },
  shadows: { sm: v("shadow-sm"), md: v("shadow-md"), lg: v("shadow-lg") },
  breakpoints: { sm: "640px", md: "768px", lg: "1024px", xl: "1280px" },
  mq: {
    sm: "@media (min-width: 640px)",
    md: "@media (min-width: 768px)",
    lg: "@media (min-width: 1024px)",
    xl: "@media (min-width: 1280px)",
    motionOk: "@media (prefers-reduced-motion: no-preference)",
    motionReduce: "@media (prefers-reduced-motion: reduce)",
  },
  z: { base: 0, card: 1, sticky: 100, dropdown: 400, overlay: 800, modal: 900, toast: 1000 },
  motion: {
    duration: { fast: "120ms", base: "200ms", slow: "320ms" },
    easing: {
      standard: "cubic-bezier(0.2, 0, 0, 1)",
      enter: "cubic-bezier(0, 0, 0.2, 1)",
      spring: "cubic-bezier(0.34, 1.56, 0.64, 1)", // affirmations only (favorite, settle)
      sheet: "cubic-bezier(0.32, 0.72, 0, 1)",
    },
  },
} as const;

export type AppTheme = typeof theme;
