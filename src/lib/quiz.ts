"use client";

import { useEffect, useState } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Pet } from "./domain/pet";

/**
 * The match quiz (DESIGN.md): six lifestyle questions mapped to search filters
 * and to qualitative fit notes on pet pages. Output is always labeled
 * badges — "Good fit" / "Check with the shelter" — never a fabricated match
 * percentage; unknown pet attributes read as "ask the shelter".
 */

export type HomeType = "apartment" | "house_yard" | "house_no_yard" | "rural";
export type HoursAlone = "under2" | "h2to6" | "h6to9" | "over9";
export type Activity = "couch" | "walks" | "runs" | "adventures";
export type KidsAtHome = "none" | "little" | "big" | "visiting";
export type CurrentPets = "none" | "dogs" | "cats" | "both";
export type Experience = "first_timer" | "grew_up" | "seasoned" | "rescue_savvy";

export interface QuizAnswers {
  home?: HomeType;
  hours?: HoursAlone;
  activity?: Activity;
  kids?: KidsAtHome;
  pets?: CurrentPets;
  experience?: Experience;
}

export interface QuizQuestion {
  key: keyof QuizAnswers;
  title: string;
  options: { value: string; label: string; hint?: string }[];
}

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    key: "home",
    title: "Where would they live?",
    options: [
      { value: "apartment", label: "An apartment", hint: "Cozy, no yard" },
      { value: "house_yard", label: "A house with a yard" },
      { value: "house_no_yard", label: "A house, no yard" },
      { value: "rural", label: "Somewhere with land" },
    ],
  },
  {
    key: "hours",
    title: "How long would they be solo on a workday?",
    options: [
      { value: "under2", label: "Barely — someone's usually home" },
      { value: "h2to6", label: "A few hours" },
      { value: "h6to9", label: "Most of the workday" },
      { value: "over9", label: "Long days", hint: "9+ hours" },
    ],
  },
  {
    key: "activity",
    title: "What does an ideal weekend look like?",
    options: [
      { value: "couch", label: "Couch and a good show" },
      { value: "walks", label: "Neighborhood strolls" },
      { value: "runs", label: "Runs or hikes" },
      { value: "adventures", label: "All-day adventures" },
    ],
  },
  {
    key: "kids",
    title: "Any kids at home?",
    options: [
      { value: "none", label: "No kids" },
      { value: "little", label: "Little ones", hint: "Under 6" },
      { value: "big", label: "Bigger kids" },
      { value: "visiting", label: "Kids visit sometimes" },
    ],
  },
  {
    key: "pets",
    title: "Who's already in the family?",
    options: [
      { value: "none", label: "No pets yet" },
      { value: "dogs", label: "Dog(s)" },
      { value: "cats", label: "Cat(s)" },
      { value: "both", label: "Dogs and cats" },
    ],
  },
  {
    key: "experience",
    title: "How much pet experience do you have?",
    options: [
      { value: "first_timer", label: "First-timer" },
      { value: "grew_up", label: "Had pets growing up" },
      { value: "seasoned", label: "Seasoned owner" },
      { value: "rescue_savvy", label: "Rescue-savvy" },
    ],
  },
];

interface QuizState {
  answers: QuizAnswers;
  completedAt: number | null;
  setAnswer: (key: keyof QuizAnswers, value: string) => void;
  complete: () => void;
  reset: () => void;
}

const useQuizStore = create<QuizState>()(
  persist(
    (set) => ({
      answers: {},
      completedAt: null,
      setAnswer: (key, value) =>
        set((state) => ({ answers: { ...state.answers, [key]: value } })),
      complete: () => set({ completedAt: Date.now() }),
      reset: () => set({ answers: {}, completedAt: null }),
    }),
    { name: "pp-quiz" },
  ),
);

