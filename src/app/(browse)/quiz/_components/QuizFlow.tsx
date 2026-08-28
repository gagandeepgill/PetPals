"use client";

import styled from "@emotion/styled";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Muted, PageTitle } from "@/components/ui/primitives";
import { answersToSearchParams, QUIZ_QUESTIONS, useQuizProfile } from "@/lib/quiz";

/* One question per screen, big tappable options, progress dots, Skip always
   visible, and it ends on pre-filtered results — never a dead-end summary. */

const Wrap = styled.div`
  max-width: 560px;
  margin: 0 auto;
  padding: ${({ theme }) => `${theme.space(8)} 0 ${theme.space(16)}`};
`;

const Dots = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.space(2)};
  margin-bottom: ${({ theme }) => theme.space(6)};
`;

const Dot = styled.span<{ state: "done" | "current" | "todo" }>`
  width: ${({ state }) => (state === "current" ? "24px" : "8px")};
  height: 8px;
  border-radius: ${({ theme }) => theme.radii.pill};
  background: ${({ theme, state }) =>
    state === "todo" ? theme.colors.border : theme.colors.accent};
  transition: width ${({ theme }) =>
    `${theme.motion.duration.base} ${theme.motion.easing.standard}`};
`;

const Options = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space(3)};
  margin: ${({ theme }) => `${theme.space(6)} 0`};
`;

const OptionButton = styled.button`
  text-align: left;
  padding: ${({ theme }) => `${theme.space(4)} ${theme.space(5)}`};
  border-radius: ${({ theme }) => theme.radii.card};
  border: 1.5px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surfaceRaised};
  color: ${({ theme }) => theme.colors.textPrimary};
  font-size: ${({ theme }) => theme.typography.size.md};
  font-weight: ${({ theme }) => theme.typography.weight.medium};
  cursor: pointer;
  transition: border-color ${({ theme }) =>
    `${theme.motion.duration.fast} ${theme.motion.easing.standard}`};
  &:hover {
    border-color: ${({ theme }) => theme.colors.accent};
  }
  span {
    display: block;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: ${({ theme }) => theme.typography.size.sm};
    font-weight: ${({ theme }) => theme.typography.weight.regular};
    margin-top: 2px;
  }
`;

const FooterRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const TextButton = styled.button`
  background: none;
  border: none;
  color: ${({ theme }) => theme.colors.textSecondary};
  text-decoration: underline;
  cursor: pointer;
  font-size: ${({ theme }) => theme.typography.size.sm};
  padding: ${({ theme }) => theme.space(2)};
`;

export function QuizFlow() {
  const router = useRouter();
  const { answers, setAnswer, complete } = useQuizProfile();
  const [step, setStep] = useState(0);
  const question = QUIZ_QUESTIONS[step]!;
  const isLast = step === QUIZ_QUESTIONS.length - 1;

  const finish = () => {
    complete();
    router.push(`/search?${answersToSearchParams(answers).toString()}`);
  };

  const pick = (value: string) => {
    setAnswer(question.key, value);
    if (isLast) {
      // The store batches; build params from the final answer set directly.
      complete();
      router.push(
        `/search?${answersToSearchParams({ ...answers, [question.key]: value }).toString()}`,
      );
    } else {
      setStep(step + 1);
    }
  };

  return (
    <Wrap>
      <Dots aria-hidden>
        {QUIZ_QUESTIONS.map((q, i) => (
          <Dot key={q.key} state={i < step ? "done" : i === step ? "current" : "todo"} />
        ))}
      </Dots>
      <Muted style={{ marginBottom: 4 }}>
        Question {step + 1} of {QUIZ_QUESTIONS.length}
      </Muted>
      <PageTitle>{question.title}</PageTitle>
      <Options role="group" aria-label={question.title}>
        {question.options.map((option) => (
          <OptionButton key={option.value} onClick={() => pick(option.value)}>
            {option.label}
            {option.hint ? <span>{option.hint}</span> : null}
          </OptionButton>
        ))}
      </Options>
      <FooterRow>
        {step > 0 ? (
          <TextButton onClick={() => setStep(step - 1)}>← Back</TextButton>
        ) : (
          <span />
        )}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <TextButton onClick={finish}>Skip the rest</TextButton>
          {isLast ? <Button onClick={finish}>See matches</Button> : null}
        </div>
      </FooterRow>
    </Wrap>
  );
}
