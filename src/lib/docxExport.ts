import { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel, convertInchesToTwip, BorderStyle, Table, TableCell, TableRow, WidthType, TableLayoutType, VerticalAlign } from "docx";
import { parseCV, formatContact } from "./cv/parser";
import type { CVData, LetterData } from "./cv/types";
import { LETTER_LAYOUT } from "./cv/letterLayout";
import { extractLetterDataFromHTML } from "./cv/letterHTML";

const saveAs = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const mmToTwip = (mm: number): number => convertInchesToTwip(mm / 25.4);
const ptToHalfPoints = (pt: number): number => pt * 2;

const noBorder = {
  style: BorderStyle.NIL,
  size: 0,
  color: "FFFFFF",
};

const cleanText = (value?: string): string => (value ?? "").replace(/\s+/g, " ").trim();

const looksLikeHTML = (value: string): boolean => /<\/?[a-z][\s\S]*>/i.test(value);

const createTextParagraph = (
  text: string,
  options: {
    bold?: boolean;
    underline?: boolean;
    sizePt?: number;
    alignment?: (typeof AlignmentType)[keyof typeof AlignmentType];
    before?: number;
    after?: number;
    lineTwip?: number;
    justified?: boolean;
  } = {}
): Paragraph => new Paragraph({
  children: [new TextRun({
    text,
    bold: options.bold,
    underline: options.underline ? {} : undefined,
    size: ptToHalfPoints(options.sizePt ?? LETTER_LAYOUT.bodyFontPt),
    font: LETTER_LAYOUT.docxFont,
  })],
  alignment: options.justified ? AlignmentType.JUSTIFIED : options.alignment,
  spacing: {
    before: options.before ?? 0,
    after: options.after ?? 120,
    line: options.lineTwip ?? LETTER_LAYOUT.bodyLineTwip,
  },
});

export const getLetterDocxTextLines = (letterData: LetterData): string[] => [
  cleanText(letterData.senderName),
  cleanText(letterData.senderPhone),
  cleanText(letterData.senderEmail),
  cleanText(letterData.senderCity),
  cleanText(letterData.recipientName),
  cleanText(letterData.recipientDept),
  cleanText(letterData.recipientAddress),
  cleanText(letterData.recipientCityZip),
  cleanText(letterData.date),
  `Objet : ${cleanText(letterData.objet)}`.trim(),
  "Madame, Monsieur,",
  ...letterData.paragraphs.map(cleanText),
  cleanText(letterData.politesse),
  cleanText(letterData.signatureName),
].filter(Boolean);

// Reconstruit les sections au format legacy depuis CVData
const buildSectionsFromCVData = (data: CVData): { title: string; items: string[] }[] => {
  const sections: { title: string; items: string[] }[] = [];

  // Profil
  if (data.profile) {
    sections.push({
      title: "PROFIL PROFESSIONNEL",
      items: [data.profile]
    });
  }

  // Compétences techniques
  if (data.technicalSkills && data.technicalSkills.length > 0) {
    sections.push({
      title: "COMPÉTENCES",
      items: data.technicalSkills.map(sk => `${sk.category} : ${sk.skills}`)
    });
  }

  // Expériences
  if (data.experiences.length > 0) {
    const items: string[] = [];
    for (const exp of data.experiences) {
      // Header de l'expérience
      const header = [exp.company, exp.location, `${exp.startDate} – ${exp.endDate}`]
        .filter(Boolean)
        .join(" | ");
      items.push(header);

      // Titre du poste
      if (exp.jobTitle) {
        items.push(exp.jobTitle);
      }

      // Bullets
      for (const bullet of exp.bullets) {
        items.push(`• ${bullet}`);
      }
    }
    sections.push({
      title: "EXPÉRIENCE PROFESSIONNELLE",
      items
    });
  }

  // Formation
  if (data.education.length > 0) {
    const items: string[] = [];
    for (const edu of data.education) {
      const line = [edu.degree, edu.school, edu.year]
        .filter(Boolean)
        .join(" — ");
      items.push(line);
      if (edu.description) {
        items.push(edu.description);
      }
    }
    sections.push({
      title: "FORMATION",
      items
    });
  }

  // Certifications
  if (data.certifications && data.certifications.length > 0) {
    const items = data.certifications.map(cert => {
      return [cert.name, cert.issuer, cert.year].filter(Boolean).join(" — ");
    });
    sections.push({
      title: "CERTIFICATIONS",
      items
    });
  }

  // Langues
  if (data.languages && data.languages.length > 0) {
    const items = data.languages.map(lang => {
      return lang.level ? `${lang.language} — ${lang.level}` : lang.language;
    });
    sections.push({
      title: "LANGUES",
      items
    });
  }

  return sections;
};

