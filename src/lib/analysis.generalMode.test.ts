import { beforeEach, describe, expect, it, vi } from "vitest";

const { invokeMock } = vi.hoisted(() => ({
  invokeMock: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: {
      invoke: invokeMock,
    },
  },
}));

import { generateCoverLetter, rewriteCV } from "./analysis";
import { GENERAL_ANALYSIS_TARGET_JOB } from "./analysisTypes";

describe("general mode AI generation", () => {
  beforeEach(() => {
    invokeMock.mockReset();
  });

  it("routes CV rewriting to the general prompt without inventing a target job", async () => {
    invokeMock.mockResolvedValueOnce({
      data: { text: "JEAN DUPONT\nCHEF DE PROJET DIGITAL\n\nPROFIL PROFESSIONNEL\n..." },
      error: null,
    });

    const rewritten = await rewriteCV(
      "Jean Dupont\nChef de projet digital\nExperience : pilotage CRM",
      GENERAL_ANALYSIS_TARGET_JOB,
      "FR",
      ["pilotage de projet"],
      "general",
    );

    const prompt = invokeMock.mock.calls[0][1].body.prompt as string;

    expect(rewritten).toContain("CHEF DE PROJET DIGITAL");
    expect(prompt).toContain("MODE GÉNÉRAL");
    expect(prompt).not.toContain(`poste de ${GENERAL_ANALYSIS_TARGET_JOB}`);
  });

  it("routes cover letters to spontaneous application JSON and keeps the recruitment fallback recipient", async () => {
    invokeMock.mockResolvedValueOnce({
      data: {
        text: JSON.stringify({
          objet: "Candidature spontanée — Chef de projet digital",
          paragraphs: [
            "J'ai piloté des projets digitaux en environnement CRM.",
            "Mon parcours démontre une capacité à coordonner des équipes et des livrables.",
            "Je souhaite rejoindre une structure digitale à taille humaine.",
            "Je reste à votre disposition pour un entretien à votre convenance.",
          ],
          politesse: "Je vous prie d'agréer, Madame, Monsieur, l'expression de mes sincères salutations.",
        }),
      },
      error: null,
    });

    const html = await generateCoverLetter(
      "Jean Dupont\njean@example.com\nLyon\nChef de projet digital\nPilotage CRM",
      GENERAL_ANALYSIS_TARGET_JOB,
      "FR",
      "",
      "general",
    );

    const prompt = invokeMock.mock.calls[0][1].body.prompt as string;

    expect(prompt).toContain("candidature spontanée");
    expect(prompt).not.toContain("Offre d'emploi :");
    expect(html).toContain("Candidature spontanée");
    expect(html).toContain("Service Recrutement");
  });
});
