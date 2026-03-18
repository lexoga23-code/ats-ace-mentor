import { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel, convertInchesToTwip } from "docx";

const saveAs = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

export const exportCVToDocx = async (cvText: string) => {
  const lines = cvText.split("\n").filter(Boolean);
  const paragraphs: Paragraph[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const isBullet = trimmed.startsWith("•") || trimmed.startsWith("-") || trimmed.startsWith("–");
    const isHeader = trimmed === trimmed.toUpperCase() && trimmed.length > 3 && trimmed.length < 60 && !isBullet;
    const isName = lines.indexOf(line) === 0 && trimmed === trimmed.toUpperCase();

    if (isName) {
      paragraphs.push(new Paragraph({
        children: [new TextRun({ text: trimmed, bold: true, size: 32, font: "Calibri" })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
      }));
    } else if (isHeader) {
      paragraphs.push(new Paragraph({
        children: [new TextRun({ text: trimmed, bold: true, size: 24, font: "Calibri", color: "2d3748" })],
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 120 },
        border: { bottom: { color: "2d3748", size: 1, space: 4, style: "single" } },
      }));
    } else if (isBullet) {
      paragraphs.push(new Paragraph({
        children: [new TextRun({ text: trimmed.replace(/^[•\-–]\s*/, ""), size: 22, font: "Calibri" })],
        bullet: { level: 0 },
        spacing: { after: 60 },
      }));
    } else if (/\|/.test(trimmed) || (/\d{4}/.test(trimmed) && trimmed.length < 80)) {
      paragraphs.push(new Paragraph({
        children: [new TextRun({ text: trimmed, bold: true, size: 22, font: "Calibri" })],
        spacing: { before: 120, after: 60 },
      }));
    } else {
      paragraphs.push(new Paragraph({
        children: [new TextRun({ text: trimmed, size: 22, font: "Calibri" })],
        spacing: { after: 60 },
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
            left: convertInchesToTwip(1),
            right: convertInchesToTwip(1),
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

  for (const line of lines) {
    const trimmed = line.trim();
    const isObjet = trimmed.toLowerCase().startsWith("objet");

    if (!trimmed) {
      paragraphs.push(new Paragraph({ children: [], spacing: { after: 120 } }));
    } else if (isObjet) {
      paragraphs.push(new Paragraph({
        children: [new TextRun({ text: trimmed, bold: true, underline: {}, size: 22, font: "Calibri" })],
        spacing: { after: 120 },
      }));
    } else {
      paragraphs.push(new Paragraph({
        children: [new TextRun({ text: trimmed, size: 22, font: "Calibri" })],
        spacing: { after: 60 },
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
            left: convertInchesToTwip(1),
            right: convertInchesToTwip(1),
          },
        },
      },
      children: paragraphs,
    }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, "Lettre_ScoreCV.docx");
};
