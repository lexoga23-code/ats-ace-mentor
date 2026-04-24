/**
 * Générateur HTML pour les templates CV
 * Phase 2 de la refonte templates
 *
 * Génère un HTML complet et autonome (avec CSS inline)
 * utilisable pour la preview et l'export PDF via Browserless.
 */

import type { CVData, TemplateId, ColorPaletteId } from './types';
import { COLORS } from './colors';
import { THEMES } from './themes';

// Échappe les caractères HTML dangereux
const escapeHtml = (str: string): string =>
  str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

// Génère les attributs contenteditable + data-field si editable=true
const editableAttrs = (field: string, editable: boolean): string =>
  editable ? ` contenteditable="true" data-field="${field}"` : '';

// Génère le header du CV (différent pour le template moderne)
const renderHeader = (data: CVData, templateId: TemplateId, editable: boolean): string => {
  const contact = `
    <p class="contact">
      ${data.contact.phone ? `<span${editableAttrs('contact.phone', editable)}>${escapeHtml(data.contact.phone)}</span>` : ''}
      ${data.contact.phone && data.contact.email ? '<span class="sep">|</span>' : ''}
      ${data.contact.email ? `<span${editableAttrs('contact.email', editable)}>${escapeHtml(data.contact.email)}</span>` : ''}
      ${(data.contact.phone || data.contact.email) && data.contact.linkedin ? '<span class="sep">|</span>' : ''}
      ${data.contact.linkedin ? `<span${editableAttrs('contact.linkedin', editable)}>${escapeHtml(data.contact.linkedin)}</span>` : ''}
      ${(data.contact.phone || data.contact.email || data.contact.linkedin) && data.contact.location ? '<span class="sep">|</span>' : ''}
      ${data.contact.location ? `<span${editableAttrs('contact.location', editable)}>${escapeHtml(data.contact.location)}</span>` : ''}
    </p>
  `;

  const headerContent = `
    <h1${editableAttrs('name', editable)}>${escapeHtml(data.name)}</h1>
    ${data.jobTitle ? `<p class="job-title-header"${editableAttrs('jobTitle', editable)}>${escapeHtml(data.jobTitle)}</p>` : ''}
    <div class="header-gradient"></div>
    ${contact}
  `;

  if (templateId === 'modern') {
    return `<div class="modern-band"><div class="header">${headerContent}</div></div>`;
  }
  return `<div class="header">${headerContent}</div>`;
};

