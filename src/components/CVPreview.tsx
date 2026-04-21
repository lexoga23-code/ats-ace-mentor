import { useState } from "react";
import { exportCVToDocx } from "@/lib/docxExport";
import { parseCV } from "@/lib/cv/parser";
import { buildHTML } from "@/lib/cv/templateHTML";
import { generatePDF } from "@/lib/cv/pdf/generatePDF";
import type { TemplateId, ColorPaletteId } from "@/lib/cv/types";
import CVTemplate from "@/components/cv/CVTemplate";
import TemplateSelector from "@/components/cv/TemplateSelector";
import ColorSelector from "@/components/cv/ColorSelector";

interface CVPreviewProps {
  cvText: string;
  onChange: (text: string) => void;
}

const CVPreview = ({ cvText }: CVPreviewProps) => {
  const [templateId, setTemplateId] = useState<TemplateId>("careerops");
  const [colorId, setColorId] = useState<ColorPaletteId>("sarcelle");

  // Parser le CV
  const cvData = parseCV(cvText);

  // Générer le nom de fichier
  const filename = cvData.name
    ? `CV_${cvData.name.replace(/[^a-zA-Z0-9À-ÿ]/g, "_")}`
    : "CV_ScoreCV";

  // Handler pour export PDF
  const handleExportPDF = () => {
    const html = buildHTML(cvData, templateId, colorId);
    generatePDF(html, filename);
  };

  // Handler pour export DOCX
  const handleExportDocx = () => {
    exportCVToDocx(cvText);
  };

  return (
    <div className="space-y-6">
      <TemplateSelector
        selected={templateId}
        onChange={setTemplateId}
      />

      <ColorSelector
        selected={colorId}
        onChange={setColorId}
      />

      <CVTemplate
        cvData={cvData}
        templateId={templateId}
        colorId={colorId}
        onExportPDF={handleExportPDF}
        onExportDocx={handleExportDocx}
      />
    </div>
  );
};

export default CVPreview;
