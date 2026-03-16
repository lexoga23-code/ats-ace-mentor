declare global {
  interface Window {
    pdfjsLib: any;
    mammoth: any;
  }
}

export const extractPdf = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const typedarray = new Uint8Array(arrayBuffer);
  const pdf = await window.pdfjsLib.getDocument(typedarray).promise;
  let fullText = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    fullText += content.items.map((item: any) => item.str).join(" ");
  }
  return fullText;
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
