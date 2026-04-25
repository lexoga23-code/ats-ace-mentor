import { describe, expect, it } from "vitest";
import { sanitizeGeneratedLetterContent } from "./letterContent";

describe("sanitizeGeneratedLetterContent", () => {
  it("removes duplicated salutation from the first generated paragraph", () => {
    const result = sanitizeGeneratedLetterContent({
      objet: "Candidature au poste d'infirmier",
      paragraphs: [
        "Madame, Monsieur, Apres trois ans en cardiologie, je souhaite rejoindre votre equipe.",
        "Mon experience me permet de repondre aux besoins du poste.",
      ],
      politesse: "Je vous prie d'agreer, Madame, Monsieur, l'expression de mes sinceres salutations.",
    });

    expect(result.paragraphs[0]).toBe("Apres trois ans en cardiologie, je souhaite rejoindre votre equipe.");
  });

  it("removes duplicated politeness from the last generated paragraph", () => {
    const result = sanitizeGeneratedLetterContent({
      objet: "Candidature au poste d'infirmier",
      paragraphs: [
        "Je souhaite rejoindre votre equipe.",
        "Je reste disponible pour un entretien. Je vous prie d'agreer, Madame, Monsieur, l'expression de mes sinceres salutations.",
      ],
      politesse: "Je vous prie d'agreer, Madame, Monsieur, l'expression de mes sinceres salutations.",
    });

    expect(result.paragraphs[result.paragraphs.length - 1]).toBe("Je reste disponible pour un entretien.");
  });
});
