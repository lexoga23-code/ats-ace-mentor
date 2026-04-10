import { jsPDF } from "jspdf";
import { CVJsonData } from "./analysis";

// ═══════════════════════════════════════════
// ATS TEXT NORMALIZATION
// ═══════════════════════════════════════════

const ATS_REPLACEMENTS: Record<string, string> = {
  "\u2014": "-",     // em-dash → hyphen
  "\u2013": "-",     // en-dash → hyphen
  "\u201C": '"',     // left double smart quote
  "\u201D": '"',     // right double smart quote
  "\u201E": '"',     // double low-9 quote
  "\u2018": "'",     // left single smart quote
  "\u2019": "'",     // right single smart quote
  "\u201A": "'",     // single low-9 quote
  "\u2026": "...",   // horizontal ellipsis
  "\u00A0": " ",     // non-breaking space
};

const ZERO_WIDTH_RE = /[\u200B\u200C\u200D\u2060\uFEFF]/g;

function normalizeATS(text: string): string {
  if (!text) return "";
  let result = text;
  for (const [char, repl] of Object.entries(ATS_REPLACEMENTS)) {
    result = result.split(char).join(repl);
  }
  return result.replace(ZERO_WIDTH_RE, "");
}

// ═══════════════════════════════════════════
// PDF STYLING CONSTANTS
// ═══════════════════════════════════════════

const COLORS = {
  primary: [13, 148, 136] as [number, number, number],      // Teal #0d9488
  accent: [124, 58, 237] as [number, number, number],       // Purple #7c3aed
  text: [26, 26, 46] as [number, number, number],           // Dark #1a1a2e
  textLight: [107, 114, 128] as [number, number, number],   // Gray #6b7280
  textMuted: [156, 163, 175] as [number, number, number],   // Light gray #9ca3af
  border: [229, 231, 235] as [number, number, number],      // Border #e5e7eb
  tagBg: [240, 253, 250] as [number, number, number],       // Tag bg #f0fdfa
  tagText: [15, 118, 110] as [number, number, number],      // Tag text #0f766e
};

const FONTS = {
  title: 24,
  sectionTitle: 11,
  body: 10,
  small: 9,
  xsmall: 8,
};

const MARGINS = {
  left: 15,
  right: 15,
  top: 15,
  bottom: 15,
};

const PAGE_WIDTH = 210; // A4 width in mm
const PAGE_HEIGHT = 297; // A4 height in mm
const CONTENT_WIDTH = PAGE_WIDTH - MARGINS.left - MARGINS.right;

// ═══════════════════════════════════════════
// PDF GENERATOR CLASS (Browser version)
// ═══════════════════════════════════════════

class CVPDFGenerator {
  private doc: jsPDF;
  private y: number;

