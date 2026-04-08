import { useState } from "react";
import { Download, FileText, Pencil, Eye } from "lucide-react";
import { exportLetterToDocx } from "@/lib/docxExport";

interface CoverLetterPreviewProps {
  letter: string;
  onChange: (text: string) => void;
}

interface ParsedLetter {
  sender: string[];
  recipient: string[];
  placeDate: string;
  object: string;
  salutation: string;
  body: string[];
  closing: string;
  signature: string[];
}

const parseLetter = (letter: string): ParsedLetter => {
  const lines = letter.split("\n");
  const result: ParsedLetter = {
    sender: [],
    recipient: [],
    placeDate: "",
    object: "",
    salutation: "",
    body: [],
    closing: "",
    signature: [],
  };

  let section: "sender" | "recipient" | "body" | "signature" = "sender";
  let foundObject = false;
  let foundSalutation = false;
  let bodyParagraphs: string[] = [];
  let currentParagraph = "";

  const isDateLine = (line: string) =>
    /^[A-Za-zÀ-ÿ\-\s]+,\s*le\s+\d{1,2}/i.test(line.trim());

  const isObjectLine = (line: string) =>
    line.trim().toLowerCase().startsWith("objet");

  const isSalutation = (line: string) => {
    const t = line.trim();
    return t.startsWith("Madame") || t.startsWith("Monsieur") || t.startsWith("Cher") || t.startsWith("Chère");
  };

  const isClosingFormula = (line: string) => {
    const t = line.trim().toLowerCase();
    return t.includes("agréer") || t.includes("salutations") || t.includes("sincères") || t.includes("distinguées") || t.includes("votre disposition");
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Empty line handling
    if (!trimmed) {
      if (section === "sender" && result.sender.length > 0) {
        section = "recipient";
      } else if (section === "body" && currentParagraph) {
        bodyParagraphs.push(currentParagraph.trim());
        currentParagraph = "";
      }
      continue;
    }

    // Date line detection (e.g., "Paris, le 7 avril 2026")
    if (isDateLine(trimmed) && !foundObject) {
      result.placeDate = trimmed;
      section = "recipient";
      continue;
    }

    // Object line
    if (isObjectLine(trimmed)) {
      result.object = trimmed;
      foundObject = true;
      section = "body";
      continue;
    }

    // Salutation
    if (isSalutation(trimmed) && foundObject && !foundSalutation) {
      result.salutation = trimmed;
      foundSalutation = true;
      continue;
    }

    // Section-based assignment
    if (section === "sender") {
      result.sender.push(trimmed);
    } else if (section === "recipient" && !foundObject) {
      // Check if this could be recipient info (short lines, before object)
      if (trimmed.length < 80 && !isDateLine(trimmed)) {
        result.recipient.push(trimmed);
      }
    } else if (section === "body" || foundSalutation) {
      // Check for closing formula
      if (isClosingFormula(trimmed)) {
        if (currentParagraph) {
          bodyParagraphs.push(currentParagraph.trim());
          currentParagraph = "";
        }
        result.closing = trimmed;
        section = "signature";
      } else if (section === "signature") {
        result.signature.push(trimmed);
      } else {
        // Accumulate body text
        currentParagraph += (currentParagraph ? " " : "") + trimmed;
      }
    }
  }

  // Push any remaining paragraph
  if (currentParagraph) {
    bodyParagraphs.push(currentParagraph.trim());
  }

  result.body = bodyParagraphs;

  return result;
};

