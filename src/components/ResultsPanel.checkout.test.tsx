import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ResultsPanel from "./ResultsPanel";
import type { AnalysisResult } from "@/lib/analysis";

const { invokeMock, navigateMock } = vi.hoisted(() => ({
  invokeMock: vi.fn(),
  navigateMock: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "user-1", email: "user@example.com", user_metadata: {} },
  }),
}));

vi.mock("@/contexts/RegionContext", () => ({
  useRegion: () => ({
    currency: "€",
    prices: { single: 4, pro: 12, human: 29 },
  }),
}));

vi.mock("react-router-dom", () => ({
  useNavigate: () => navigateMock,
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: {
      invoke: invokeMock,
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}));

const makeResults = (): AnalysisResult => ({
  score: 64,
  scoreDetails: {
    format: 14,
    keywords: 20,
    experience: 18,
    readability: 12,
  },
  sectionScores: [],
  verdict: "Verdict",
  checklist: [],
  keywordsFound: [],
  keywordsMissing: [],
  keywordsSuggested: [],
  suggestions: [],
  message_upsell: "Débloquez le rapport complet.",
  score_potentiel: 82,
});

describe("ResultsPanel checkout", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    invokeMock.mockReset();
    invokeMock.mockImplementation((functionName: string) => {
      if (functionName === "create-checkout") {
        return Promise.resolve({
          data: { url: "https://checkout.stripe.test/session" },
          error: null,
        });
      }

      return Promise.resolve({ data: null, error: null });
    });
    navigateMock.mockReset();
    vi.spyOn(window, "open").mockImplementation(() => null);
  });

  it("keeps general analysis state before opening Stripe checkout", async () => {
    render(
      <ResultsPanel
        results={makeResults()}
        isPaid={false}
        rewrittenCV=""
        cvText="CV sans poste cible"
        targetJob="Analyse générale du CV"
        analysisMode="general"
        industry=""
        region="FR"
        analysisId="analysis-1"
        jobDescription=""
      />,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: /générer votre cv et débloquer le rapport complet/i,
      })
    );
    fireEvent.click(await screen.findByRole("button", { name: /choisir/i }));

    await waitFor(() => {
      expect(invokeMock).toHaveBeenCalledWith("create-checkout", expect.objectContaining({
        body: expect.objectContaining({
          productType: "report",
          analysisId: "analysis-1",
        }),
      }));
    });

    const persisted = JSON.parse(localStorage.getItem("scorecv_analysis") || "{}");

    expect(persisted.analysisMode).toBe("general");
    expect(persisted.targetJob).toBe("Analyse générale du CV");
    expect(persisted.jobDescription).toBe("");
    expect(persisted.results.score).toBe(64);
    expect(window.open).toHaveBeenCalledWith("https://checkout.stripe.test/session", "_blank");
  });
});
