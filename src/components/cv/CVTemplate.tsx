/**
 * Composant de preview CV avec les nouveaux templates
 * Phase 4 de la refonte templates CV
 *
 * Affiche le CV dans un iframe isolé pour éviter les conflits CSS.
 * Hauteur auto-ajustée au contenu après chargement.
 */

import { useState, useCallback } from "react";
import { Download, FileText } from "lucide-react";
import type { CVData, TemplateId, ColorPaletteId } from "@/lib/cv/types";
import { buildHTML } from "@/lib/cv/templateHTML";

interface CVTemplateProps {
  cvData: CVData;
  templateId: TemplateId;
  colorId: ColorPaletteId;
  onExportPDF: () => void;
  onExportDocx: () => void;
}

const CVTemplate = ({
  cvData,
  templateId,
  colorId,
  onExportPDF,
  onExportDocx,
}: CVTemplateProps) => {
  // Hauteur initiale = A4 à 96dpi (297mm ≈ 1123px)
  const [iframeHeight, setIframeHeight] = useState(1123);

  // Générer le HTML du CV
  const html = buildHTML(cvData, templateId, colorId);

  // Ajuster la hauteur après chargement du contenu
  const handleIframeLoad = useCallback(
    (e: React.SyntheticEvent<HTMLIFrameElement>) => {
      try {
        const iframe = e.currentTarget;
        const doc = iframe.contentDocument;
        if (doc?.body) {
          // Attendre un peu que les polices soient chargées
          setTimeout(() => {
            const height = doc.body.scrollHeight;
            // Minimum 800px, maximum 2000px (2 pages)
            setIframeHeight(Math.min(Math.max(height, 800), 2000));
          }, 100);
        }
      } catch {
        // En cas d'erreur d'accès, garder la hauteur par défaut
      }
    },
    []
  );

  return (
    <div className="space-y-4">
      {/* Boutons d'export */}
      <div className="flex gap-3">
        <button
          onClick={onExportPDF}
          className="flex-1 py-3 bg-foreground text-background rounded-xl font-bold text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2"
        >
          <Download className="w-4 h-4" /> PDF
        </button>
        <button
          onClick={onExportDocx}
          className="flex-1 py-3 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2"
        >
          <FileText className="w-4 h-4" /> Word (.docx)
        </button>
      </div>

      {/* Preview du CV dans un iframe */}
      <div className="bg-white rounded-2xl shadow-soft overflow-hidden border border-border">
        <iframe
          srcDoc={html}
          title="Aperçu du CV"
          onLoad={handleIframeLoad}
          style={{
            width: "100%",
            height: `${iframeHeight}px`,
            border: "none",
            display: "block",
          }}
        />
      </div>
    </div>
  );
};

export default CVTemplate;
