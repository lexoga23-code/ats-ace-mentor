import { useState, useRef } from "react";
import { AlertTriangle, Download, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const TEMPLATES = [
  { id: "classic", name: "Classique", desc: "Une colonne, sobre", ats: true },
  { id: "modern", name: "Moderne", desc: "Bandeau couleur en en-tête", ats: true },
  { id: "twocol", name: "Deux colonnes", desc: "Colonne gauche colorée", ats: false },
  { id: "executive", name: "Exécutif", desc: "Fond sombre premium", ats: false },
] as const;

const PALETTES = [
  { id: "ardoise", hex: "#2d3748", label: "Ardoise" },
  { id: "marine", hex: "#1a365d", label: "Marine" },
  { id: "bordeaux", hex: "#742a2a", label: "Bordeaux" },
  { id: "foret", hex: "#1a4731", label: "Forêt" },
  { id: "or", hex: "#744210", label: "Or" },
  { id: "violet", hex: "#44337a", label: "Violet" },
];

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
    // Name: first line or all caps line at start
    if (!name && (lines.indexOf(line) === 0 || line === line.toUpperCase()) && line.length < 60 && !line.startsWith("•")) {
      name = line;
      continue;
    }
    // Contact line (email, phone)
    if (!contact && (line.includes("@") || /\d{2}[\s.-]\d{2}/.test(line))) {
      contact = line;
      continue;
    }
    // Section header (ALL CAPS or ends with :)
    if ((line === line.toUpperCase() && line.length > 3 && line.length < 60 && !line.startsWith("•")) || 
        (line.endsWith(":") && line.length < 50)) {
      if (currentSection) sections.push(currentSection);
      currentSection = { title: line.replace(/:$/, ""), items: [] };
      continue;
    }
    if (currentSection) {
      currentSection.items.push(line);
    } else {
      // Before first section, treat as profile
      if (!sections.length) {
        currentSection = { title: "PROFIL", items: [line] };
      }
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
    win.document.write(`<!DOCTYPE html><html><head><title>CV</title><style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Segoe UI', system-ui, sans-serif; color: #1a1a1a; }
      @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
    </style></head><body>${content.innerHTML}</body></html>`);
    win.document.close();
    setTimeout(() => { win.print(); win.close(); }, 300);
  };

  const renderItem = (item: string, i: number) => {
    const isBullet = item.startsWith("•") || item.startsWith("-") || item.startsWith("–");
    const text = isBullet ? item.replace(/^[•\-–]\s*/, "") : item;
    // Detect job title lines: "Title | Company | Dates" or "Title — Company"
    const isJobTitle = /\|/.test(item) || /\d{4}/.test(item) && item.length < 80 && !isBullet;

    if (isJobTitle && !isBullet) {
      return <p key={i} style={{ fontWeight: 600, marginTop: 8, fontSize: 14 }}>{item}</p>;
    }
    if (isBullet) {
      return <p key={i} style={{ paddingLeft: 16, fontSize: 13, lineHeight: 1.6 }}>• {text}</p>;
    }
    return <p key={i} style={{ fontSize: 13, lineHeight: 1.6 }}>{item}</p>;
  };

  const renderClassic = () => (
    <div style={{ padding: 40, maxWidth: 700, margin: "0 auto", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <h1 style={{ fontSize: 26, fontWeight: 700, color, textAlign: "center", marginBottom: 4 }}>{parsed.name}</h1>
      {parsed.contact && <p style={{ textAlign: "center", fontSize: 12, color: "#666", marginBottom: 24 }}>{parsed.contact}</p>}
      {parsed.sections.map((s, i) => (
        <div key={i} style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 2, color, borderBottom: `2px solid ${color}`, paddingBottom: 4, marginBottom: 8 }}>{s.title}</h2>
          {s.items.map(renderItem)}
        </div>
      ))}
    </div>
  );

  const renderModern = () => (
    <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <div style={{ background: color, color: "#fff", padding: "30px 40px", marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>{parsed.name}</h1>
        {parsed.contact && <p style={{ fontSize: 13, opacity: 0.9 }}>{parsed.contact}</p>}
      </div>
      <div style={{ padding: "0 40px 40px" }}>
        {parsed.sections.map((s, i) => (
          <div key={i} style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, color, marginBottom: 8 }}>{s.title}</h2>
            {s.items.map(renderItem)}
          </div>
        ))}
      </div>
    </div>
  );

  const renderTwoCol = () => (
    <div style={{ display: "flex", fontFamily: "'Segoe UI', system-ui, sans-serif", minHeight: 600 }}>
      <div style={{ width: "35%", background: color, color: "#fff", padding: 30 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>{parsed.name}</h1>
        {parsed.contact && <p style={{ fontSize: 11, opacity: 0.85, marginBottom: 20 }}>{parsed.contact}</p>}
        {parsed.sections.filter((_, i) => i % 2 === 1).map((s, i) => (
          <div key={i} style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 1.5, opacity: 0.8, marginBottom: 6 }}>{s.title}</h3>
            {s.items.map((item, j) => <p key={j} style={{ fontSize: 12, lineHeight: 1.5 }}>{item.replace(/^[•\-–]\s*/, "")}</p>)}
          </div>
        ))}
      </div>
      <div style={{ flex: 1, padding: 30 }}>
        {parsed.sections.filter((_, i) => i % 2 === 0).map((s, i) => (
          <div key={i} style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, color, marginBottom: 8 }}>{s.title}</h2>
            {s.items.map(renderItem)}
          </div>
        ))}
      </div>
    </div>
  );

  const renderExecutive = () => (
    <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
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

  const renderers: Record<TemplateId, () => JSX.Element> = { classic: renderClassic, modern: renderModern, twocol: renderTwoCol, executive: renderExecutive };

  return (
    <div className="space-y-6">
      {/* Template selector */}
      <div>
        <p className="text-sm font-bold text-foreground mb-3">Template</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
                <Badge variant="outline" className="absolute top-1.5 right-1.5 text-[10px] px-1.5 py-0 border-amber-400 text-amber-600 gap-0.5">
                  <AlertTriangle className="w-2.5 h-2.5" /> ATS réduit
                </Badge>
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
        <div className="flex gap-3">
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

      {/* Download */}
      <button
        onClick={handlePrint}
        className="w-full py-3 bg-foreground text-background rounded-xl font-bold text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2"
      >
        <Download className="w-4 h-4" /> Télécharger ce CV en PDF
      </button>
    </div>
  );
};

export default CVPreview;