// Génère le CSS de base commun à tous les templates
const getBaseCSS = (): string => `
/* === BASE COMMUNE === */
* { margin: 0; padding: 0; box-sizing: border-box; }
html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body {
  font-family: 'DM Sans', Arial, sans-serif;
  font-size: 11px;
  line-height: 1.5;
  color: #1a1a2e;
  background: white;
}
a { color: inherit; text-decoration: none; white-space: nowrap; }

.cv-root { width: 100%; padding: 24px 32px; }

.header { margin-bottom: 16px; }
.header h1 {
  font-family: 'Space Grotesk', Arial, sans-serif;
  font-size: 24px;
  font-weight: 700;
  color: #1a1a2e;
  letter-spacing: -0.02em;
  margin-bottom: 4px;
}
.header .job-title-header {
  font-size: 13px;
  font-weight: 500;
  color: var(--cv-primary);
  margin-bottom: 4px;
}
.header-gradient { display: none; }

.contact {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 16px;
  font-size: 10px;
  color: #555;
}
.contact .sep { color: #ccc; }

.section { margin-bottom: 14px; }
.section-title {
  font-family: 'Space Grotesk', Arial, sans-serif;
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--cv-primary);
  border-bottom: 1px solid #e5e5e5;
  padding-bottom: 3px;
  margin-bottom: 8px;
}

.summary-text { font-size: 11px; line-height: 1.6; color: #333; }

.competencies-grid { display: flex; flex-wrap: wrap; gap: 6px; }
.competency-tag {
  font-family: 'DM Sans', Arial, sans-serif;
  font-size: 10px;
  font-weight: 500;
  color: var(--cv-primary);
  background: var(--cv-primary-soft);
  padding: 3px 10px;
  border-radius: 3px;
  border: 1px solid var(--cv-primary-border);
}

.job { margin-bottom: 12px; }
.job-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 2px;
}
.job-company {
  font-family: 'Space Grotesk', Arial, sans-serif;
  font-size: 12px;
  font-weight: 600;
  color: var(--cv-accent);
}
.job-period { font-size: 10px; color: #777; white-space: nowrap; }
.job-role { font-size: 11px; font-weight: 500; color: #444; margin-bottom: 4px; }
.job ul { padding-left: 16px; margin-top: 4px; }
.job li { font-size: 10.5px; line-height: 1.5; color: #333; margin-bottom: 2px; }

.edu-item, .cert-item { margin-bottom: 4px; }
.edu-header, .cert-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}
.edu-title, .cert-title { font-size: 11px; font-weight: 500; color: #333; }
.edu-org, .cert-org { color: var(--cv-accent); font-weight: 500; }
.edu-year, .cert-year { font-size: 10px; color: #777; }
.edu-desc { font-size: 10px; color: #666; }

.skills-section p { font-size: 10.5px; color: #444; margin-bottom: 2px; }
.skills-section strong { font-weight: 600; color: #333; }

.languages { font-size: 10.5px; color: #444; }

.avoid-break { break-inside: avoid; page-break-inside: avoid; }

@media print {
  @page {
    size: A4;
    margin: 15mm 18mm;
  }
  body { margin: 0; padding: 0; }
  .cv-root { padding: 0; }
}
`;

/**
 * Génère un HTML complet pour un CV
 * @param data - Les données du CV parsées
 * @param templateId - L'identifiant du template
 * @param colorId - L'identifiant de la palette de couleurs
 * @param editable - Si true, ajoute contenteditable + data-field pour édition inline
 * @returns HTML complet avec DOCTYPE, styles inline, prêt pour preview ou PDF
 */
export const buildHTML = (
  data: CVData,
  templateId: TemplateId,
  colorId: ColorPaletteId,
  editable: boolean = false
): string => {
  const palette = COLORS[colorId];
  const themeCSS = THEMES[templateId];

  // Import Playfair Display uniquement pour le template executive
  const playfairImport = templateId === 'executive'
    ? `@import url('https://cdn.jsdelivr.net/fontsource/fonts/playfair-display:latin-600-normal.css');
@import url('https://cdn.jsdelivr.net/fontsource/fonts/playfair-display:latin-700-normal.css');`
    : '';

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(data.name)} — CV</title>
<link rel="preconnect" href="https://cdn.jsdelivr.net">
<style>
@import url('https://cdn.jsdelivr.net/fontsource/fonts/space-grotesk:latin-400-normal.css');
@import url('https://cdn.jsdelivr.net/fontsource/fonts/space-grotesk:latin-600-normal.css');
@import url('https://cdn.jsdelivr.net/fontsource/fonts/space-grotesk:latin-700-normal.css');
@import url('https://cdn.jsdelivr.net/fontsource/fonts/dm-sans:latin-400-normal.css');
@import url('https://cdn.jsdelivr.net/fontsource/fonts/dm-sans:latin-500-normal.css');
${playfairImport}

:root {
  --cv-primary: ${palette.primary};
  --cv-accent: ${palette.accent};
  --cv-primary-soft: ${palette.primarySoft};
  --cv-primary-border: ${palette.primaryBorder};
}

${getBaseCSS()}

/* === THÈME ACTIF === */
${themeCSS}