/**
 * Exporte un CV en format DOCX
 * @param cvTextOrData - Soit le texte brut du CV (string), soit les données CVData directement
 * @param cvDataOverride - Si cvTextOrData est un string, on peut passer un CVData pour l'utiliser à la place du parsing
 */
export const exportCVToDocx = async (cvTextOrData: string | CVData, cvDataOverride?: CVData) => {
  // Déterminer les données CV à utiliser
  let cvData: CVData;
  if (typeof cvTextOrData === "string") {
    // Mode rétrocompatible : cvTextOrData est le texte brut
    // Utiliser cvDataOverride si fourni, sinon parser le texte
    cvData = cvDataOverride ?? parseCV(cvTextOrData);
  } else {
    // Nouveau mode : cvTextOrData est directement un CVData
    cvData = cvTextOrData;
  }

  const contact = formatContact(cvData.contact);
  const sections = buildSectionsFromCVData(cvData);

  const paragraphs: Paragraph[] = [];

  // Name - large, bold, centered
  if (cvData.name) {
    paragraphs.push(new Paragraph({
      children: [new TextRun({ text: cvData.name, bold: true, size: 48, font: "Calibri" })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    }));
  }

  // Job Title - if present
  if (cvData.jobTitle) {
    paragraphs.push(new Paragraph({
      children: [new TextRun({ text: cvData.jobTitle, bold: true, size: 28, font: "Calibri", color: "1a365d" })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    }));
  }

  // Contact - centered, smaller
  if (contact) {
    paragraphs.push(new Paragraph({
      children: [new TextRun({ text: contact, size: 20, font: "Calibri", color: "666666" })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
    }));
  }

  // Sections
  for (const section of sections) {
    // Section title
    paragraphs.push(new Paragraph({
      children: [new TextRun({ text: section.title.toUpperCase(), bold: true, size: 24, font: "Calibri", color: "1a365d" })],
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 300, after: 120 },
      border: { bottom: { color: "1a365d", size: 6, space: 4, style: BorderStyle.SINGLE } },
    }));

    // Section items
    for (const item of section.items) {
      const isBullet = item.startsWith("•") || item.startsWith("-") || item.startsWith("–");
      const isJobTitle = /\|/.test(item) || (/\d{4}/.test(item) && item.length < 100 && !isBullet);

      if (isBullet) {
        paragraphs.push(new Paragraph({
          children: [new TextRun({ text: item.replace(/^[•\-–]\s*/, ""), size: 22, font: "Calibri" })],
          bullet: { level: 0 },
          spacing: { after: 60 },
          indent: { left: convertInchesToTwip(0.25) },
        }));
      } else if (isJobTitle) {
        paragraphs.push(new Paragraph({
          children: [new TextRun({ text: item, bold: true, size: 22, font: "Calibri" })],
          spacing: { before: 180, after: 60 },
        }));
      } else {
        paragraphs.push(new Paragraph({
          children: [new TextRun({ text: item, size: 22, font: "Calibri" })],
          spacing: { after: 60 },
        }));
      }
    }
  }

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: {
            top: convertInchesToTwip(0.8),
            bottom: convertInchesToTwip(0.8),
            left: convertInchesToTwip(0.8),
            right: convertInchesToTwip(0.8),
          },
        },
      },
      children: paragraphs,
    }],
  });

  const blob = await Packer.toBlob(doc);
  const filename = cvData.name
    ? `CV_${cvData.name.replace(/[^a-zA-Z0-9À-ÿ]/g, "_")}.docx`
    : "CV_ScoreCV.docx";
  saveAs(blob, filename);
};

