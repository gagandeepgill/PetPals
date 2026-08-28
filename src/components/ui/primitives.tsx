"use client";

import styled from "@emotion/styled";
import { css, type Theme } from "@emotion/react";
import Link from "next/link";

export const Container = styled.div`
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 ${({ theme }) => theme.space(5)};
`;

export const PageTitle = styled.h1`
  font-family: ${({ theme }) => theme.typography.fontDisplay};
  font-size: ${({ theme }) => theme.typography.size["2xl"]};
  font-weight: ${({ theme }) => theme.typography.weight.display};
  line-height: ${({ theme }) => theme.typography.lineHeight.tight};
  color: ${({ theme }) => theme.colors.textPrimary};
  margin: 0 0 ${({ theme }) => theme.space(2)};
  text-wrap: balance;
`;

export const SectionTitle = styled.h2`
  font-family: ${({ theme }) => theme.typography.fontDisplay};
  font-size: ${({ theme }) => theme.typography.size.xl};
  font-weight: ${({ theme }) => theme.typography.weight.bold};
  color: ${({ theme }) => theme.colors.textPrimary};
  margin: 0 0 ${({ theme }) => theme.space(3)};
`;

export const Muted = styled.p`
  color: ${({ theme }) => theme.colors.textSecondary};
  margin: 0 0 ${({ theme }) => theme.space(3)};
`;

const buttonVariants = (t: Theme) => ({
  primary: css({
    background: t.colors.accent,
    color: t.colors.textInverse,
    "&:hover": { background: t.colors.accentHover },
  }),
  secondary: css({
    background: t.colors.surfaceRaised,
    color: t.colors.textPrimary,
    border: `1px solid ${t.colors.border}`,
    "&:hover": { borderColor: t.colors.accent },
  }),
  ghost: css({
    background: "transparent",
    color: t.colors.accent,
    "&:hover": { background: t.colors.accentSubtle },
  }),
});

type ButtonVariant = keyof ReturnType<typeof buttonVariants>;

export const Button = styled.button<{ variant?: ButtonVariant }>(
  ({ theme: t }) =>
    css({
      fontFamily: t.typography.fontBody,
      fontWeight: t.typography.weight.medium,
      fontSize: t.typography.size.md,
      padding: `${t.space(2.5)} ${t.space(5)}`,
      borderRadius: t.radii.pill,
      border: "none",
      cursor: "pointer",
      display: "inline-flex",
      alignItems: "center",
      gap: t.space(2),
      textDecoration: "none",
      transition: `background ${t.motion.duration.fast} ${t.motion.easing.standard}`,
      "&:disabled": { opacity: 0.5, cursor: "not-allowed" },
    }),
  ({ theme, variant = "primary" }) => buttonVariants(theme)[variant],
);

export const ButtonLink = Button.withComponent(Link);
export const ButtonAnchor = Button.withComponent("a");

export const Badge = styled.span<{ tone?: "neutral" | "success" | "warning" | "danger" }>`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space(1)};
  padding: ${({ theme }) => `${theme.space(1)} ${theme.space(3)}`};
  border-radius: ${({ theme }) => theme.radii.pill};
  font-size: ${({ theme }) => theme.typography.size.sm};
  font-weight: ${({ theme }) => theme.typography.weight.medium};
  background: ${({ theme }) => theme.colors.surfaceSunken};
  color: ${({ theme, tone }) =>
    tone === "success"
      ? theme.colors.success
      : tone === "warning"
        ? theme.colors.warning
        : tone === "danger"
          ? theme.colors.danger
          : theme.colors.textSecondary};
`;

export const CardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: ${({ theme }) => theme.space(5)};
`;
