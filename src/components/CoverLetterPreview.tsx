/**
 * Composant de preview pour les lettres de motivation.
 * Affiche le HTML genere dans une iframe isolee et permet une edition structuree.
 */

import { useState, useCallback, useMemo } from "react";
import { Check, Download, Eye, FileText, Pencil } from "lucide-react";
import { exportLetterToDocx } from "@/lib/docxExport";
import { generatePDF } from "@/lib/cv/pdf/generatePDF";
import { buildLetterHTML, extractLetterDataFromHTML } from "@/lib/cv/letterHTML";
import type { LetterData } from "@/lib/cv/types";

interface CoverLetterPreviewProps {
  letter: string; // HTML complet genere par buildLetterHTML()
  onChange: (text: string) => void;
}

const fieldClass =
  "w-full p-3 bg-card rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:outline-none";

const areaClass =
  "w-full min-h-24 p-3 bg-card rounded-xl text-sm leading-relaxed text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:outline-none resize-y";

const CoverLetterPreview = ({ letter, onChange }: CoverLetterPreviewProps) => {
  const [iframeHeight, setIframeHeight] = useState(1123);
  const [editing, setEditing] = useState(false);
  const letterData = useMemo(() => extractLetterDataFromHTML(letter), [letter]);

  const updateLetter = (changes: Partial<LetterData>) => {
    onChange(buildLetterHTML({ ...letterData, ...changes }));
  };

  const updateParagraph = (index: number, value: string) => {
    const paragraphs = [...letterData.paragraphs];
    paragraphs[index] = value;
    updateLetter({ paragraphs });
  };

  const handleIframeLoad = useCallback(
    (e: React.SyntheticEvent<HTMLIFrameElement>) => {
      try {
        const iframe = e.currentTarget;
        const doc = iframe.contentDocument;
        if (doc?.body) {
          setTimeout(() => {
            const height = doc.body.scrollHeight;
            setIframeHeight(Math.min(Math.max(height, 800), 1500));
          }, 100);
        }
      } catch {
        // Keep the default iframe height if the preview cannot be inspected.
      }
    },
    []
  );

  const handleExportPDF = () => {
    generatePDF(letter, "Lettre_de_motivation");
  };

  const handleExportDocx = () => {
    exportLetterToDocx(letterData);
  };

  if (editing) {
    return (
      <div className="space-y-4">
        <div className="flex justify-end gap-2">
          <button
            onClick={() => setEditing(false)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-all"
          >
            <Check className="w-3.5 h-3.5" /> Termine
          </button>
          <button
            onClick={() => setEditing(false)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-background border border-border text-xs font-bold hover:bg-secondary transition-all"
          >
            <Eye className="w-3.5 h-3.5" /> Apercu
          </button>
        </div>

        <div className="space-y-4 p-4 bg-secondary/50 rounded-2xl">
          <div className="grid md:grid-cols-2 gap-3">
            <input
              value={letterData.senderName}
              onChange={(e) => updateLetter({ senderName: e.target.value })}
              placeholder="Nom expediteur"
              className={fieldClass}
            />
            <input
              value={letterData.senderPhone}
              onChange={(e) => updateLetter({ senderPhone: e.target.value })}
              placeholder="Telephone"
              className={fieldClass}
            />
            <input
              value={letterData.senderEmail}
              onChange={(e) => updateLetter({ senderEmail: e.target.value })}
              placeholder="Email"
              className={fieldClass}
            />
            <input
              value={letterData.senderCity}
              onChange={(e) => updateLetter({ senderCity: e.target.value })}
              placeholder="Ville"
              className={fieldClass}
            />
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <input
              value={letterData.recipientName}
              onChange={(e) => updateLetter({ recipientName: e.target.value })}
              placeholder="Destinataire"
              className={fieldClass}
            />
            <input
              value={letterData.recipientDept ?? ""}
              onChange={(e) => updateLetter({ recipientDept: e.target.value })}
              placeholder="Service"
              className={fieldClass}
            />
            <input
              value={letterData.recipientAddress ?? ""}
              onChange={(e) => updateLetter({ recipientAddress: e.target.value })}
              placeholder="Adresse"
              className={fieldClass}
            />
            <input
              value={letterData.recipientCityZip ?? ""}
              onChange={(e) => updateLetter({ recipientCityZip: e.target.value })}
              placeholder="Code postal et ville"
              className={fieldClass}
            />
          </div>

          <input
            value={letterData.date}
            onChange={(e) => updateLetter({ date: e.target.value })}
            placeholder="Date"
            className={fieldClass}
          />

          <input
            value={letterData.objet}
            onChange={(e) => updateLetter({ objet: e.target.value })}
            placeholder="Objet"
            className={fieldClass}
          />

          <div className="space-y-3">
            {letterData.paragraphs.map((paragraph, index) => (
              <textarea
                key={index}
                value={paragraph}
                onChange={(e) => updateParagraph(index, e.target.value)}
                placeholder={`Paragraphe ${index + 1}`}
                className={areaClass}
              />
            ))}
          </div>

          <textarea
            value={letterData.politesse}
            onChange={(e) => updateLetter({ politesse: e.target.value })}
            placeholder="Formule de politesse"
            className="w-full min-h-20 p-3 bg-card rounded-xl text-sm leading-relaxed text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:outline-none resize-y"
          />

          <input
            value={letterData.signatureName}
            onChange={(e) => updateLetter({ signatureName: e.target.value })}
            placeholder="Signature"
            className={fieldClass}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => setEditing(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-background border border-border text-xs font-bold hover:bg-secondary transition-all"
        >
          <Pencil className="w-3.5 h-3.5" /> Modifier
        </button>
      </div>

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

      <div className="bg-white rounded-2xl shadow-soft overflow-hidden border border-border">
        <iframe
          srcDoc={letter}
          title="Apercu de la lettre de motivation"
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