  constructor() {
    this.doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });
    this.y = MARGINS.top;
    this.doc.setFont("helvetica");
  }

  private checkPageBreak(neededHeight: number): void {
    if (this.y + neededHeight > PAGE_HEIGHT - MARGINS.bottom) {
      this.doc.addPage();
      this.y = MARGINS.top;
    }
  }

  private drawAccentLine(): void {
    // Gradient line (teal to purple approximation)
    const lineY = this.y;
    this.doc.setDrawColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
    this.doc.setLineWidth(0.8);
    this.doc.line(MARGINS.left, lineY, MARGINS.left + CONTENT_WIDTH / 2, lineY);
    this.doc.setDrawColor(COLORS.accent[0], COLORS.accent[1], COLORS.accent[2]);
    this.doc.line(MARGINS.left + CONTENT_WIDTH / 2, lineY, PAGE_WIDTH - MARGINS.right, lineY);
    this.y += 3;
  }

  private drawSectionTitle(title: string): void {
    this.checkPageBreak(12);
    this.y += 5;

    this.doc.setFontSize(FONTS.sectionTitle);
    this.doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
    this.doc.setFont("helvetica", "bold");
    this.doc.text(title.toUpperCase(), MARGINS.left, this.y);

    this.y += 2;
    this.doc.setDrawColor(COLORS.border[0], COLORS.border[1], COLORS.border[2]);
    this.doc.setLineWidth(0.3);
    this.doc.line(MARGINS.left, this.y, PAGE_WIDTH - MARGINS.right, this.y);
    this.y += 5;
  }

  private drawHeader(header: CVJsonData["header"]): void {
    // Name
    this.doc.setFontSize(FONTS.title);
    this.doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
    this.doc.setFont("helvetica", "bold");
    this.doc.text(normalizeATS(header.name || ""), MARGINS.left, this.y);
    this.y += 8;

    this.drawAccentLine();
    this.y += 2;

    // Contact info
    const contactParts: string[] = [];
    if (header.phone) contactParts.push(header.phone);
    if (header.email) contactParts.push(header.email);
    if (header.linkedin) contactParts.push(header.linkedin);
    if (header.location) contactParts.push(header.location);

    if (contactParts.length > 0) {
      this.doc.setFontSize(FONTS.small);
      this.doc.setTextColor(COLORS.textLight[0], COLORS.textLight[1], COLORS.textLight[2]);
      this.doc.setFont("helvetica", "normal");
      this.doc.text(normalizeATS(contactParts.join("  |  ")), MARGINS.left, this.y);
      this.y += 5;
    }

    this.y += 3;
  }

  private drawProfil(profil: string): void {
    this.drawSectionTitle("Profil professionnel");

    this.doc.setFontSize(FONTS.body);
    this.doc.setTextColor(55, 65, 81);
    this.doc.setFont("helvetica", "normal");

    const lines = this.doc.splitTextToSize(normalizeATS(profil), CONTENT_WIDTH);
    for (const line of lines) {
      this.checkPageBreak(5);
      this.doc.text(line, MARGINS.left, this.y);
      this.y += 4.5;
    }
    this.y += 2;
  }

  private drawCompetencesCles(competences: string[]): void {
    if (!competences || competences.length === 0) return;

    this.drawSectionTitle("Competences cles");

    // Draw tags inline
    let tagX = MARGINS.left;
    const tagHeight = 5;
    const tagPadding = 2.5;
    const tagGap = 2;

    this.doc.setFontSize(FONTS.xsmall);

    for (const comp of competences) {
      const text = normalizeATS(comp);
      const textWidth = this.doc.getTextWidth(text) + tagPadding * 2;

      // Check if we need to wrap to next line
      if (tagX + textWidth > PAGE_WIDTH - MARGINS.right) {
        tagX = MARGINS.left;
        this.y += tagHeight + 2;
        this.checkPageBreak(tagHeight + 2);
      }

      // Draw tag background
      this.doc.setFillColor(COLORS.tagBg[0], COLORS.tagBg[1], COLORS.tagBg[2]);
      this.doc.roundedRect(tagX, this.y - 3.5, textWidth, tagHeight, 1, 1, "F");

      // Draw tag text
      this.doc.setTextColor(COLORS.tagText[0], COLORS.tagText[1], COLORS.tagText[2]);
      this.doc.setFont("helvetica", "normal");
      this.doc.text(text, tagX + tagPadding, this.y);

      tagX += textWidth + tagGap;
    }

    this.y += tagHeight + 4;
  }

  private drawExperience(experiences: CVJsonData["experience"]): void {
    if (!experiences || experiences.length === 0) return;

    this.drawSectionTitle("Experience professionnelle");

    for (const job of experiences) {
      this.checkPageBreak(20);

      // Company name
      this.doc.setFontSize(11);
      this.doc.setFont("helvetica", "bold");
      this.doc.setTextColor(COLORS.accent[0], COLORS.accent[1], COLORS.accent[2]);
      this.doc.text(normalizeATS(job.entreprise || ""), MARGINS.left, this.y);

      // Period (right aligned)
      this.doc.setFontSize(FONTS.xsmall);
      this.doc.setTextColor(COLORS.textMuted[0], COLORS.textMuted[1], COLORS.textMuted[2]);
      this.doc.setFont("helvetica", "normal");
      const periodText = normalizeATS(job.periode || "");
      const periodWidth = this.doc.getTextWidth(periodText);
      this.doc.text(periodText, PAGE_WIDTH - MARGINS.right - periodWidth, this.y);

      this.y += 4.5;

      // Position and location
      const positionText = job.lieu
        ? `${job.poste} - ${job.lieu}`
        : job.poste;
      this.doc.setFontSize(FONTS.body);
      this.doc.setFont("helvetica", "bold");
      this.doc.setTextColor(31, 41, 55);
      this.doc.text(normalizeATS(positionText), MARGINS.left, this.y);
      this.y += 5;

      // Bullets
      this.doc.setFont("helvetica", "normal");
      this.doc.setTextColor(55, 65, 81);
      this.doc.setFontSize(FONTS.small);

      for (const bullet of job.bullets || []) {
        this.checkPageBreak(6);
        const bulletText = normalizeATS(bullet);
        const lines = this.doc.splitTextToSize(bulletText, CONTENT_WIDTH - 5);

        for (let i = 0; i < lines.length; i++) {
          this.checkPageBreak(4);
          if (i === 0) {
            this.doc.text(`•  ${lines[i]}`, MARGINS.left, this.y);
          } else {
            this.doc.text(lines[i], MARGINS.left + 4, this.y);
          }
          this.y += 4;
        }
      }

      this.y += 4;
    }
  }

  private drawFormation(formations: CVJsonData["formation"]): void {
    if (!formations || formations.length === 0) return;

    this.drawSectionTitle("Formation");

    for (const edu of formations) {
      this.checkPageBreak(10);

      // Diploma
      this.doc.setFontSize(FONTS.body);
      this.doc.setFont("helvetica", "bold");
      this.doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);

      const diplomaText = normalizeATS(edu.diplome || "");
      this.doc.text(diplomaText, MARGINS.left, this.y);

      // Etablissement (in accent color)
      const diplomaWidth = this.doc.getTextWidth(diplomaText + " - ");
      this.doc.setTextColor(COLORS.accent[0], COLORS.accent[1], COLORS.accent[2]);
      this.doc.setFont("helvetica", "normal");
      this.doc.text(" - " + normalizeATS(edu.etablissement || ""), MARGINS.left + diplomaWidth - 3, this.y);

      // Year (right aligned)
      this.doc.setFontSize(FONTS.xsmall);
      this.doc.setTextColor(COLORS.textMuted[0], COLORS.textMuted[1], COLORS.textMuted[2]);
      const yearText = normalizeATS(edu.annee || "");
      const yearWidth = this.doc.getTextWidth(yearText);
      this.doc.text(yearText, PAGE_WIDTH - MARGINS.right - yearWidth, this.y);

      this.y += 5;

      if (edu.detail) {
        this.doc.setFontSize(FONTS.xsmall);
        this.doc.setTextColor(COLORS.textLight[0], COLORS.textLight[1], COLORS.textLight[2]);
        this.doc.text(normalizeATS(edu.detail), MARGINS.left, this.y);
        this.y += 4;
      }

      this.y += 2;
    }
  }

  private drawCompetencesTechniques(skills: CVJsonData["competences_techniques"]): void {
    if (!skills || skills.length === 0) return;

    this.drawSectionTitle("Competences techniques");

    for (const skill of skills) {
      this.checkPageBreak(6);

      this.doc.setFontSize(FONTS.small);
      this.doc.setFont("helvetica", "bold");
      this.doc.setTextColor(31, 41, 55);

      const catText = normalizeATS(skill.categorie) + " : ";
      this.doc.text(catText, MARGINS.left, this.y);

      const catWidth = this.doc.getTextWidth(catText);
      this.doc.setFont("helvetica", "normal");
      this.doc.setTextColor(55, 65, 81);

      const itemsText = normalizeATS(skill.items);
      const availableWidth = CONTENT_WIDTH - catWidth;
      const itemsLines = this.doc.splitTextToSize(itemsText, availableWidth);

      this.doc.text(itemsLines[0], MARGINS.left + catWidth, this.y);
      this.y += 4.5;

      for (let i = 1; i < itemsLines.length; i++) {
        this.checkPageBreak(4);
        this.doc.text(itemsLines[i], MARGINS.left, this.y);
        this.y += 4;
      }
    }

    this.y += 2;
  }

  private drawLangues(langues: CVJsonData["langues"]): void {
    if (!langues || langues.length === 0) return;

    this.drawSectionTitle("Langues");

    for (const lang of langues) {
      this.checkPageBreak(5);

      this.doc.setFontSize(FONTS.small);
      this.doc.setFont("helvetica", "bold");
      this.doc.setTextColor(55, 65, 81);

      const langText = normalizeATS(lang.langue);
      this.doc.text(langText, MARGINS.left, this.y);

      this.doc.setFont("helvetica", "normal");
      this.doc.text(" - " + normalizeATS(lang.niveau), MARGINS.left + this.doc.getTextWidth(langText), this.y);

      this.y += 4.5;
    }
  }

  private drawCertifications(certifications: CVJsonData["certifications"]): void {
    if (!certifications || certifications.length === 0) return;

    this.drawSectionTitle("Certifications");

    for (const cert of certifications) {
      this.checkPageBreak(5);

      this.doc.setFontSize(FONTS.small);
      this.doc.setFont("helvetica", "bold");
      this.doc.setTextColor(55, 65, 81);

      let certText = normalizeATS(cert.nom);
      if (cert.organisme) {
        certText += " - " + normalizeATS(cert.organisme);
      }
      this.doc.text(certText, MARGINS.left, this.y);

      if (cert.annee) {
        this.doc.setFont("helvetica", "normal");
        this.doc.setTextColor(COLORS.textMuted[0], COLORS.textMuted[1], COLORS.textMuted[2]);
        const yearText = normalizeATS(cert.annee);
        const yearWidth = this.doc.getTextWidth(yearText);
        this.doc.text(yearText, PAGE_WIDTH - MARGINS.right - yearWidth, this.y);
      }

      this.y += 4.5;
    }
  }

  public generate(data: CVJsonData): jsPDF {
    this.drawHeader(data.header);

    if (data.profil) {
      this.drawProfil(data.profil);
    }

    if (data.competences_cles && data.competences_cles.length > 0) {
      this.drawCompetencesCles(data.competences_cles);
    }

    this.drawExperience(data.experience);
    this.drawFormation(data.formation);

    if (data.certifications && data.certifications.length > 0) {
      this.drawCertifications(data.certifications);
    }

    if (data.competences_techniques && data.competences_techniques.length > 0) {
      this.drawCompetencesTechniques(data.competences_techniques);
    }

    if (data.langues && data.langues.length > 0) {
      this.drawLangues(data.langues);
    }

    return this.doc;
  }
}

