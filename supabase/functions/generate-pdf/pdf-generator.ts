/**
 * pdf-generator.ts — Module de génération PDF ATS-optimisé pour ScoreCV
 *
 * Réécriture TypeScript du script Python scorecv_pdf.py
 * Utilise jsPDF pour générer des PDFs compatibles ATS
 */

// @ts-ignore - jsPDF import for Deno
import { jsPDF } from "npm:jspdf@2.5.1";

// ═══════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════

export interface CVHeader {
  name: string;
  phone?: string | null;
  email?: string | null;
  linkedin?: string | null;
  portfolio?: string | null;
  location?: string | null;
  photo?: boolean;
}

export interface CVExperience {
  entreprise: string;
  lieu?: string | null;
  poste: string;
  periode: string;
  bullets: string[];
}

export interface CVFormation {
  diplome: string;
  etablissement: string;
  annee: string;
  detail?: string | null;
}

export interface CVCertification {
  nom: string;
  organisme?: string | null;
  annee?: string | null;
}

export interface CVSkill {
  categorie: string;
  items: string;
}

export interface CVLangue {
  langue: string;
  niveau: string;
}

export interface CVData {
  meta?: { lang?: string; format?: string };
  header: CVHeader;
  profil?: string;
  competences_cles?: string[];
  experience: CVExperience[];
  formation: CVFormation[];
  certifications?: CVCertification[];
  competences_techniques?: CVSkill[];
  langues?: CVLangue[];
}

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
  tagBorder: [204, 251, 241] as [number, number, number],   // Tag border #ccfbf1
};

const FONTS = {
  title: 26,
  sectionTitle: 11,
  body: 10.5,
  small: 10,
  xsmall: 9,
};

const MARGINS = {
  left: 15,
  right: 15,
  top: 16,
  bottom: 16,
};

const PAGE_WIDTH = 210; // A4 width in mm
const CONTENT_WIDTH = PAGE_WIDTH - MARGINS.left - MARGINS.right;

// ═══════════════════════════════════════════
// PDF GENERATOR CLASS
// ═══════════════════════════════════════════

export class CVPDFGenerator {
  private doc: jsPDF;
  private y: number;
  private pageHeight: number;

