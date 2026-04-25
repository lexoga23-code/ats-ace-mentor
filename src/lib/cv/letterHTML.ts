/**
 * Générateur HTML pour les lettres de motivation
 * Format lettre française (expéditeur haut gauche, destinataire haut droite mais sous expéditeur)
 *
 * Génère un HTML complet et autonome (avec CSS inline)
 * utilisable pour la preview et l'export PDF via Browserless.
 */

import type { LetterData } from './types';
import { LETTER_LAYOUT } from './letterLayout';

// Échappe les caractères HTML dangereux
const escapeHtml = (str: string): string =>
  str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

/**
 * Génère un HTML complet pour une lettre de motivation au format français
 * @param data - Les données de la lettre parsées
 * @returns HTML complet avec DOCTYPE, styles inline, prêt pour preview ou PDF
 */
export const buildLetterHTML = (data: LetterData): string => {
  // Construire le bloc destinataire (uniquement les champs non vides)
  const recipientLines: string[] = [];
  if (data.recipientName) recipientLines.push(escapeHtml(data.recipientName));
  if (data.recipientDept) recipientLines.push(escapeHtml(data.recipientDept));
  if (data.recipientAddress) recipientLines.push(escapeHtml(data.recipientAddress));
  if (data.recipientCityZip) recipientLines.push(escapeHtml(data.recipientCityZip));

  const recipientBlock = recipientLines.length > 0
    ? `<div class="recipient-block">
      ${recipientLines.map(line => `<p>${line}</p>`).join('\n      ')}
    </div>`
    : '';

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Lettre de motivation — ${escapeHtml(data.senderName)}</title>
<style>
/* === BASE === */
* { margin: 0; padding: 0; box-sizing: border-box; }
html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body {
  font-family: ${LETTER_LAYOUT.fontFamily};
  font-size: ${LETTER_LAYOUT.bodyFontPt}pt;
  line-height: ${LETTER_LAYOUT.lineHeight};
  color: #1a1a1a;
  background: #ffffff;
}

/* === PAGE A4 === */
.letter-page {
  width: 210mm;
  min-height: 297mm;
  padding: ${LETTER_LAYOUT.page.topMm}mm ${LETTER_LAYOUT.page.rightMm}mm ${LETTER_LAYOUT.page.bottomMm}mm ${LETTER_LAYOUT.page.leftMm}mm;
  margin: 0 auto;
  background: #ffffff;
  overflow: visible;
}

/* === EN-TÊTE === */
.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: ${LETTER_LAYOUT.headerGapMm}mm;
}

/* Expéditeur - gauche */
.sender-block {
  text-align: left;
}

.sender-name {
  font-size: 14pt;
  font-weight: 600;
  color: #1a3a5c;
  margin-bottom: 4px;
}

.sender-contact {
  font-size: 10pt;
  color: #1a1a1a;
  line-height: 1.4;
}

.sender-contact p {
  margin: 0;
}

/* Destinataire + Date - droite */
.right-block {
  text-align: right;
  margin-top: 28px;
}

.recipient-block {
  text-align: left;
  display: inline-block;
  text-align: left;
  font-size: 10pt;
  color: #1a1a1a;
  line-height: 1.4;
  margin-bottom: 16px;
}

.recipient-block p {
  margin: 0;
}

.date {
  font-size: 10pt;
  color: #1a1a1a;
  margin-top: 16px;
}

/* === OBJET === */
.objet {
  font-size: 11pt;
  margin-bottom: 16px;
  line-height: 1.5;
}

.objet-label {
  font-weight: 700;
}

/* === SALUTATION === */
.salutation {
  font-size: 11pt;
  margin-bottom: 12px;
}

/* === CORPS === */
.body-paragraph {
  font-size: 11pt;
  line-height: 1.5;
  text-align: justify;
  hyphens: auto;
  margin-bottom: 12px;
}