/** Hydration-safe accessor, mirroring useFavorites. */
export function useQuizProfile() {
  const store = useQuizStore();
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return {
    hydrated,
    answers: hydrated ? store.answers : {},
    completed: hydrated && store.completedAt !== null,
    setAnswer: store.setAnswer,
    complete: store.complete,
    reset: store.reset,
  };
}

/**
 * Answers -> conservative search filters. Only constraints we're confident in
 * become filters (tri-state unknowns stay includable); softer signals stay
 * badge-only so the quiz never hides most of the inventory.
 */
export function answersToSearchParams(answers: QuizAnswers): URLSearchParams {
  const params = new URLSearchParams();

  const goodWith: string[] = [];
  if (answers.kids === "little" || answers.kids === "big") goodWith.push("kids");
  if (answers.pets === "dogs" || answers.pets === "both") goodWith.push("dogs");
  if (answers.pets === "cats" || answers.pets === "both") goodWith.push("cats");
  if (goodWith.length) params.set("goodWith", goodWith.join(","));

  if (answers.home === "apartment") {
    params.set("size", "xs,s,m");
  }

  if (answers.activity === "couch") {
    params.set("energy", "low,moderate");
  } else if (answers.activity === "adventures" || answers.activity === "runs") {
    params.set("energy", "moderate,high,very_high");
  }

  params.set("from", "quiz");
  return params;
}

export interface FitNote {
  tone: "good" | "check";
  text: string;
}

/** Qualitative fit notes for one pet against the profile. Honest by design:
 *  unknowns route to the shelter, and nothing is scored. */
export function fitNotes(answers: QuizAnswers, pet: Pet): FitNote[] {
  const notes: FitNote[] = [];
  const smallish = pet.size === "xs" || pet.size === "s" || pet.size === "m";
  const calm = pet.energyLevel === "low" || pet.energyLevel === "moderate";

  if (answers.home === "apartment") {
    if (smallish && calm) notes.push({ tone: "good", text: "Good fit: apartment living" });
    else if (pet.size === "xl" || pet.energyLevel === "very_high")
      notes.push({ tone: "check", text: "Check with the shelter: space & energy needs" });
  }

  if (answers.kids === "little" || answers.kids === "big") {
    if (pet.compat.kids === true) notes.push({ tone: "good", text: "Good fit: kids at home" });
    else if (pet.compat.kids === "unknown")
      notes.push({ tone: "check", text: "Ask the shelter: kids at home" });
    else notes.push({ tone: "check", text: "Check with the shelter: kids" });
  }

  if (answers.pets === "dogs" || answers.pets === "both") {
    if (pet.compat.dogs === true) notes.push({ tone: "good", text: "Good fit: your dog" });
    else if (pet.compat.dogs === "unknown")
      notes.push({ tone: "check", text: "Ask the shelter: dog compatibility" });
    else notes.push({ tone: "check", text: "Check with the shelter: dogs at home" });
  }
  if (answers.pets === "cats" || answers.pets === "both") {
    if (pet.compat.cats === true) notes.push({ tone: "good", text: "Good fit: your cat" });
    else if (pet.compat.cats === "unknown")
      notes.push({ tone: "check", text: "Ask the shelter: cat compatibility" });
    else notes.push({ tone: "check", text: "Check with the shelter: cats at home" });
  }

  if (answers.hours === "over9" && (pet.energyLevel === "high" || pet.energyLevel === "very_high")) {
    notes.push({ tone: "check", text: "Check with the shelter: long days alone" });
  }
  if (answers.hours === "under2") {
    notes.push({ tone: "good", text: "Good fit: someone's usually home" });
  }

  if (answers.activity === "adventures" && (pet.energyLevel === "high" || pet.energyLevel === "very_high")) {
    notes.push({ tone: "good", text: "Good fit: adventure buddy" });
  }

  if (answers.experience === "first_timer" && pet.specialNeeds === true) {
    notes.push({ tone: "check", text: "Check with the shelter: special-care needs" });
  }

  return notes.slice(0, 4);
}
