import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import AnalysisHistory from "./AnalysisHistory";
import type { AnalysisResult } from "@/lib/analysis";
import { GENERAL_ANALYSIS_TARGET_JOB } from "@/lib/analysisTypes";

const makeResults = (): AnalysisResult => ({
  score: 72,
  scoreDetails: {
    format: 15,
    keywords: 25,
    experience: 18,
    readability: 14,
  },
  sectionScores: [],
  verdict: "Verdict",
  checklist: [],
  keywordsFound: [],
  keywordsMissing: [],
  keywordsSuggested: [],
  suggestions: [],
});

describe("AnalysisHistory", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("treats old entries without analysisMode as targeted and keeps their target job title", () => {
    localStorage.setItem("scorecv_history", JSON.stringify([
      {
        id: "old-targeted",
        date: "2026-04-27T10:00:00.000Z",
        targetJob: "Product Manager",
        score: 72,
        results: makeResults(),
        cvText: "CV",
        jobDescription: "",
        industry: "",
      },
    ]));

    render(<AnalysisHistory onRestore={() => {}} />);
    fireEvent.click(screen.getByText("Historique (1)"));

    expect(screen.getByText("Product Manager")).toBeInTheDocument();
  });

  it("shows the generic title for general history entries", () => {
    localStorage.setItem("scorecv_history", JSON.stringify([
      {
        id: "general",
        date: "2026-04-27T10:00:00.000Z",
        targetJob: GENERAL_ANALYSIS_TARGET_JOB,
        analysisMode: "general",
        score: 68,
        results: makeResults(),
        cvText: "CV",
        jobDescription: "",
        industry: "",
      },
    ]));

    render(<AnalysisHistory onRestore={() => {}} />);
    fireEvent.click(screen.getByText("Historique (1)"));

    expect(screen.getByText(GENERAL_ANALYSIS_TARGET_JOB)).toBeInTheDocument();
  });
});
