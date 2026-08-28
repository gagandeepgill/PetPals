"use client";

import { Global, css } from "@emotion/react";
import { palette } from "./theme";

const lightVars = {
  "--pp-surface": palette.sand[50],
  "--pp-surface-raised": "#FFFFFF",
  "--pp-surface-sunken": palette.sand[100],
  "--pp-text-primary": palette.ink[900],
  "--pp-text-secondary": palette.ink[700],
  "--pp-text-inverse": "#FFF9F5",
  "--pp-accent": palette.terracotta[500],
  "--pp-accent-hover": palette.terracotta[600],
  "--pp-accent-subtle": palette.terracotta[50],
  "--pp-border": palette.sand[200],
  "--pp-focus-ring": palette.terracotta[300],
  "--pp-success": palette.sage[600],
  "--pp-warning": palette.honey[700],
  "--pp-danger": palette.clay[500],
  "--pp-favorite": "#E25D6A",
  "--pp-overlay": "rgba(45,42,38,0.55)",
  "--pp-shadow-sm": "0 1px 3px rgba(45,42,38,0.08)",
  "--pp-shadow-md": "0 4px 12px rgba(45,42,38,0.10)",
  "--pp-shadow-lg": "0 12px 32px rgba(45,42,38,0.14)",
} as const;

const darkVars = {
  "--pp-surface": palette.night.bg,
  "--pp-surface-raised": palette.night.surface,
  "--pp-surface-sunken": palette.night.raised,
  "--pp-text-primary": palette.night.text,
  "--pp-text-secondary": palette.night.textMuted,
  "--pp-text-inverse": palette.ink[900],
  "--pp-accent": palette.terracotta[300],
  "--pp-accent-hover": palette.terracotta[100],
  "--pp-accent-subtle": "#3A2A22",
  "--pp-border": palette.night.border,
  "--pp-focus-ring": palette.terracotta[300],
  "--pp-success": palette.sage[500],
  "--pp-warning": palette.honey[500],
  "--pp-danger": "#E0776C",
  "--pp-favorite": "#F07A86",
  "--pp-overlay": "rgba(0,0,0,0.6)",
  "--pp-shadow-sm": "0 1px 3px rgba(0,0,0,0.35)",
  "--pp-shadow-md": "0 4px 12px rgba(0,0,0,0.4)",
  "--pp-shadow-lg": "0 12px 32px rgba(0,0,0,0.5)",
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
        },
        "img, video": { maxWidth: "100%", height: "auto" },
        "button, input, select, textarea": { font: "inherit" },
        a: { color: "var(--pp-accent)" },
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
