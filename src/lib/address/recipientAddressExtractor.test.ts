import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { extractRecipientAddress } from "./recipientAddressExtractor";

const readFixture = (name: string): string =>
  readFileSync(resolve("src/lib/address/__fixtures__", name), "utf-8");

describe("recipientAddressExtractor - France", () => {
  it("should extract complete French address", () => {
    const jobText = `
      Entreprise Tech France
      12 rue de Lyon
      75003 Paris
      Date de publication : 15/04/2025
    `;
    const result = extractRecipientAddress(jobText, "FR");

    expect(result.recipientName).toBe("Service Recrutement");
    expect(result.companyName).toBe("Entreprise Tech France");
    expect(result.addressLine).toBe("12 rue de Lyon");
    expect(result.cityLine).toBe("75003 Paris");
    expect(result.confidence.company).toBeGreaterThanOrEqual(40);
    expect(result.confidence.address).toBeGreaterThanOrEqual(40);
    expect(result.confidence.city).toBeGreaterThanOrEqual(50);
    expect(result.fallbackUsed).toBe(false);
    expect(result.lines).toEqual([
      "Entreprise Tech France",
      "12 rue de Lyon",
      "75003 Paris",
    ]);
    expect(result.rejectedLines).toContainEqual({
      line: expect.stringContaining("Date de publication"),
      reason: "date_pattern",
    });
  });

  it("should use fallback when only noise detected", () => {
    const jobText = `
      3 485 offres disponibles
      21 - 50 employé.e.s
      jobup.ch
      Date : 20/04/2025
    `;
    const result = extractRecipientAddress(jobText, "FR");

    expect(result.recipientName).toBe("Service Recrutement");
    expect(result.companyName).toBeUndefined();
    expect(result.cityLine).toBeUndefined();
    expect(result.fallbackUsed).toBe(true);
    expect(result.lines).toEqual([]);
    expect(result.rejectedLines.length).toBeGreaterThan(0);
  });

  it("should use fallback for LinkedIn without address", () => {
    const jobText = `
      Entreprise Tech Inc.
      Postulez en ligne via LinkedIn
      www.linkedin.com/jobs
    `;
    const result = extractRecipientAddress(jobText, "FR");

    expect(result.fallbackUsed).toBe(true);
    expect(result.lines.length).toBeLessThanOrEqual(1);
  });

  it("should reject lines with HTML entities", () => {
    const jobText = `
      Entreprise &#x27;Tech&#x27; France
      12 rue de &lt;Lyon&gt;
      75003 Paris
    `;
    const result = extractRecipientAddress(jobText, "FR");

    expect(result.rejectedLines).toContainEqual({
      line: expect.stringContaining("&#x27;"),
      reason: "html_entity",
    });
    expect(result.rejectedLines).toContainEqual({
      line: expect.stringContaining("&lt;"),
      reason: "html_entity",
    });
  });

  it("should reject employee count lines", () => {
    const jobText = `
      Entreprise Tech France
      21 - 50 employé.e.s
      12 rue de Lyon
      75003 Paris
    `;
    const result = extractRecipientAddress(jobText, "FR");

    expect(result.rejectedLines).toContainEqual({
      line: expect.stringContaining("21 - 50"),
      reason: "employee_count",
    });
    expect(result.lines).not.toContain("21 - 50 employé.e.s");
  });

  it("should reject French city alone because it is too ambiguous", () => {
    const jobText = `
      Entreprise Tech France
      Lyon
    `;
    const result = extractRecipientAddress(jobText, "FR");

    expect(result.cityLine).toBeUndefined();
    expect(result.confidence.city).toBeLessThan(50);
  });

  it("should keep French postal formats as address lines", () => {
    const jobText = `
      Entreprise Tech France SA
      BP 123
      75008 Paris
    `;
    const result = extractRecipientAddress(jobText, "FR");

    expect(result.addressLine).toBe("BP 123");
    expect(result.confidence.address).toBeGreaterThanOrEqual(40);
    expect(result.lines).toEqual(["Entreprise Tech France SA", "BP 123", "75008 Paris"]);
  });

  it("should not treat generic departments as company names", () => {
    const jobText = `
      Service RH
      75003 Paris
    `;
    const result = extractRecipientAddress(jobText, "FR");

    expect(result.companyName).toBeUndefined();
    expect(result.lines).toEqual(["75003 Paris"]);
  });
});

