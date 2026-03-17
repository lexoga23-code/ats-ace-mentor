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
    win.document.write(`<!DOCTYPE html><html><head><title>Lettre</title><style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Segoe UI', system-ui, sans-serif; color: #1a1a1a; padding: 60px; max-width: 700px; margin: 0 auto; font-size: 13px; line-height: 1.8; }
      .objet { font-weight: 700; text-decoration: underline; margin: 16px 0; }
      .spacer { height: 16px; }
      @media print { body { padding: 40px; } }
    </style></head><body>${renderLetterHTML()}</body></html>`);
    win.document.close();
    setTimeout(() => { win.print(); win.close(); }, 300);
  };

  const renderLetterHTML = () => {
    return letter.split("\n").map(line => {
      const trimmed = line.trim();
      if (!trimmed) return '<div class="spacer"></div>';
      if (trimmed.toLowerCase().startsWith("objet")) return `<p class="objet">${trimmed}</p>`;
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

  return (
    <div className="space-y-4">
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
          // First few lines = sender info (left aligned, small)
          if (i < 5 && trimmed.length < 60) {
            return <p key={i} style={{ fontSize: 12, lineHeight: 1.6, color: "#444" }}>{trimmed}</p>;
          }
          // Detect recipient/date block (lines 6-7 area, after blank)
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
