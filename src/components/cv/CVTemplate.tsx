/**
 * Composant de preview CV avec les nouveaux templates
 * Phase 4 de la refonte templates CV
 *
 * Affiche le CV dans un iframe isolé pour éviter les conflits CSS.
 * Hauteur auto-ajustée au contenu après chargement.
 */

import { useState, useCallback, useEffect } from "react";
import { Download, FileText } from "lucide-react";
import type { CVData, TemplateId, ColorPaletteId } from "@/lib/cv/types";
import { buildHTML } from "@/lib/cv/templateHTML";

/**
 * Applique une modification sur un champ du CVData
 * @param cvData - Les données CV actuelles
 * @param field - Le chemin du champ (ex: "experiences.0.bullets.2")
 * @param value - La nouvelle valeur
 * @returns Un nouveau CVData avec la modification appliquée
 */
const applyFieldEdit = (cvData: CVData, field: string, value: string): CVData => {
  // Copie profonde du CVData
  const newData = structuredClone(cvData);

  // Parser le chemin : "experiences.0.bullets.2" → ["experiences", "0", "bullets", "2"]
  const parts = field.split(".");

  // Naviguer jusqu'au parent de la propriété à modifier
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let current: any = newData;

  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    const nextKey = parts[i + 1];

    // Si la clé suivante est un nombre, on accède à un tableau
    if (/^\d+$/.test(nextKey)) {
      current = current[key];
    } else {
      current = current[key];
    }

    // Si on ne trouve pas le chemin, retourner les données inchangées
    if (current === undefined || current === null) {
      console.warn(`[applyFieldEdit] Path not found: ${field}`);
      return cvData;
    }
  }

  // Appliquer la modification sur le dernier élément du chemin
  const lastKey = parts[parts.length - 1];
  if (/^\d+$/.test(lastKey)) {
    // C'est un index de tableau
    current[parseInt(lastKey, 10)] = value;
  } else {
    // C'est une propriété d'objet
    current[lastKey] = value;
  }

  return newData;
};

interface CVTemplateProps {
  cvData: CVData;
  templateId: TemplateId;
  colorId: ColorPaletteId;
  onExportPDF: () => void;
  onExportDocx: () => void;
  onCvDataChange?: (cvData: CVData) => void;
  isEditable?: boolean;
}

const CVTemplate = ({
  cvData,
  templateId,
  colorId,
  onExportPDF,
  onExportDocx,
  onCvDataChange,
  isEditable = false,
}: CVTemplateProps) => {
  // Hauteur initiale = A4 à 96dpi (297mm ≈ 1123px)
  const [iframeHeight, setIframeHeight] = useState(1123);

  // Générer le HTML du CV (avec édition si isEditable)
  const html = buildHTML(cvData, templateId, colorId, isEditable);

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

  // Écouter les messages de l'iframe pour l'édition inline
  useEffect(() => {
    if (!isEditable || !onCvDataChange) return;

    const handleMessage = (event: MessageEvent) => {
      // Vérifier que le message vient de notre origin ou d'un iframe srcDoc ("null")
      const validOrigins = ["null", window.location.origin];
      if (!validOrigins.includes(event.origin)) return;

      // Vérifier que le message est de type cv-edit
      if (event.data?.type !== "cv-edit") return;

      const { field, value } = event.data;
      if (typeof field !== "string" || typeof value !== "string") return;

      // Appliquer la modification et notifier le parent
      const newCvData = applyFieldEdit(cvData, field, value);
      onCvDataChange(newCvData);
    };

    window.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [isEditable, onCvDataChange, cvData]);

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
