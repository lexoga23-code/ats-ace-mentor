import { useState, useRef } from "react";
import { AlertTriangle, Download, Check, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { exportCVToDocx } from "@/lib/docxExport";

const TEMPLATES = [
  { id: "classic", name: "Classique", desc: "Une colonne, sobre", ats: true },
  { id: "modern", name: "Moderne", desc: "Bandeau couleur en en-tête", ats: true },
  { id: "minimal", name: "Minimaliste", desc: "Typographie pure, épuré", ats: true },
  { id: "chrono", name: "Chronologique moderne", desc: "Bandeau fin, sections espacées, 100% texte pur", ats: true },
  { id: "functional", name: "Fonctionnel épuré", desc: "Compétences en premier, idéal reconversions", ats: true },
  { id: "timeline", name: "Timeline", desc: "Ligne chronologique gauche", ats: false },
  { id: "executive", name: "Exécutif", desc: "Fond sombre premium", ats: false },
] as const;

const PALETTES = [
  { id: "ardoise", hex: "#2d3748", label: "Ardoise" },
  { id: "marine", hex: "#1a365d", label: "Marine" },
  { id: "bordeaux", hex: "#742a2a", label: "Bordeaux" },
  { id: "foret", hex: "#1a4731", label: "Forêt" },
  { id: "or", hex: "#744210", label: "Or" },
  { id: "violet", hex: "#44337a", label: "Violet" },
  { id: "corail", hex: "#FF6B6B", label: "Corail" },
  { id: "turquoise", hex: "#0097A7", label: "Turquoise" },
  { id: "anthracite", hex: "#455A64", label: "Anthracite" },
  { id: "indigo", hex: "#3F51B5", label: "Indigo" },
];

const ATS_WARNING = "Ce design utilise des colonnes ou un fond coloré qui peuvent être mal interprétés par certains logiciels de recrutement automatique (ATS). Recommandé uniquement si vous postulez directement à un humain ou via email.";

type TemplateId = typeof TEMPLATES[number]["id"];

interface CVPreviewProps {
  cvText: string;
  onChange: (text: string) => void;
}

const parseCV = (text: string) => {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  const sections: { title: string; items: string[] }[] = [];
  let name = "";
  let contact = "";
  let currentSection: { title: string; items: string[] } | null = null;

  for (const line of lines) {
    if (!name && (lines.indexOf(line) === 0 || line === line.toUpperCase()) && line.length < 60 && !line.startsWith("•")) {
      name = line; continue;
    }
    if (!contact && (line.includes("@") || /\d{2}[\s.-]\d{2}/.test(line))) {
      contact = line; continue;
    }
    if ((line === line.toUpperCase() && line.length > 3 && line.length < 60 && !line.startsWith("•")) || (line.endsWith(":") && line.length < 50)) {
      if (currentSection) sections.push(currentSection);
      currentSection = { title: line.replace(/:$/, ""), items: [] }; continue;
    }
    if (currentSection) {
      currentSection.items.push(line);
    } else if (!sections.length) {
      currentSection = { title: "PROFIL", items: [line] };
    }
  }
  if (currentSection) sections.push(currentSection);
  return { name, contact, sections };
};

const CVPreview = ({ cvText, onChange }: CVPreviewProps) => {
  const [template, setTemplate] = useState<TemplateId>("classic");
  const [color, setColor] = useState(PALETTES[0].hex);
  const printRef = useRef<HTMLDivElement>(null);
  const parsed = parseCV(cvText);

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const win = window.open("", "_blank");
    if (!win) return;
    
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title> </title><style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: Calibri, Arial, sans-serif; color: #1a1a1a; -webkit-print-color-adjust: exact; print-color-adjust: exact; font-size: 11pt; line-height: 1.3; }
      p { text-align: justify; hyphens: auto; -webkit-hyphens: auto; word-break: normal; overflow-wrap: break-word; }
      h1 { font-size: 22pt; font-weight: 700; }
      h2 { font-size: 12pt; font-weight: 700; }
      @media print {
        @page { margin: 1.5cm; size: A4; }
        * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        header, footer { display: none !important; }
      }
    </style></head><body>${content.innerHTML}</body></html>`);
    win.document.close();
    win.document.title = " ";
    setTimeout(() => { win.print(); win.close(); }, 300);
  };

  const itemStyle: React.CSSProperties = { fontSize: 11, lineHeight: 1.3, textAlign: "justify", hyphens: "auto", WebkitHyphens: "auto" as any, fontFamily: "Calibri, Arial, sans-serif", wordBreak: "normal", overflowWrap: "break-word" };

  const cleanText = (t: string) => /^([A-ZÀ-Ü] ){2,}[A-ZÀ-Ü]$/.test(t.trim()) ? t.replace(/ /g, "") : t;

  const renderItem = (item: string, i: number) => {
    const isBullet = item.startsWith("•") || item.startsWith("-") || item.startsWith("–");
    const text = isBullet ? item.replace(/^[•\-–]\s*/, "") : item;
    const isJobTitle = /\|/.test(item) || (/\d{4}/.test(item) && item.length < 80 && !isBullet);
    if (isJobTitle && !isBullet) return <p key={i} style={{ fontWeight: 700, marginTop: 8, fontSize: 11, color: "#1a1a1a" }}>{cleanText(item)}</p>;
    if (isBullet) return <p key={i} style={{ paddingLeft: 16, ...itemStyle }}>• {cleanText(text)}</p>;
    return <p key={i} style={itemStyle}>{cleanText(item)}</p>;
  };

  const sectionStyle: React.CSSProperties = { marginBottom: 8 };
  const sectionTitleStyle: React.CSSProperties = { fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color, borderBottom: `2px solid ${color}`, paddingBottom: 3, marginBottom: 6 };

  const renderClassic = () => (
    <div style={{ padding: "24px 40px", maxWidth: 700, margin: "0 auto", fontFamily: "Calibri, Arial, sans-serif", lineHeight: 1.3 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color, textAlign: "center", marginBottom: 2 }}>{parsed.name}</h1>
      {parsed.contact && <p style={{ textAlign: "center", fontSize: 10, color: "#666", marginBottom: 14 }}>{parsed.contact}</p>}
      {parsed.sections.map((s, i) => (
        <div key={i} style={sectionStyle}>
          <h2 style={sectionTitleStyle}>{cleanText(s.title)}</h2>
          {s.items.map(renderItem)}
        </div>
      ))}
    </div>
  );

  const renderModern = () => (
    <div style={{ fontFamily: "Calibri, Arial, sans-serif" }}>
      <div style={{ background: color, color: "#fff", padding: "30px 40px", marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>{parsed.name}</h1>
        {parsed.contact && <p style={{ fontSize: 13, opacity: 0.9 }}>{parsed.contact}</p>}
      </div>
      <div style={{ padding: "0 40px 40px" }}>
        {parsed.sections.map((s, i) => (
          <div key={i} style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, color, marginBottom: 8 }}>{cleanText(s.title)}</h2>
            {s.items.map(renderItem)}
          </div>
        ))}
      </div>
    </div>
  );

  const renderMinimal = () => (
    <div style={{ padding: 32, maxWidth: 700, margin: "0 auto", fontFamily: "Calibri, Arial, sans-serif" }}>
      <h1 style={{ fontSize: 24, fontWeight: 300, letterSpacing: 3, textAlign: "center", marginBottom: 4, color: "#222" }}>{parsed.name}</h1>
      {parsed.contact && <p style={{ textAlign: "center", fontSize: 11, color: "#888", marginBottom: 30 }}>{parsed.contact}</p>}
      {parsed.sections.map((s, i) => (
        <div key={i} style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 3, color: "#555", marginBottom: 6, paddingBottom: 4, borderBottom: "1px dashed #ccc" }}>{cleanText(s.title)}</h2>
          {s.items.map(renderItem)}
        </div>
      ))}
    </div>
  );

  const renderChrono = () => (
    <div style={{ fontFamily: "Calibri, Arial, sans-serif" }}>
      <div style={{ height: 6, background: color, width: "100%" }} />
      <div style={{ padding: "30px 40px 40px" }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color, textAlign: "center", marginBottom: 4 }}>{parsed.name}</h1>
        {parsed.contact && <p style={{ textAlign: "center", fontSize: 12, color: "#666", marginBottom: 28 }}>{parsed.contact}</p>}
        {parsed.sections.map((s, i) => (
          <div key={i} style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 2, color, marginBottom: 10, paddingBottom: 6, borderBottom: `1px solid ${color}33` }}>{cleanText(s.title)}</h2>
            {s.items.map(renderItem)}
          </div>
        ))}
      </div>
    </div>
  );

  const renderFunctional = () => {
    const competences = parsed.sections.filter(s => /compétence|skill|langue|outil/i.test(s.title));
    const others = parsed.sections.filter(s => !/compétence|skill|langue|outil/i.test(s.title));
    const ordered = [...competences, ...others];
    return (
      <div style={{ padding: 32, maxWidth: 700, margin: "0 auto", fontFamily: "Calibri, Arial, sans-serif" }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color, marginBottom: 4 }}>{parsed.name}</h1>
        {parsed.contact && <p style={{ fontSize: 12, color: "#666", marginBottom: 24 }}>{parsed.contact}</p>}
        {ordered.map((s, i) => (
          <div key={i} style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 2, color, borderLeft: `4px solid ${color}`, paddingLeft: 10, marginBottom: 8 }}>{s.title}</h2>
            {s.items.map(renderItem)}
          </div>
        ))}
      </div>
    );
  };

  const renderTimeline = () => (
    <div style={{ padding: 32, maxWidth: 700, margin: "0 auto", fontFamily: "Calibri, Arial, sans-serif" }}>
      <h1 style={{ fontSize: 26, fontWeight: 700, color, marginBottom: 4 }}>{parsed.name}</h1>
      {parsed.contact && <p style={{ fontSize: 12, color: "#666", marginBottom: 24 }}>{parsed.contact}</p>}
      {parsed.sections.map((s, i) => (
        <div key={i} style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 2, color, marginBottom: 12 }}>{s.title}</h2>
          <div style={{ borderLeft: `3px solid ${color}`, paddingLeft: 20, marginLeft: 8 }}>
            {s.items.map((item, j) => {
              const isBullet = item.startsWith("•") || item.startsWith("-") || item.startsWith("–");
              const isJobTitle = /\|/.test(item) || (/\d{4}/.test(item) && item.length < 80 && !isBullet);
              return (
                <div key={j} style={{ position: "relative", marginBottom: isJobTitle ? 4 : 2 }}>
                  {isJobTitle && (
                    <div style={{ position: "absolute", left: -28, top: 4, width: 12, height: 12, borderRadius: "50%", background: color }} />
                  )}
                  {renderItem(item, j)}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );

  const renderExecutive = () => (
    <div style={{ fontFamily: "Calibri, Arial, sans-serif" }}>
      <div style={{ background: "#1a1a2e", color: "#fff", padding: "40px 40px 30px", textAlign: "center" }}>
        <h1 style={{ fontSize: 30, fontWeight: 300, letterSpacing: 4, marginBottom: 6 }}>{parsed.name}</h1>
        {parsed.contact && <p style={{ fontSize: 12, opacity: 0.7 }}>{parsed.contact}</p>}
        <div style={{ width: 40, height: 3, background: color, margin: "16px auto 0" }} />
      </div>
      <div style={{ padding: "30px 40px 40px" }}>
        {parsed.sections.map((s, i) => (
          <div key={i} style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: 2, color, marginBottom: 8, borderLeft: `3px solid ${color}`, paddingLeft: 10 }}>{s.title}</h2>
            {s.items.map(renderItem)}
          </div>
        ))}
      </div>
    </div>
  );

  const renderers: Record<TemplateId, () => JSX.Element> = {
    classic: renderClassic, modern: renderModern, minimal: renderMinimal,
    chrono: renderChrono, functional: renderFunctional,
    timeline: renderTimeline, executive: renderExecutive,
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Template selector — no ATS badges */}
        <div>
          <p className="text-sm font-bold text-foreground mb-3">Template</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {TEMPLATES.map(t => (
              <button
                key={t.id}
                onClick={() => setTemplate(t.id)}
                className={`relative p-3 rounded-xl border-2 text-left transition-all text-xs ${
                  template === t.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                }`}
              >
                <span className="font-bold text-foreground block">{t.name}</span>
                <span className="text-muted-foreground">{t.desc}</span>
                {!t.ats && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="outline" className="absolute top-1.5 right-1.5 text-[10px] px-1.5 py-0 border-amber-400 text-amber-600 gap-0.5 cursor-help">
                        <AlertTriangle className="w-2.5 h-2.5" /> ATS réduit
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs text-xs">
                      {ATS_WARNING}
                    </TooltipContent>
                  </Tooltip>
                )}
                {template === t.id && (
                  <div className="absolute top-1.5 left-1.5 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 text-primary-foreground" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Color selector */}
        <div>
          <p className="text-sm font-bold text-foreground mb-3">Couleur</p>
          <div className="flex flex-wrap gap-3">
            {PALETTES.map(p => (
              <button
                key={p.id}
                onClick={() => setColor(p.hex)}
                title={p.label}
                className={`w-9 h-9 rounded-full border-2 transition-all flex items-center justify-center ${
                  color === p.hex ? "border-foreground scale-110" : "border-transparent hover:scale-105"
                }`}
                style={{ background: p.hex }}
              >
                {color === p.hex && <Check className="w-4 h-4 text-white" />}
              </button>
            ))}
          </div>
        </div>

        {/* Preview */}
        <div className="bg-white rounded-2xl shadow-soft overflow-hidden border border-border" ref={printRef}>
          {renderers[template]()}
        </div>

        {/* Download buttons */}
        <div className="flex gap-3">
          <button onClick={handlePrint} className="flex-1 py-3 bg-foreground text-background rounded-xl font-bold text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2">
            <Download className="w-4 h-4" /> PDF
          </button>
          <button onClick={() => exportCVToDocx(cvText)} className="flex-1 py-3 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2">
            <FileText className="w-4 h-4" /> Word (.docx)
          </button>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default CVPreview;
