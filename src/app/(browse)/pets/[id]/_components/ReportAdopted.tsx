"use client";

import styled from "@emotion/styled";
import { useEffect, useState } from "react";

const TextButton = styled.button`
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: ${({ theme }) => theme.typography.size.xs};
  text-decoration: underline;
  &:hover {
    color: ${({ theme }) => theme.colors.trust};
  }
`;

const Thanks = styled.span`
  color: ${({ theme }) => theme.colors.success};
  font-size: ${({ theme }) => theme.typography.size.xs};
`;

const storageKey = (petId: string) => `pp-reported:${petId}`;

/** The ghost-listing feedback loop: one click, in voice, no forms. */
export function ReportAdopted({ petId, petName }: { petId: string; petName: string }) {
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");

  useEffect(() => {
    try {
      if (sessionStorage.getItem(storageKey(petId))) setState("done");
    } catch {
      /* storage unavailable: button just stays active */
    }
  }, [petId]);

  if (state === "done") {
    return <Thanks>Thanks — we&apos;ll double-check with the shelter.</Thanks>;
  }

  return (
    <TextButton
      disabled={state === "sending"}
      onClick={async () => {
        setState("sending");
        try {
          await fetch(`/api/pets/${petId}/report`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          });
        } catch {
          /* a lost report is not worth an error state — the next visitor files it */
        }
        try {
          sessionStorage.setItem(storageKey(petId), "1");
        } catch {
          /* ignore */
        }
        setState("done");
      }}
    >
      Heard {petName} already found a home? Tell us
    </TextButton>
  );
}
