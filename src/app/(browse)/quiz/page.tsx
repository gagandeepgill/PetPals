import type { Metadata } from "next";
import { Container } from "@/components/ui/primitives";
import { QuizFlow } from "./_components/QuizFlow";

export const metadata: Metadata = {
  title: "Find your kind of pal",
  description:
    "Six quick questions about your home and routine — we'll point you at the pets who'd thrive there.",
};

export default function QuizPage() {
  return (
    <Container>
      <QuizFlow />
    </Container>
  );
}
