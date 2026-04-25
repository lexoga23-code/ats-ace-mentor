declare global {
  interface Window {
    pdfjsLib: any;
    mammoth: any;
  }
}

type PdfTextItem = {
  str?: string;
  transform?: number[];
  hasEOL?: boolean;
};

const normalizeExtractedLine = (line: string): string =>
  line.replace(/\s+/g, " ").trim();

export const extractPdf = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const typedarray = new Uint8Array(arrayBuffer);
  const pdf = await window.pdfjsLib.getDocument(typedarray).promise;

  const pages: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();

    const lines: string[] = [];
    let currentLine: string[] = [];
    let lastY: number | null = null;

    for (const rawItem of content.items as PdfTextItem[]) {
      const text = normalizeExtractedLine(rawItem?.str ?? "");
      if (!text) continue;

      const y = Array.isArray(rawItem.transform) && typeof rawItem.transform[5] === "number"
        ? rawItem.transform[5]
        : null;

      const yBreak = y !== null && lastY !== null && Math.abs(y - lastY) > 2.5;
      if (yBreak && currentLine.length > 0) {
        lines.push(normalizeExtractedLine(currentLine.join(" ")));
        currentLine = [];
      }

      currentLine.push(text);
      if (y !== null) {
        lastY = y;
      }

      if (rawItem.hasEOL) {
        lines.push(normalizeExtractedLine(currentLine.join(" ")));
        currentLine = [];
        lastY = null;
      }
    }

    if (currentLine.length > 0) {
      lines.push(normalizeExtractedLine(currentLine.join(" ")));
    }

    const pageText = lines.filter(Boolean).join("\n").trim();
    if (pageText) {
      pages.push(pageText);
    }
  }

  return pages.join("\n\n").trim();
};

export const extractDocx = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const result = await window.mammoth.extractRawText({ arrayBuffer });
  return result.value;
};

export const extractText = async (file: File): Promise<string> => {
  if (file.type === "application/pdf") {
    return extractPdf(file);
  }
  if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    return extractDocx(file);
  }
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.readAsText(file);
  });
};
