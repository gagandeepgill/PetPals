"use client";

import styled from "@emotion/styled";
import Link from "next/link";

const Bar = styled.header`
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surfaceRaised};
`;

const Inner = styled.div`
  max-width: 1100px;
  margin: 0 auto;
  padding: ${({ theme }) => `${theme.space(3)} ${theme.space(5)}`};
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space(4)};
`;

const Wordmark = styled(Link)`
  font-family: ${({ theme }) => theme.typography.fontDisplay};
  font-weight: ${({ theme }) => theme.typography.weight.display};
  font-size: ${({ theme }) => theme.typography.size.lg};
  color: ${({ theme }) => theme.colors.textPrimary};
  text-decoration: none;
`;

const Nav = styled.nav`
  display: flex;
  gap: ${({ theme }) => theme.space(4)};
  a {
    color: ${({ theme }) => theme.colors.textSecondary};
    text-decoration: none;
    font-weight: ${({ theme }) => theme.typography.weight.medium};
    &:hover {
      color: ${({ theme }) => theme.colors.accent};
    }
  }
`;

export function SiteHeader() {
  return (
    <Bar>
      <Inner>
        <Wordmark href="/">🐾 Pet Pals</Wordmark>
        <Nav aria-label="Primary">
          <Link href="/search">Search</Link>
          <Link href="/search?species=dog">Dogs</Link>
          <Link href="/search?species=cat">Cats</Link>
        </Nav>
      </Inner>
    </Bar>
  );
}
