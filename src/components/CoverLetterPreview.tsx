/**
 * Composant de preview pour les lettres de motivation
 * Affiche le HTML généré dans une iframe isolée
 */

import { useState, useCallback } from "react";
import { Download, FileText } from "lucide-react";
import { exportLetterToDocx } from "@/lib/docxExport";
import { generatePDF } from "@/lib/cv/pdf/generatePDF";

interface CoverLetterPreviewProps {
  letter: string; // HTML complet généré par buildLetterHTML()
  onChange: (text: string) => void;
}

const CoverLetterPreview = ({ letter }: CoverLetterPreviewProps) => {
  // Hauteur initiale = A4 à 96dpi (297mm ≈ 1123px)
  const [iframeHeight, setIframeHeight] = useState(1123);

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
            // Minimum 800px, maximum 1500px (1 page A4)
            setIframeHeight(Math.min(Math.max(height, 800), 1500));
          }, 100);
        }
      } catch {
        // En cas d'erreur d'accès, garder la hauteur par défaut
      }
    },
    []
  );

  // Handler pour export PDF via Browserless
  const handleExportPDF = () => {
    generatePDF(letter, "Lettre_de_motivation");
  };

  // Handler pour export DOCX
  // Note: exportLetterToDocx attend du texte brut, pas du HTML
  // On va extraire le texte depuis le HTML pour l'export Word
  const handleExportDocx = () => {
    // Créer un élément temporaire pour parser le HTML
    const temp = document.createElement('div');
    temp.innerHTML = letter;
    const textContent = temp.innerText || temp.textContent || letter;
    exportLetterToDocx(textContent);
  };

  return (
    <div className="space-y-4">
      {/* Boutons d'export */}
      <div className="flex gap-3">
        <button
          onClick={handleExportPDF}
          className="flex-1 py-3 bg-foreground text-background rounded-xl font-bold text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2"
        >
          <Download className="w-4 h-4" /> PDF
        </button>
        <button
          onClick={handleExportDocx}
          className="flex-1 py-3 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2"
        >
          <FileText className="w-4 h-4" /> Word (.docx)
        </button>
      </div>

      {/* Preview de la lettre dans une iframe */}
      <div className="bg-white rounded-2xl shadow-soft overflow-hidden border border-border">
        <iframe
          srcDoc={letter}
          title="Aperçu de la lettre de motivation"
          onLoad={handleIframeLoad}
          sandbox="allow-same-origin"
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

export default CoverLetterPreview;