const CoverLetterPreview = ({ letter, onChange }: CoverLetterPreviewProps) => {
  const [editing, setEditing] = useState(false);

  const handlePrint = () => {
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Lettre de motivation</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    @page {
      size: A4;
      margin: 2cm;
    }
    html, body {
      font-family: Arial, Calibri, sans-serif;
      font-size: 11pt;
      line-height: 1.15;
      color: #000;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body {
      padding: 0;
      max-width: 21cm;
      min-height: calc(29.7cm - 4cm);
      max-height: calc(29.7cm - 4cm);
      overflow: hidden;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1.2em;
    }
    .sender {
      text-align: left;
      font-size: 10pt;
    }
    .sender p {
      margin: 0;
      line-height: 1.3;
    }
    .recipient-block {
      text-align: right;
      font-size: 10pt;
    }
    .recipient-block p {
      margin: 0;
      line-height: 1.3;
    }
    .place-date {
      text-align: right;
      margin-top: 0.6em;
      font-size: 10pt;
    }
    .object {
      font-weight: bold;
      margin: 1.2em 0 0.8em 0;
    }
    .salutation {
      margin-bottom: 0.8em;
    }
    .body-paragraph {
      text-align: justify;
      margin-bottom: 8px;
      text-indent: 0;
    }
    .closing {
      margin-top: 0.8em;
      margin-bottom: 1em;
    }
    .signature {
      margin-top: 0.8em;
    }
    .signature p {
      margin: 0;
      line-height: 1.3;
    }
    @media print {
      body {
        padding: 0;
      }
    }
  </style>
  <script>
    window.onload = function() {
      window.print();
      window.onafterprint = function() { window.close(); };
    };
  </script>
</head>
<body>
${renderLetterHTML()}
</body>
</html>`);
    win.document.close();
  };

  const renderLetterHTML = () => {
    const parsed = parseLetter(letter);

    let html = "";

    // Header with sender (left) and recipient (right)
    html += '<div class="header">';
    html += '<div class="sender">';
    parsed.sender.forEach(line => {
      html += `<p>${line}</p>`;
    });
    html += '</div>';
    html += '<div class="recipient-block">';
    parsed.recipient.forEach(line => {
      html += `<p>${line}</p>`;
    });
    if (parsed.placeDate) {
      html += `<p class="place-date">${parsed.placeDate}</p>`;
    }
    html += '</div>';
    html += '</div>';

    // Object
    if (parsed.object) {
      html += `<p class="object">${parsed.object}</p>`;
    }

    // Salutation
    if (parsed.salutation) {
      html += `<p class="salutation">${parsed.salutation}</p>`;
    }

    // Body paragraphs
    parsed.body.forEach(para => {
      html += `<p class="body-paragraph">${para}</p>`;
    });

    // Closing
    if (parsed.closing) {
      html += `<p class="closing">${parsed.closing}</p>`;
    }

    // Signature
    if (parsed.signature.length > 0) {
      html += '<div class="signature">';
      parsed.signature.forEach(line => {
        html += `<p>${line}</p>`;
      });
      html += '</div>';
    }

    return html;
  };

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
  const parsed = parseLetter(letter);

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

      {/* Professional letter rendering - preview */}
      <div
        className="bg-white rounded-2xl shadow-soft border border-border p-10 max-w-[700px] mx-auto"
        style={{ fontFamily: "Arial, Calibri, sans-serif", fontSize: "11pt", lineHeight: 1.15 }}
      >
        {/* Header: sender left, recipient right */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.2em" }}>
          {/* Sender - left */}
          <div style={{ textAlign: "left" }}>
            {parsed.sender.map((line, i) => (
              <p key={`sender-${i}`} style={{ margin: 0, lineHeight: 1.3, fontSize: "10pt", color: "#333" }}>{line}</p>
            ))}
          </div>
          {/* Recipient - right */}
          <div style={{ textAlign: "right" }}>
            {parsed.recipient.map((line, i) => (
              <p key={`recipient-${i}`} style={{ margin: 0, lineHeight: 1.3, fontSize: "10pt", color: "#333" }}>{line}</p>
            ))}
            {parsed.placeDate && (
              <p style={{ margin: 0, marginTop: "0.6em", lineHeight: 1.3, fontSize: "10pt", color: "#333" }}>{parsed.placeDate}</p>
            )}
          </div>
        </div>

        {/* Object */}
        {parsed.object && (
          <p style={{ fontWeight: "bold", margin: "1.2em 0 0.8em 0", fontSize: "11pt" }}>{parsed.object}</p>
        )}

        {/* Salutation */}
        {parsed.salutation && (
          <p style={{ marginBottom: "0.8em", fontSize: "11pt" }}>{parsed.salutation}</p>
        )}

        {/* Body paragraphs */}
        {parsed.body.map((para, i) => (
          <p key={`body-${i}`} style={{ textAlign: "justify", marginBottom: "8px", fontSize: "11pt", lineHeight: 1.15 }}>{para}</p>
        ))}

        {/* Closing */}
        {parsed.closing && (
          <p style={{ marginTop: "0.8em", marginBottom: "1em", fontSize: "11pt" }}>{parsed.closing}</p>
        )}

        {/* Signature */}
        {parsed.signature.length > 0 && (
          <div style={{ marginTop: "0.8em" }}>
            {parsed.signature.map((line, i) => (
              <p key={`sig-${i}`} style={{ margin: 0, lineHeight: 1.3, fontSize: "11pt" }}>{line}</p>
            ))}
          </div>
        )}
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
