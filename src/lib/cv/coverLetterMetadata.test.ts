import { describe, expect, it } from "vitest";
import {
  RECIPIENT_FALLBACK,
  extractCityFromLine,
  parseRecipientDetails,
  sanitizeSenderAddress,
} from "./coverLetterMetadata";

describe("coverLetterMetadata", () => {
  it("extracts sender city from postal address lines", () => {
    expect(extractCityFromLine("17 rue de Lyon, 69003 Lyon")).toBe("Lyon");
    expect(extractCityFromLine("69008 Marseille")).toBe("Marseille");
  });

  it("drops sender location when it looks like a company name", () => {
    expect(sanitizeSenderAddress("Groupe Textile Rhône, Lyon")).toBe("");
    expect(sanitizeSenderAddress("18 avenue de la Gare, 69002 Lyon")).toBe("18 avenue de la Gare, 69002 Lyon");
  });

  it("falls back to recruitment service when offer data is missing", () => {
    expect(parseRecipientDetails(undefined)).toEqual({ recipientName: RECIPIENT_FALLBACK });
    expect(parseRecipientDetails("")).toEqual({ recipientName: RECIPIENT_FALLBACK });
  });

  it("extracts recipient contact and company address from offer text", () => {
    const offer = [
      "Madame Martin",
      "Entreprise Durand SAS",
      "12 rue des Lilas",
      "75011 Paris",
      "Poste : gestionnaire",
    ].join("\n");

    expect(parseRecipientDetails(offer)).toEqual({
      recipientName: "Madame Martin",
      recipientDept: "Entreprise Durand SAS",
      recipientAddress: "12 rue des Lilas",
      recipientCityZip: "75011 Paris",
    });
  });
});