/* === POLITESSE === */
.politesse {
  font-size: 11pt;
  line-height: 1.5;
  margin-top: 12px;
  margin-bottom: 20px;
}

/* === SIGNATURE === */
.signature {
  font-size: 11pt;
  font-weight: 600;
  margin-top: 16px;
}

@media print {
  @page {
    size: A4;
    margin: ${LETTER_LAYOUT.page.topMm}mm ${LETTER_LAYOUT.page.rightMm}mm ${LETTER_LAYOUT.page.bottomMm}mm ${LETTER_LAYOUT.page.leftMm}mm;
  }
  body { margin: 0; padding: 0; }
  .letter-page {
    width: auto;
    min-height: auto;
    padding: 0;
    margin: 0;
  }
}
</style>
</head>
<body>
<div class="letter-page">

  <!-- En-tête : expéditeur gauche, destinataire+date droite -->
  <div class="header">
    <!-- Expéditeur -->
    <div class="sender-block">
      <div class="sender-name">${escapeHtml(data.senderName)}</div>
      <div class="sender-contact">
        ${data.senderPhone ? `<p class="sender-phone">${escapeHtml(data.senderPhone)}</p>` : ''}
        ${data.senderEmail ? `<p class="sender-email">${escapeHtml(data.senderEmail)}</p>` : ''}
        ${data.senderCity ? `<p class="sender-city">${escapeHtml(data.senderCity)}</p>` : ''}
      </div>
    </div>

    <!-- Destinataire + Date -->
    <div class="right-block">
      ${recipientBlock}
      <div class="date">${escapeHtml(data.date)}</div>
    </div>
  </div>

  <!-- Objet -->
  <p class="objet">
    <span class="objet-label">Objet :</span> ${escapeHtml(data.objet)}
  </p>

  <!-- Salutation -->
  <p class="salutation">Madame, Monsieur,</p>

  <!-- Corps (4 paragraphes) -->
  ${data.paragraphs.map(para => `<p class="body-paragraph">${escapeHtml(para)}</p>`).join('\n  ')}

  <!-- Formule de politesse -->
  <p class="politesse">${escapeHtml(data.politesse)}</p>

  <!-- Signature -->
  <div class="signature">${escapeHtml(data.signatureName)}</div>

</div>
</body>
</html>`;
};

const textFrom = (root: ParentNode, selector: string): string =>
  root.querySelector(selector)?.textContent?.trim() ?? "";

const normalizeWhitespace = (value: string): string =>
  value.replace(/\s+/g, " ").trim();

const stripObjetLabel = (value: string): string =>
  normalizeWhitespace(value).replace(/^Objet\s*:\s*/i, "");

export const extractLetterDataFromHTML = (html: string): LetterData => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  const recipientLines = Array.from(doc.querySelectorAll(".recipient-block p"))
    .map(node => normalizeWhitespace(node.textContent ?? ""))
    .filter(Boolean);

  const paragraphs = Array.from(doc.querySelectorAll(".body-paragraph"))
    .map(node => normalizeWhitespace(node.textContent ?? ""))
    .filter(Boolean);

  return {
    senderName: normalizeWhitespace(textFrom(doc, ".sender-name")),
    senderPhone: normalizeWhitespace(textFrom(doc, ".sender-phone")),
    senderEmail: normalizeWhitespace(textFrom(doc, ".sender-email")),
    senderCity: normalizeWhitespace(textFrom(doc, ".sender-city")),
    recipientName: recipientLines[0] ?? "",
    recipientDept: recipientLines[1],
    recipientAddress: recipientLines[2],
    recipientCityZip: recipientLines[3],
    date: normalizeWhitespace(textFrom(doc, ".date")),
    objet: stripObjetLabel(textFrom(doc, ".objet")),
    paragraphs,
    politesse: normalizeWhitespace(textFrom(doc, ".politesse")),
    signatureName: normalizeWhitespace(textFrom(doc, ".signature")),
  };
};