// ═══════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════

/**
 * Génère un PDF directement dans le navigateur (mode test)
 * TODO: Remplacer par l'appel à l'edge function en production
 */
export const generatePDF = async (
  cvData: CVJsonData,
  _userId?: string,
  _analysisId?: string
): Promise<{ blob: Blob; filename: string }> => {
  const generator = new CVPDFGenerator();
  const doc = generator.generate(cvData);

  const blob = doc.output("blob");
  const filename = `CV_${cvData.header.name.replace(/\s+/g, "_")}.pdf`;

  return { blob, filename };
};

/**
 * Télécharge le PDF directement (mode test - génération browser)
 */
export const downloadPDF = async (
  cvData: CVJsonData,
  userId?: string,
  analysisId?: string
): Promise<void> => {
  const { blob, filename } = await generatePDF(cvData, userId, analysisId);

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Parse le texte CV JSON retourné par rewriteCV()
 */
export const parseCVJson = (jsonString: string): CVJsonData | null => {
  try {
    const data = JSON.parse(jsonString);
    // Validation basique
    if (!data.header || !data.header.name) {
      console.error("JSON CV invalide: header.name manquant");
      return null;
    }
    return data as CVJsonData;
  } catch (e) {
    // Ce n'est pas du JSON, c'est probablement du texte brut (ancien format)
    return null;
  }
};

/**
 * Convertit les données CV JSON en texte formaté pour l'affichage legacy
 */
export const cvJsonToText = (data: CVJsonData): string => {
  const lines: string[] = [];

  // Header
  lines.push(data.header.name.toUpperCase());
  const contactParts: string[] = [];
  if (data.header.email) contactParts.push(data.header.email);
  if (data.header.phone) contactParts.push(data.header.phone);
  if (data.header.location) contactParts.push(data.header.location);
  if (data.header.linkedin) contactParts.push(data.header.linkedin);
  if (contactParts.length > 0) {
    lines.push(contactParts.join(" | "));
  }
  lines.push("");

  // Profil
  if (data.profil) {
    lines.push("PROFIL PROFESSIONNEL");
    lines.push(data.profil);
    lines.push("");
  }

  // Compétences clés
  if (data.competences_cles && data.competences_cles.length > 0) {
    lines.push("COMPÉTENCES CLÉS");
    lines.push(data.competences_cles.join(" • "));
    lines.push("");
  }

  // Expérience
  if (data.experience && data.experience.length > 0) {
    lines.push("EXPÉRIENCE PROFESSIONNELLE");
    for (const exp of data.experience) {
      const header = exp.lieu
        ? `${exp.entreprise} - ${exp.lieu} | ${exp.poste} | ${exp.periode}`
        : `${exp.entreprise} | ${exp.poste} | ${exp.periode}`;
      lines.push(header);
      for (const bullet of exp.bullets) {
        lines.push(`• ${bullet}`);
      }
      lines.push("");
    }
  }

  // Formation
  if (data.formation && data.formation.length > 0) {
    lines.push("FORMATION");
    for (const edu of data.formation) {
      lines.push(`${edu.diplome} - ${edu.etablissement} | ${edu.annee}`);
      if (edu.detail) lines.push(edu.detail);
    }
    lines.push("");
  }

  // Compétences techniques
  if (data.competences_techniques && data.competences_techniques.length > 0) {
    lines.push("COMPÉTENCES TECHNIQUES");
    for (const skill of data.competences_techniques) {
      lines.push(`${skill.categorie} : ${skill.items}`);
    }
    lines.push("");
  }

  // Langues
  if (data.langues && data.langues.length > 0) {
    lines.push("LANGUES");
    for (const lang of data.langues) {
      lines.push(`${lang.langue} - ${lang.niveau}`);
    }
    lines.push("");
  }

  // Certifications
  if (data.certifications && data.certifications.length > 0) {
    lines.push("CERTIFICATIONS");
    for (const cert of data.certifications) {
      const certLine = cert.organisme
        ? `${cert.nom} - ${cert.organisme}${cert.annee ? ` (${cert.annee})` : ""}`
        : `${cert.nom}${cert.annee ? ` (${cert.annee})` : ""}`;
      lines.push(certLine);
    }
  }

  return lines.join("\n");
};
