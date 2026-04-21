import { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel, convertInchesToTwip, BorderStyle } from "docx";
import { parseCV, formatContact } from "./cv/parser";
import type { CVData } from "./cv/types";

const saveAs = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

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

export const exportCVToDocx = async (cvText: string) => {
  const cvData = parseCV(cvText);
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
  saveAs(blob, "CV_ScoreCV.docx");
};

export const exportLetterToDocx = async (letterText: string) => {
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
