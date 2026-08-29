"use client";

import { Global, css } from "@emotion/react";
import { palette } from "./theme";

const lightVars = {
  "--pp-surface": palette.sand[50],
  "--pp-surface-raised": "#FFFFFF",
  "--pp-surface-sunken": palette.sand[100],
  "--pp-surface-overlay": "#FFFFFF",
  "--pp-trust": palette.spruce[500],
  "--pp-text-primary": palette.ink[900],
  "--pp-text-secondary": palette.ink[700],
  "--pp-text-inverse": "#FFF9F5",
  "--pp-accent": palette.terracotta[500],
  // Terracotta dark enough to READ (5.24:1 on sand); 500 stays for surfaces.
  "--pp-accent-text": palette.terracotta[700],
  // Warm ink on terracotta (4.84:1) — inverse cream was 2.83:1.
  "--pp-text-on-accent": palette.ink[900],
  "--pp-accent-hover": palette.terracotta[600],
  "--pp-accent-subtle": palette.terracotta[50],
  "--pp-border": palette.sand[200],
  // 3.66:1 vs sand — WCAG 2.2 focus appearance needs >=3:1 (300 was 1.87:1).
  "--pp-focus-ring": palette.terracotta[600],
  "--pp-success": palette.sage[600],
  "--pp-warning": palette.honey[800],
  "--pp-danger": palette.clay[500],
  "--pp-favorite": "#E25D6A",
  "--pp-overlay": "rgba(45,42,38,0.55)",
  "--pp-selection-bg": palette.terracotta[100],
  "--pp-selection-text": palette.ink[900],
  // Untinted, or the edge reads as dirt on warm photos.
  "--pp-image-outline": "rgba(0,0,0,0.1)",
  "--pp-shadow-sm": "0 1px 2px rgba(45,42,38,0.06), 0 1px 3px rgba(45,42,38,0.08)",
  "--pp-shadow-md": "0 4px 12px rgba(45,42,38,0.10)",
  "--pp-shadow-lg": "0 8px 16px rgba(45,42,38,0.10), 0 20px 40px rgba(45,42,38,0.12)",
} as const;

const darkVars = {
  "--pp-surface": palette.night.bg,
  "--pp-surface-raised": palette.night.surface,
  "--pp-surface-sunken": palette.night.raised,
  "--pp-surface-overlay": palette.night.raised,
  "--pp-trust": palette.spruce[300],
  "--pp-text-primary": palette.night.text,
  "--pp-text-secondary": palette.night.textMuted,
  "--pp-text-inverse": palette.ink[900],
  "--pp-accent": palette.terracotta[300],
  "--pp-accent-text": palette.terracotta[300],
  "--pp-text-on-accent": palette.ink[900],
  // One lightness step, not two — 100 flashed near-white on espresso.
  "--pp-accent-hover": palette.terracotta[200],
  "--pp-accent-subtle": "#3A2A22",
  "--pp-border": palette.night.border,
  "--pp-focus-ring": palette.terracotta[300],
  "--pp-success": palette.sage[500],
  "--pp-warning": palette.honey[500],
  "--pp-danger": "#E0776C",
  "--pp-favorite": "#F07A86",
  "--pp-overlay": "rgba(0,0,0,0.6)",
  "--pp-selection-bg": "#3A2A22",
  "--pp-selection-text": palette.night.text,
  "--pp-image-outline": "rgba(255,255,255,0.1)",
  // Dark elevation = lighter surface + visible border; shadows carry ~zero
  // signal on espresso. Real shadow survives only on overlays (see DESIGN.md).
  "--pp-shadow-sm": `0 0 0 1px ${palette.night.border}`,
  "--pp-shadow-md": `0 0 0 1px ${palette.night.border}`,
  "--pp-shadow-lg": `0 0 0 1px ${palette.night.border}, 0 16px 40px rgba(0,0,0,0.55)`,
} as const;

export function GlobalStyles() {
  return (
    <Global
      styles={css({
        ":root": lightVars,
        '[data-theme="dark"]': darkVars,
        "@media (prefers-color-scheme: dark)": {
          ':root:not([data-theme="light"])': darkVars,
        },
        "*, *::before, *::after": { boxSizing: "border-box" },
        html: { WebkitTextSizeAdjust: "100%" },
        body: {
          margin: 0,
          background: "var(--pp-surface)",
          color: "var(--pp-text-primary)",
          fontFamily: "var(--font-nunito), system-ui, sans-serif",
          lineHeight: 1.55,
          // Nunito Sans 400 renders heavy on macOS without this.
          WebkitFontSmoothing: "antialiased",
          MozOsxFontSmoothing: "grayscale",
        },
        "img, video": { maxWidth: "100%", height: "auto" },
        "h1, h2, h3, h4": { fontVariationSettings: "'SOFT' 100, 'WONK' 0" },
        "button, input, select, textarea": { font: "inherit" },
        a: {
          color: "var(--pp-accent-text)",
          // Underline geometry from Nunito Sans' own metrics wherever an
          // underline renders (nav/button links opt out per-component).
          textUnderlinePosition: "from-font",
          textDecorationThickness: "from-font",
          textDecorationSkipInk: "auto",
          textUnderlineOffset: "2px",
        },
        "::selection": {
          background: "var(--pp-selection-bg)",
          color: "var(--pp-selection-text)",
        },
        ":focus-visible": {
          outline: "3px solid var(--pp-focus-ring)",
          outlineOffset: "2px",
        },
        "@media (prefers-reduced-motion: reduce)": {
          "*, *::before, *::after": {
            animationDuration: "0.01ms !important",
            transitionDuration: "0.01ms !important",
            scrollBehavior: "auto",
          },
        },
      })}
    />
  );
}