  constructor() {
    this.doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });
    this.y = MARGINS.top;
    this.pageHeight = 297; // A4 height in mm

    // Set default font
    this.doc.setFont("helvetica");
  }

  private checkPageBreak(neededHeight: number): void {
    if (this.y + neededHeight > this.pageHeight - MARGINS.bottom) {
      this.doc.addPage();
      this.y = MARGINS.top;
    }
  }

  private drawText(
    text: string,
    x: number,
    fontSize: number,
    options: {
      color?: [number, number, number];
      fontStyle?: "normal" | "bold" | "italic";
      maxWidth?: number;
      align?: "left" | "center" | "right";
    } = {}
  ): number {
    const {
      color = COLORS.text,
      fontStyle = "normal",
      maxWidth = CONTENT_WIDTH,
      align = "left",
    } = options;

    this.doc.setFontSize(fontSize);
    this.doc.setTextColor(color[0], color[1], color[2]);
    this.doc.setFont("helvetica", fontStyle);

    const normalized = normalizeATS(text);
    const lines = this.doc.splitTextToSize(normalized, maxWidth);
    const lineHeight = fontSize * 0.4; // Approximate line height in mm

    for (const line of lines) {
      this.checkPageBreak(lineHeight);

      let textX = x;
      if (align === "center") {
        textX = PAGE_WIDTH / 2;
      } else if (align === "right") {
        textX = PAGE_WIDTH - MARGINS.right;
      }

      this.doc.text(line, textX, this.y, { align });
      this.y += lineHeight;
    }

    return lines.length * lineHeight;
  }

  private drawAccentLine(): void {
    const lineY = this.y;
    const gradient = this.doc.setDrawColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
    this.doc.setLineWidth(0.8);
    this.doc.line(MARGINS.left, lineY, PAGE_WIDTH - MARGINS.right, lineY);
    this.y += 3;
  }

  private drawSectionTitle(title: string): void {
    this.checkPageBreak(10);
    this.y += 4;

    this.doc.setFontSize(FONTS.sectionTitle);
    this.doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
    this.doc.setFont("helvetica", "bold");
    this.doc.text(title.toUpperCase(), MARGINS.left, this.y);

    this.y += 2;
    this.doc.setDrawColor(COLORS.border[0], COLORS.border[1], COLORS.border[2]);
    this.doc.setLineWidth(0.4);
    this.doc.line(MARGINS.left, this.y, PAGE_WIDTH - MARGINS.right, this.y);
    this.y += 4;
  }

  private drawHeader(header: CVHeader): void {
    // Name
    this.drawText(header.name || "", MARGINS.left, FONTS.title, {
      fontStyle: "bold",
      align: "left",
    });

    this.y += 1;
    this.drawAccentLine();
    this.y += 2;

    // Contact info
    const contactParts: string[] = [];
    if (header.phone) contactParts.push(header.phone);
    if (header.email) contactParts.push(header.email);
    if (header.linkedin) contactParts.push(header.linkedin);
    if (header.portfolio) contactParts.push(header.portfolio);
    if (header.location) contactParts.push(header.location);

    if (contactParts.length > 0) {
      this.drawText(contactParts.join("  |  "), MARGINS.left, FONTS.small, {
        color: COLORS.textLight,
      });
    }

    this.y += 4;
  }

  private drawProfil(profil: string): void {
    this.drawSectionTitle("Profil professionnel");
    this.drawText(profil, MARGINS.left, FONTS.body, {
      color: [55, 65, 81], // #374151
    });
    this.y += 2;
  }

  private drawCompetencesCles(competences: string[]): void {
    if (!competences || competences.length === 0) return;

    this.drawSectionTitle("Competences cles");

    // Draw tags inline
    let tagX = MARGINS.left;
    const tagHeight = 5;
    const tagPadding = 3;
    const tagGap = 3;

    this.doc.setFontSize(FONTS.xsmall);

    for (const comp of competences) {
      const textWidth = this.doc.getTextWidth(normalizeATS(comp)) + tagPadding * 2;

      // Check if we need to wrap to next line
      if (tagX + textWidth > PAGE_WIDTH - MARGINS.right) {
        tagX = MARGINS.left;
        this.y += tagHeight + 2;
        this.checkPageBreak(tagHeight + 2);
      }

      // Draw tag background
      this.doc.setFillColor(COLORS.tagBg[0], COLORS.tagBg[1], COLORS.tagBg[2]);
      this.doc.setDrawColor(COLORS.tagBorder[0], COLORS.tagBorder[1], COLORS.tagBorder[2]);
      this.doc.roundedRect(tagX, this.y - 3.5, textWidth, tagHeight, 1, 1, "FD");

      // Draw tag text
      this.doc.setTextColor(15, 118, 110); // #0f766e
      this.doc.setFont("helvetica", "normal");
      this.doc.text(normalizeATS(comp), tagX + tagPadding, this.y);

      tagX += textWidth + tagGap;
    }

    this.y += tagHeight + 4;
  }

  private drawExperience(experiences: CVExperience[]): void {
    if (!experiences || experiences.length === 0) return;

    this.drawSectionTitle("Experience professionnelle");

    for (const job of experiences) {
      this.checkPageBreak(20);

      // Company and period on same line
      this.doc.setFontSize(11.5);
      this.doc.setFont("helvetica", "bold");
      this.doc.setTextColor(COLORS.accent[0], COLORS.accent[1], COLORS.accent[2]);
      this.doc.text(normalizeATS(job.entreprise || ""), MARGINS.left, this.y);

      this.doc.setFontSize(FONTS.xsmall);
      this.doc.setTextColor(COLORS.textMuted[0], COLORS.textMuted[1], COLORS.textMuted[2]);
      this.doc.setFont("helvetica", "normal");
      this.doc.text(normalizeATS(job.periode || ""), PAGE_WIDTH - MARGINS.right, this.y, { align: "right" });

      this.y += 4;

      // Position and location
      const positionText = job.lieu
        ? `${job.poste} - ${job.lieu}`
        : job.poste;
      this.drawText(positionText, MARGINS.left, FONTS.body, {
        fontStyle: "bold",
        color: [31, 41, 55], // #1f2937
      });

      this.y += 1;

      // Bullets
      for (const bullet of job.bullets || []) {
        this.checkPageBreak(6);
        this.doc.setFontSize(FONTS.small);
        this.doc.setTextColor(55, 65, 81); // #374151
        this.doc.setFont("helvetica", "normal");

        const bulletText = `• ${normalizeATS(bullet)}`;
        const lines = this.doc.splitTextToSize(bulletText, CONTENT_WIDTH - 5);

        for (let i = 0; i < lines.length; i++) {
          this.checkPageBreak(4);
          this.doc.text(lines[i], MARGINS.left + (i > 0 ? 3 : 0), this.y);
          this.y += 4;
        }
      }

      this.y += 3;
    }
  }

  private drawFormation(formations: CVFormation[]): void {
    if (!formations || formations.length === 0) return;

    this.drawSectionTitle("Formation");

    for (const edu of formations) {
      this.checkPageBreak(10);

      // Diploma and year
      this.doc.setFontSize(FONTS.body);
      this.doc.setFont("helvetica", "bold");
      this.doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);

      const diplomaText = `${normalizeATS(edu.diplome)} - `;
      this.doc.text(diplomaText, MARGINS.left, this.y);

      const diplomaWidth = this.doc.getTextWidth(diplomaText);
      this.doc.setTextColor(COLORS.accent[0], COLORS.accent[1], COLORS.accent[2]);
      this.doc.setFont("helvetica", "normal");
      this.doc.text(normalizeATS(edu.etablissement), MARGINS.left + diplomaWidth, this.y);

      this.doc.setFontSize(FONTS.xsmall);
      this.doc.setTextColor(COLORS.textMuted[0], COLORS.textMuted[1], COLORS.textMuted[2]);
      this.doc.text(normalizeATS(edu.annee || ""), PAGE_WIDTH - MARGINS.right, this.y, { align: "right" });

      this.y += 4;

      if (edu.detail) {
        this.doc.setFontSize(FONTS.xsmall);
        this.doc.setTextColor(COLORS.textLight[0], COLORS.textLight[1], COLORS.textLight[2]);
        this.doc.text(normalizeATS(edu.detail), MARGINS.left, this.y);
        this.y += 4;
      }

      this.y += 2;
    }
  }

  private drawCertifications(certifications: CVCertification[]): void {
    if (!certifications || certifications.length === 0) return;

    this.drawSectionTitle("Certifications");

    for (const cert of certifications) {
      this.checkPageBreak(6);

      this.doc.setFontSize(FONTS.small);
      this.doc.setFont("helvetica", "bold");
      this.doc.setTextColor(55, 65, 81);

      let certText = normalizeATS(cert.nom);
      if (cert.organisme) {
        certText += ` - ${normalizeATS(cert.organisme)}`;
      }
      this.doc.text(certText, MARGINS.left, this.y);

      if (cert.annee) {
        this.doc.setFont("helvetica", "normal");
        this.doc.setTextColor(COLORS.textMuted[0], COLORS.textMuted[1], COLORS.textMuted[2]);
        this.doc.text(normalizeATS(cert.annee), PAGE_WIDTH - MARGINS.right, this.y, { align: "right" });
      }

      this.y += 5;
    }

    this.y += 2;
  }

  private drawCompetencesTechniques(skills: CVSkill[]): void {
    if (!skills || skills.length === 0) return;

    this.drawSectionTitle("Competences techniques");

    for (const skill of skills) {
      this.checkPageBreak(6);

      this.doc.setFontSize(FONTS.small);
      this.doc.setFont("helvetica", "bold");
      this.doc.setTextColor(31, 41, 55);

      const catText = `${normalizeATS(skill.categorie)} : `;
      this.doc.text(catText, MARGINS.left, this.y);

      const catWidth = this.doc.getTextWidth(catText);
      this.doc.setFont("helvetica", "normal");
      this.doc.setTextColor(55, 65, 81);

      const itemsLines = this.doc.splitTextToSize(normalizeATS(skill.items), CONTENT_WIDTH - catWidth);
      this.doc.text(itemsLines[0], MARGINS.left + catWidth, this.y);

      this.y += 4;

      for (let i = 1; i < itemsLines.length; i++) {
        this.checkPageBreak(4);
        this.doc.text(itemsLines[i], MARGINS.left, this.y);
        this.y += 4;
      }
    }

    this.y += 2;
  }

  private drawLangues(langues: CVLangue[]): void {
    if (!langues || langues.length === 0) return;

    this.drawSectionTitle("Langues");

    for (const lang of langues) {
      this.checkPageBreak(6);

      this.doc.setFontSize(FONTS.small);
      this.doc.setFont("helvetica", "bold");
      this.doc.setTextColor(55, 65, 81);
      this.doc.text(normalizeATS(lang.langue), MARGINS.left, this.y);

      this.doc.setFont("helvetica", "normal");
      this.doc.text(` - ${normalizeATS(lang.niveau)}`, MARGINS.left + this.doc.getTextWidth(normalizeATS(lang.langue)), this.y);

      this.y += 5;
    }
  }

  public generate(data: CVData): Uint8Array {
    // Draw all sections
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

    // Return PDF as bytes
    return this.doc.output("arraybuffer") as unknown as Uint8Array;
  }
}

/**
 * Point d'entrée principal - génère un PDF à partir des données CV
 */
export function generatePDF(data: CVData): Uint8Array {
  const generator = new CVPDFGenerator();
  return generator.generate(data);
}