${editable ? `
/* === ÉDITION INLINE === */
[contenteditable]:hover {
  outline: 2px dashed #94a3b8;
  border-radius: 3px;
  cursor: text;
}
[contenteditable]:focus {
  outline: 2px solid #3b82f6;
  border-radius: 3px;
  background: rgba(59,130,246,0.04);
}
@media print {
  [contenteditable] { outline: none !important; background: none !important; }
}
` : ''}
</style>
</head>
<body>
<article class="cv-root cv-${templateId}">

  ${renderHeader(data, templateId, editable)}

  ${data.profile ? `
  <div class="section avoid-break">
    <div class="section-title">Profil professionnel</div>
    <p class="summary-text"${editableAttrs('profile', editable)}>${escapeHtml(data.profile)}</p>
  </div>
  ` : ''}

  ${data.keySkills && data.keySkills.length > 0 ? `
  <div class="section avoid-break">
    <div class="section-title">Compétences clés</div>
    <div class="competencies-grid">
      ${data.keySkills.map(s => `<span class="competency-tag">${escapeHtml(s)}</span>`).join('')}
    </div>
  </div>
  ` : ''}

  ${data.experiences.length > 0 ? `
  <div class="section">
    <div class="section-title">Expérience professionnelle</div>
    ${data.experiences.map((exp, i) => `
      <div class="job avoid-break">
        <div class="job-header">
          <span class="job-company"><span${editableAttrs(`experiences.${i}.company`, editable)}>${escapeHtml(exp.company)}</span>${exp.location ? ` — <span${editableAttrs(`experiences.${i}.location`, editable)}>${escapeHtml(exp.location)}</span>` : ''}</span>
          <span class="job-period"><span${editableAttrs(`experiences.${i}.startDate`, editable)}>${escapeHtml(exp.startDate)}</span> – <span${editableAttrs(`experiences.${i}.endDate`, editable)}>${escapeHtml(exp.endDate)}</span></span>
        </div>
        ${exp.jobTitle ? `<p class="job-role"${editableAttrs(`experiences.${i}.jobTitle`, editable)}>${escapeHtml(exp.jobTitle)}</p>` : ''}
        ${exp.bullets.length > 0 ? `<ul>${exp.bullets.map((b, j) => `<li${editableAttrs(`experiences.${i}.bullets.${j}`, editable)}>${escapeHtml(b)}</li>`).join('')}</ul>` : ''}
      </div>
    `).join('')}
  </div>
  ` : ''}

  ${data.education.length > 0 ? `
  <div class="section avoid-break">
    <div class="section-title">Formation</div>
    ${data.education.map((edu, i) => `
      <div class="edu-item">
        <div class="edu-header">
          <span class="edu-title"><span${editableAttrs(`education.${i}.degree`, editable)}>${escapeHtml(edu.degree)}</span>${edu.school ? ` — <span class="edu-org"${editableAttrs(`education.${i}.school`, editable)}>${escapeHtml(edu.school)}</span>` : ''}</span>
          ${edu.year ? `<span class="edu-year"${editableAttrs(`education.${i}.year`, editable)}>${escapeHtml(edu.year)}</span>` : ''}
        </div>
        ${edu.description ? `<p class="edu-desc"${editableAttrs(`education.${i}.description`, editable)}>${escapeHtml(edu.description)}</p>` : ''}
      </div>
    `).join('')}
  </div>
  ` : ''}

  ${data.certifications && data.certifications.length > 0 ? `
  <div class="section avoid-break">
    <div class="section-title">Certifications</div>
    ${data.certifications.map(cert => `
      <div class="cert-item">
        <div class="cert-header">
          <span class="cert-title">${escapeHtml(cert.name)}${cert.issuer ? ` — <span class="cert-org">${escapeHtml(cert.issuer)}</span>` : ''}</span>
          ${cert.year ? `<span class="cert-year">${escapeHtml(cert.year)}</span>` : ''}
        </div>
      </div>
    `).join('')}
  </div>
  ` : ''}

  ${data.technicalSkills && data.technicalSkills.length > 0 ? `
  <div class="section avoid-break skills-section">
    <div class="section-title">Compétences techniques</div>
    ${data.technicalSkills.map((sk, i) => `
      <p><strong><span${editableAttrs(`technicalSkills.${i}.category`, editable)}>${escapeHtml(sk.category)}</span> :</strong> <span${editableAttrs(`technicalSkills.${i}.skills`, editable)}>${escapeHtml(sk.skills)}</span></p>
    `).join('')}
  </div>
  ` : ''}

  ${data.languages && data.languages.length > 0 ? `
  <div class="section avoid-break">
    <div class="section-title">Langues</div>
    <p class="languages">${data.languages.map((l, i) => `<span${editableAttrs(`languages.${i}.language`, editable)}>${escapeHtml(l.language)}</span>${l.level ? ` — <span${editableAttrs(`languages.${i}.level`, editable)}>${escapeHtml(l.level)}</span>` : ''}`).join(' &nbsp;•&nbsp; ')}</p>
  </div>
  ` : ''}

