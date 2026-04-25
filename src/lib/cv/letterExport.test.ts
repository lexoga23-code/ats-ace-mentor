import { describe, expect, it } from "vitest";
import { buildLetterHTML, extractLetterDataFromHTML } from "./letterHTML";
import { getLetterDocxTextLines } from "../docxExport";
import type { LetterData } from "./types";

const sampleLetter: LetterData = {
  senderName: "Prenom NOM",
  senderPhone: "06 34 56 78 90",
  senderEmail: "pierre.lambert@example.com",
  senderCity: "Bordeaux",
  recipientName: "A l'attention du Service Recrutement",
  recipientDept: "Service Cardiologie",
  recipientAddress: "1 rue de l'Hopital",
  recipientCityZip: "33000 Bordeaux",
  date: "Bordeaux, le 25 avril 2026",
  objet: "Candidature au poste d'infirmier",
  paragraphs: [
    "Votre etablissement attire mon attention pour la qualite de ses soins.",
    "Mon experience hospitaliere m'a appris a travailler avec rigueur.",
    "Je souhaite apporter cette experience a votre equipe.",
  ],
  politesse: "Je vous prie d'agreer, Madame, Monsieur, l'expression de mes sinceres salutations.",
  signatureName: "Prenom NOM",
};

describe("letter export pipeline", () => {
  it("extracts only semantic letter data from the generated HTML", () => {
    const html = buildLetterHTML(sampleLetter);
    const extracted = extractLetterDataFromHTML(html);

    expect(extracted).toMatchObject(sampleLetter);
    expect(extracted.paragraphs).toEqual(sampleLetter.paragraphs);
  });

  it("does not expose CSS or HTML markers to DOCX text generation", () => {
    const html = buildLetterHTML(sampleLetter);
    const extracted = extractLetterDataFromHTML(html);
    const docxText = getLetterDocxTextLines(extracted).join("\n");

    expect(docxText).toContain("Objet : Candidature au poste d'infirmier");
    expect(docxText).not.toMatch(/@import|font-family|letter-page|body-paragraph|<style|<\/html>/i);
  });
});

