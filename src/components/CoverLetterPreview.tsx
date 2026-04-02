import { useState } from "react";
import { Download, FileText, Pencil, Eye } from "lucide-react";
import { exportLetterToDocx } from "@/lib/docxExport";

interface CoverLetterPreviewProps {
  letter: string;
  onChange: (text: string) => void;
}

const CoverLetterPreview = ({ letter, onChange }: CoverLetterPreviewProps) => {
  const [editing, setEditing] = useState(false);

  const handlePrint = () => {
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="generator" content=""><title>\u00A0</title><style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Segoe UI', system-ui, sans-serif; color: #1a1a1a; padding: 60px; max-width: 700px; margin: 0 auto; font-size: 13px; line-height: 1.8; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      p { text-align: justify; hyphens: auto; -webkit-hyphens: auto; }
      .objet { font-weight: 700; text-decoration: underline; margin: 16px 0; }
      .spacer { height: 16px; }
      .date-line { text-align: left !important; margin-top: 8px; margin-bottom: 16px; }
      @media print {
        @page { margin: 1.5cm; size: A4; }
        * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        html { -webkit-print-color-adjust: exact; }
        head, header, footer { display: none !important; visibility: hidden !important; }
      }
    </style></head><body>${renderLetterHTML()}</body></html>`);
    win.document.close();
    win.document.title = "\u00A0";
    setTimeout(() => { win.print(); win.close(); }, 300);
  };

  const renderLetterHTML = () => {
    return letter.split("\n").map(line => {
      const trimmed = line.trim();
      if (!trimmed) return '<div class="spacer"></div>';
      if (trimmed.toLowerCase().startsWith("objet")) return `<p class="objet">${trimmed}</p>`;
      // Date line (contains "le" + date pattern) — left aligned per French/Swiss norms
      const isDateLine = /,\s*le\s+\d{1,2}\s+(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+\d{4}/i.test(trimmed);
      if (isDateLine) return `<p class="date-line">${trimmed}</p>`;
      return `<p>${trimmed}</p>`;
    }).join("");
  };

  const lines = letter.split("\n");

  if (editing) {
    return (
      <div className="space-y-4">
        <div className="flex justify-end">
          <button onClick={() => setEditing(false)} className="flex items-center gap-1.5 text-xs font-bold text-primary hover:underline">
            <Eye className="w-3.5 h-3.5" /> Aperçu
          </button>
        </div>
        <textarea
          value={letter}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-96 p-6 bg-secondary border-none rounded-2xl text-sm leading-relaxed focus:ring-2 focus:ring-primary focus:outline-none text-foreground resize-none font-mono"
        />
      </div>
    );
  }

  // Detect placeholders like [xxx] in the letter
  const hasPlaceholders = /\[[^\]]{2,}\]/.test(letter);

  return (
    <div className="space-y-4">
      {hasPlaceholders && (
        <div className="p-4 rounded-xl border-2 border-destructive/50 bg-destructive/10 text-destructive text-sm font-semibold flex items-start gap-2">
          <span className="text-lg">⚠️</span>
          <span>Pensez à ajouter l'adresse de l'entreprise et à remplacer les éléments entre [crochets] avant d'envoyer cette lettre.</span>
        </div>
      )}
      <div className="flex justify-end">
        <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 text-xs font-bold text-primary hover:underline">
          <Pencil className="w-3.5 h-3.5" /> Modifier
        </button>
      </div>

      {/* Professional letter rendering */}
      <div className="bg-white rounded-2xl shadow-soft border border-border p-10 max-w-[700px] mx-auto" style={{ fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
        {lines.map((line, i) => {
          const trimmed = line.trim();
          if (!trimmed) return <div key={i} style={{ height: 16 }} />;
          if (trimmed.toLowerCase().startsWith("objet")) {
            return <p key={i} style={{ fontWeight: 700, textDecoration: "underline", fontSize: 13, margin: "12px 0" }}>{trimmed}</p>;
          }
          // Detect date line (contains "le" + date pattern like "2 avril 2026") — always left aligned per French/Swiss norms
          const isDateLine = /,\s*le\s+\d{1,2}\s+(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+\d{4}/i.test(trimmed);
          if (isDateLine) {
            return <p key={i} style={{ fontSize: 12, lineHeight: 1.6, color: "#444", textAlign: "left", marginTop: 8, marginBottom: 16 }}>{trimmed}</p>;
          }
          // First few lines = sender info (left aligned, small)
          if (i < 5 && trimmed.length < 60) {
            return <p key={i} style={{ fontSize: 12, lineHeight: 1.6, color: "#444" }}>{trimmed}</p>;
          }
          // Detect recipient block (lines 6-9 area, after blank, NOT a date line)
          if (i >= 5 && i < 10 && trimmed.length < 60 && !trimmed.startsWith("Madame")) {
            return <p key={i} style={{ fontSize: 12, lineHeight: 1.6, color: "#444", textAlign: "right" }}>{trimmed}</p>;
          }
          // Salutation
          if (trimmed.startsWith("Madame") || trimmed.startsWith("Monsieur")) {
            return <p key={i} style={{ fontSize: 13, lineHeight: 1.8, marginTop: 8 }}>{trimmed}</p>;
          }
          // Body paragraphs
          return <p key={i} style={{ fontSize: 13, lineHeight: 1.8, textAlign: "justify" }}>{trimmed}</p>;
        })}
      </div>

      {/* Export buttons */}
      <div className="flex gap-3">
        <button onClick={handlePrint} className="flex-1 py-3 bg-foreground text-background rounded-xl font-bold text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2">
          <Download className="w-4 h-4" /> PDF
        </button>
        <button onClick={() => exportLetterToDocx(letter)} className="flex-1 py-3 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2">
          <FileText className="w-4 h-4" /> Word (.docx)
        </button>
      </div>
    </div>
  );
};

export default CoverLetterPreview;