</article>
${editable ? `
<script>
document.querySelectorAll('[contenteditable]').forEach(el => {
  el.addEventListener('input', () => {
    window.parent.postMessage({
      type: 'cv-edit',
      field: el.dataset.field,
      value: el.innerText.trim()
    }, '*');
  });
});
</script>
` : ''}
</body>
</html>`;
};

/**
 * Génère un CV de test pour la validation des templates
 */
export const getTestCVData = (): CVData => ({
  name: 'Marie Dupont',
  jobTitle: 'Chargée de Projet Marketing Digital',
  contact: {
    phone: '06 12 34 56 78',
    email: 'marie.dupont@gmail.com',
    linkedin: 'linkedin.com/in/marie-dupont',
    location: 'Paris',
  },
  profile: 'Professionnelle du marketing digital avec 5 ans d\'expérience en gestion de campagnes multicanales. Expertise en SEO, SEA et analytics. Capacité démontrée à augmenter le trafic organique de +45% et à optimiser les budgets publicitaires pour un ROI maximal.',
  keySkills: [
    'Marketing Digital',
    'SEO/SEA',
    'Google Analytics',
    'Gestion de Projet',
    'CRM Salesforce',
    'Content Marketing',
  ],
  experiences: [
    {
      company: 'TechStartup SAS',
      location: 'Paris',
      jobTitle: 'Responsable Marketing Digital',
      startDate: '2021',
      endDate: 'Présent',
      bullets: [
        'Piloter la stratégie digitale sur un budget annuel de 150K€',
        'Augmenter le trafic organique de 45% en 12 mois via optimisation SEO',
        'Gérer une équipe de 3 personnes (content manager, community manager, designer)',
        'Déployer des campagnes Google Ads avec un ROAS de 4.2',
      ],
    },
    {
      company: 'Agence WebMarketing',
      location: 'Lyon',
      jobTitle: 'Chargée de Projet SEO',
      startDate: '2019',
      endDate: '2021',
      bullets: [
        'Accompagner 15 clients dans leur stratégie de référencement naturel',
        'Réaliser des audits techniques et sémantiques complets',
        'Former les équipes clients aux bonnes pratiques SEO',
      ],
    },
  ],
  education: [
    {
      degree: 'Master Marketing Digital',
      school: 'Université Paris-Dauphine',
      year: '2019',
    },
    {
      degree: 'Licence Économie-Gestion',
      school: 'Université Lyon 2',
      year: '2017',
    },
  ],
  certifications: [
    {
      name: 'Google Analytics Individual Qualification',
      issuer: 'Google',
      year: '2023',
    },
    {
      name: 'HubSpot Inbound Marketing',
      issuer: 'HubSpot Academy',
      year: '2022',
    },
  ],
  technicalSkills: [
    { category: 'Outils Marketing', skills: 'Google Analytics, Google Ads, SEMrush, Ahrefs, HubSpot' },
    { category: 'CRM', skills: 'Salesforce, Pipedrive' },
    { category: 'Design', skills: 'Figma, Canva, Adobe XD' },
  ],
  languages: [
    { language: 'Français', level: 'Natif' },
    { language: 'Anglais', level: 'C1' },
    { language: 'Espagnol', level: 'B2' },
  ],
});