describe("recipientAddressExtractor - Switzerland", () => {
  it("should extract complete Swiss address", () => {
    const jobText = `
      Hôpital fribourgeois
      1700 Fribourg
      www.jobup.ch
      3 485 offres
    `;
    const result = extractRecipientAddress(jobText, "CH");

    expect(result.companyName).toBe("Hôpital fribourgeois");
    expect(result.cityLine).toBe("1700 Fribourg");
    expect(result.confidence.company).toBeGreaterThanOrEqual(40);
    expect(result.confidence.city).toBeGreaterThanOrEqual(50);
    expect(result.fallbackUsed).toBe(false);
    expect(result.lines).toEqual(["Hôpital fribourgeois", "1700 Fribourg"]);
    expect(result.rejectedLines.length).toBeGreaterThan(0);
  });

  it("should accept Swiss city alone when recognized", () => {
    const jobText = `
      Hôpital fribourgeois
      Fribourg
      Voir plus d'offres
    `;
    const result = extractRecipientAddress(jobText, "CH");

    expect(result.companyName).toBe("Hôpital fribourgeois");
    expect(result.cityLine).toBe("Fribourg");
    expect(result.confidence.city).toBeGreaterThanOrEqual(50);
    expect(result.fallbackUsed).toBe(false);
    expect(result.lines).toEqual(["Hôpital fribourgeois", "Fribourg"]);
  });

  it("should handle realistic jobup fixture", () => {
    const result = extractRecipientAddress(readFixture("jobup_fribourg.txt"), "CH");

    expect(result.companyName).toBe("Hôpital fribourgeois");
    expect(result.cityLine).toBe("1700 Fribourg");
    expect(result.lines).not.toContain("3 485 offres disponibles sur jobup.ch");
    expect(result.lines).not.toContain("21 - 50 employé.e.s");
  });

  it("should handle realistic LinkedIn fixture with Swiss city only", () => {
    const result = extractRecipientAddress(readFixture("linkedin_geneve.txt"), "CH");

    expect(result.companyName).toBe("Tech Innovations Sàrl");
    expect(result.cityLine).toBe("Genève");
    expect(result.lines).toEqual(["Tech Innovations Sàrl", "Genève"]);
  });

  it("should keep Swiss street and postal city address", () => {
    const jobText = `
      Tech Innovations Sarl
      Rue de Lausanne 12
      1201 Geneve
    `;
    const result = extractRecipientAddress(jobText, "CH");

    expect(result.companyName).toBe("Tech Innovations Sarl");
    expect(result.addressLine).toBe("Rue de Lausanne 12");
    expect(result.cityLine).toBe("1201 Geneve");
  });
});

describe("recipientAddressExtractor - fixtures", () => {
  it("should handle realistic indeed fixture", () => {
    const result = extractRecipientAddress(readFixture("indeed_paris.txt"), "FR");

    expect(result.companyName).toBe("Entreprise Tech France SA");
    expect(result.addressLine).toBe("12 rue de Lyon");
    expect(result.cityLine).toBe("75003 Paris");
  });

  it("should reject fixture lines that contain HTML-like markup", () => {
    const result = extractRecipientAddress(readFixture("html_entities.txt"), "FR");

    expect(result.addressLine).toBeUndefined();
    expect(result.cityLine).toBe("75003 Paris");
    expect(result.rejectedLines).toContainEqual({
      line: expect.stringContaining("<Lyon>"),
      reason: "html_entity",
    });
  });
});