const exportLegacyLetterTextToDocx = async (letterText: string) => {
  const lines = letterText.split("\n");
  const paragraphs: Paragraph[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const isObjet = trimmed.toLowerCase().startsWith("objet");
    const isSalutation = trimmed.startsWith("Madame") || trimmed.startsWith("Monsieur");
    const isSignature = i > lines.length - 5 && trimmed.length < 40 && /^[A-ZÀ-Ü]/.test(trimmed);

    // Date line detection
    const isDateLine = /,\s*le\s+\d{1,2}\s+(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+\d{4}/i.test(trimmed);

    if (!trimmed) {
      paragraphs.push(new Paragraph({ children: [], spacing: { after: 200 } }));
    } else if (isObjet) {
      paragraphs.push(new Paragraph({
        children: [new TextRun({ text: trimmed, bold: true, underline: {}, size: 24, font: "Calibri" })],
        spacing: { before: 200, after: 200 },
      }));
    } else if (isSalutation) {
      paragraphs.push(new Paragraph({
        children: [new TextRun({ text: trimmed, size: 24, font: "Calibri" })],
        spacing: { before: 200, after: 200 },
      }));
    } else if (isDateLine) {
      paragraphs.push(new Paragraph({
        children: [new TextRun({ text: trimmed, size: 22, font: "Calibri" })],
        alignment: AlignmentType.LEFT,
        spacing: { before: 200, after: 300 },
      }));
    } else if (isSignature) {
      paragraphs.push(new Paragraph({
        children: [new TextRun({ text: trimmed, bold: true, size: 24, font: "Calibri" })],
        spacing: { before: 400, after: 100 },
      }));
    } else {
      paragraphs.push(new Paragraph({
        children: [new TextRun({ text: trimmed, size: 24, font: "Calibri" })],
        spacing: { after: 100 },
        alignment: AlignmentType.JUSTIFIED,
      }));
    }
  }

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: {
            top: convertInchesToTwip(1),
            bottom: convertInchesToTwip(1),
            left: convertInchesToTwip(1.2),
            right: convertInchesToTwip(1.2),
          },
        },
      },
      children: paragraphs,
    }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, "Lettre_ScoreCV.docx");
};

const normalizeLetterInput = (letter: LetterData | string): LetterData => {
  if (typeof letter !== "string") {
    return letter;
  }

  if (looksLikeHTML(letter)) {
    return extractLetterDataFromHTML(letter);
  }

  const lines = letter.split("\n").map(cleanText).filter(Boolean);
  const objetIndex = lines.findIndex(line => line.toLowerCase().startsWith("objet"));
  const salutationIndex = lines.findIndex(line => /^(madame|monsieur)/i.test(line));
  const politesseIndex = lines.findIndex(line => /^je vous prie/i.test(line));

  return {
    senderName: lines[0] ?? "",
    senderPhone: lines[1] ?? "",
    senderEmail: lines[2] ?? "",
    senderCity: lines[3] ?? "",
    recipientName: objetIndex > 0 ? lines.slice(4, Math.max(4, objetIndex - 1)).join(", ") : "",
    date: objetIndex > 0 ? lines[objetIndex - 1] : "",
    objet: objetIndex >= 0 ? lines[objetIndex].replace(/^Objet\s*:\s*/i, "") : "",
    paragraphs: lines.slice(
      salutationIndex >= 0 ? salutationIndex + 1 : objetIndex + 1,
      politesseIndex >= 0 ? politesseIndex : Math.max(lines.length - 2, 0)
    ),
    politesse: politesseIndex >= 0 ? lines[politesseIndex] : "",
    signatureName: lines[lines.length - 1] ?? "",
  };
};

export const createLetterDocxDocument = (letter: LetterData | string): Document => {
  const letterData = normalizeLetterInput(letter);
  const pageWidthTwip = convertInchesToTwip(8.27);
  const contentWidthTwip = pageWidthTwip - mmToTwip(LETTER_LAYOUT.page.leftMm + LETTER_LAYOUT.page.rightMm);
  const rightColumnTwip = Math.min(mmToTwip(LETTER_LAYOUT.header.rightBlockWidthMm), Math.round(contentWidthTwip * 0.48));
  const leftColumnTwip = contentWidthTwip - rightColumnTwip;

  const recipientLines = [
    cleanText(letterData.recipientName),
    cleanText(letterData.recipientDept),
    cleanText(letterData.recipientAddress),
    cleanText(letterData.recipientCityZip),
  ].filter(Boolean);

  const senderParagraphs = [
    createTextParagraph(cleanText(letterData.senderName), {
      bold: true,
      sizePt: LETTER_LAYOUT.senderNameFontPt,
      after: 80,
      lineTwip: LETTER_LAYOUT.compactLineTwip,
    }),
    ...[letterData.senderPhone, letterData.senderEmail, letterData.senderCity]
      .map(cleanText)
      .filter(Boolean)
      .map(line => createTextParagraph(line, {
        sizePt: LETTER_LAYOUT.smallFontPt,
        after: 20,
        lineTwip: LETTER_LAYOUT.compactLineTwip,
      })),
  ];

  const recipientParagraphs = [
    new Paragraph({ children: [], spacing: { before: mmToTwip(LETTER_LAYOUT.header.recipientTopOffsetMm), after: 0 } }),
    ...recipientLines.map((line) => createTextParagraph(line, {
      sizePt: LETTER_LAYOUT.smallFontPt,
      after: 20,
      alignment: AlignmentType.RIGHT,
      lineTwip: LETTER_LAYOUT.compactLineTwip,
    })),
    createTextParagraph(cleanText(letterData.date), {
      sizePt: LETTER_LAYOUT.smallFontPt,
      before: 240,
      after: 0,
      alignment: AlignmentType.RIGHT,
      lineTwip: LETTER_LAYOUT.compactLineTwip,
    }),
  ];

  const header = new Table({
    layout: TableLayoutType.FIXED,
    width: { size: contentWidthTwip, type: WidthType.DXA },
    borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder, insideHorizontal: noBorder, insideVertical: noBorder },
    rows: [new TableRow({
      children: [
        new TableCell({
          width: { size: leftColumnTwip, type: WidthType.DXA },
          verticalAlign: VerticalAlign.TOP,
          borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder },
          children: senderParagraphs,
        }),
        new TableCell({
          width: { size: rightColumnTwip, type: WidthType.DXA },
          verticalAlign: VerticalAlign.TOP,
          borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder },
          children: recipientParagraphs,
        }),
      ],
    })],
  });

  const bodyParagraphs: Paragraph[] = [
    new Paragraph({ children: [], spacing: { after: mmToTwip(LETTER_LAYOUT.headerGapMm) } }),
    new Paragraph({
      children: [
        new TextRun({ text: "Objet : ", bold: true, underline: {}, size: ptToHalfPoints(LETTER_LAYOUT.bodyFontPt), font: LETTER_LAYOUT.docxFont }),
        new TextRun({ text: cleanText(letterData.objet), bold: true, underline: {}, size: ptToHalfPoints(LETTER_LAYOUT.bodyFontPt), font: LETTER_LAYOUT.docxFont }),
      ],
      spacing: { after: 240, line: LETTER_LAYOUT.bodyLineTwip },
    }),
    createTextParagraph("Madame, Monsieur,", { after: LETTER_LAYOUT.bodyStartGapTwip }),
    ...letterData.paragraphs
      .map(cleanText)
      .filter(Boolean)
      .map(paragraph => createTextParagraph(paragraph, { justified: true, after: 180, lineTwip: LETTER_LAYOUT.bodyLineTwip })),
    createTextParagraph(cleanText(letterData.politesse), { before: 120, after: 320 }),
    createTextParagraph(cleanText(letterData.signatureName), { bold: true, after: 0 }),
  ];

  return new Document({
    sections: [{
      properties: {
        page: {
          margin: {
            top: mmToTwip(LETTER_LAYOUT.page.topMm),
            bottom: mmToTwip(LETTER_LAYOUT.page.bottomMm),
            left: mmToTwip(LETTER_LAYOUT.page.leftMm),
            right: mmToTwip(LETTER_LAYOUT.page.rightMm),
          },
        },
      },
      children: [header, ...bodyParagraphs],
    }],
  });
};

export const exportLetterToDocx = async (letter: LetterData | string) => {
  const doc = createLetterDocxDocument(letter);
  const blob = await Packer.toBlob(doc);
  saveAs(blob, "Lettre_ScoreCV.docx");
};
