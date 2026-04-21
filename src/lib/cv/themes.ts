/**
 * Thèmes CSS pour les templates CV
 * Phase 2 de la refonte templates
 *
 * Chaque thème ne fait que du styling CSS.
 * La structure HTML reste identique pour tous les templates.
 */

import type { TemplateId } from './types';

export const THEMES: Record<TemplateId, string> = {
  careerops: `
    /* Career-ops : gradient premium, titres Space Grotesk */
    .cv-careerops .header-gradient {
      display: block;
      height: 2px;
      background: linear-gradient(to right, var(--cv-primary), var(--cv-accent));
      border-radius: 1px;
      margin: 2px 0 8px;
    }
  `,

  classic: `
    /* Classique : sobre, nom centré, titres soulignés */
    .cv-classic .header h1 {
      text-align: center;
      color: var(--cv-primary);
    }
    .cv-classic .contact {
      justify-content: center;
      margin-bottom: 10px;
    }
    .cv-classic .section-title {
      color: var(--cv-primary);
      border-bottom: 1.5px solid var(--cv-primary);
      letter-spacing: 0.08em;
    }
    .cv-classic .job-company,
    .cv-classic .edu-org,
    .cv-classic .cert-org {
      color: var(--cv-primary);
    }
  `,

  modern: `
    /* Moderne : bandeau coloré en en-tête */
    .cv-modern {
      padding: 0;
    }
    .cv-modern .modern-band {
      background: var(--cv-primary);
      color: white;
      padding: 24px 32px 20px;
      margin-bottom: 14px;
    }
    .cv-modern .modern-band h1 {
      color: white;
    }
    .cv-modern .modern-band .contact {
      color: rgba(255,255,255,0.85);
    }
    .cv-modern .modern-band .contact .sep {
      color: rgba(255,255,255,0.4);
    }
    .cv-modern .section {
      padding: 0 32px;
    }
    .cv-modern .section-title {
      color: var(--cv-primary);
      border-bottom: none;
      padding-bottom: 0;
    }
    .cv-modern .job-company,
    .cv-modern .edu-org,
    .cv-modern .cert-org {
      color: var(--cv-primary);
    }
  `,

  minimal: `
    /* Minimaliste : pure typographie, tirets pointillés */
    .cv-minimal .header h1 {
      font-weight: 400;
      letter-spacing: -0.01em;
      text-align: center;
    }
    .cv-minimal .contact {
      justify-content: center;
      color: #888;
    }
    .cv-minimal .section-title {
      color: #555;
      border-bottom: 1px dashed #ccc;
      font-weight: 500;
      letter-spacing: 0.15em;
    }
    .cv-minimal .job-company,
    .cv-minimal .edu-org,
    .cv-minimal .cert-org {
      color: #222;
      font-weight: 500;
    }
    .cv-minimal .competency-tag {
      color: #555;
      background: #f5f5f5;
      border-color: #e5e5e5;
    }
  `,

  executive: `
    /* Exécutif : serif premium pour profils seniors */
    .cv-executive .header h1 {
      font-family: 'Playfair Display', Georgia, serif;
      font-weight: 700;
      font-size: 30px;
      text-align: center;
      color: #1a1a1a;
      letter-spacing: 0;
    }
    .cv-executive .contact {
      justify-content: center;
      font-style: italic;
      color: #666;
    }
    .cv-executive .header-gradient {
      display: block;
      height: 1px;
      background: #1a1a1a;
      margin: 8px auto 12px;
      width: 60px;
    }
    .cv-executive .section-title {
      font-family: 'Playfair Display', Georgia, serif;
      font-weight: 600;
      font-size: 15px;
      text-transform: none;
      letter-spacing: 0;
      color: var(--cv-primary);
      border-bottom: 0.5px solid #1a1a1a;
    }
    .cv-executive .job-company {
      font-family: 'Playfair Display', Georgia, serif;
      color: #1a1a1a;
      font-weight: 600;
      font-size: 13px;
    }
    .cv-executive .edu-org,
    .cv-executive .cert-org {
      color: #1a1a1a;
    }
    .cv-executive .competency-tag {
      border-radius: 0;
      background: transparent;
      color: #333;
      border: 0.5px solid #999;
      font-style: italic;
    }
  `,

  accent: `
    /* Accent : marqueurs colorés à gauche des sections */
    .cv-accent .section-title {
      position: relative;
      padding-left: 14px;
      border-bottom: none;
      color: #1a1a2e;
      font-weight: 700;
    }
    .cv-accent .section-title::before {
      content: "";
      position: absolute;
      left: 0;
      top: 3px;
      width: 5px;
      height: 13px;
      background: var(--cv-primary);
      border-radius: 1px;
    }
    .cv-accent .job-company,
    .cv-accent .edu-org,
    .cv-accent .cert-org {
      color: var(--cv-primary);
    }
    .cv-accent .competency-tag {
      color: #1a1a2e;
      background: #f5f5f5;
      border-color: #e0e0e0;
    }
  `,

  parcours: `
    /* Parcours : timeline verticale le long des expériences */
    .cv-parcours .section-title {
      color: var(--cv-primary);
      border-bottom: 0.5px solid var(--cv-primary);
    }
    .cv-parcours .job {
      border-left: 2px solid var(--cv-primary);
      padding-left: 14px;
      margin-left: 2px;
    }
    .cv-parcours .job-company {
      color: #1a1a2e;
      font-weight: 600;
    }
    .cv-parcours .job-period {
      color: var(--cv-primary);
      font-weight: 500;
    }
    .cv-parcours .edu-org,
    .cv-parcours .cert-org {
      color: var(--cv-primary);
    }
  `,
};

// Métadonnées des templates pour l'UI de sélection
export const TEMPLATE_METADATA: Record<TemplateId, { name: string; desc: string; ats: boolean }> = {
  careerops: {
    name: 'Career-ops',
    desc: 'Gradient premium, titres Space Grotesk',
    ats: true,
  },
  classic: {
    name: 'Classique',
    desc: 'Sobre, nom centré, titres soulignés',
    ats: true,
  },
  modern: {
    name: 'Moderne',
    desc: 'Bandeau coloré en en-tête',
    ats: true,
  },
  minimal: {
    name: 'Minimaliste',
    desc: 'Pure typographie, tirets pointillés',
    ats: true,
  },
  executive: {
    name: 'Exécutif',
    desc: 'Serif premium pour profils seniors',
    ats: true,
  },
  accent: {
    name: 'Accent',
    desc: 'Marqueurs colorés à gauche des sections',
    ats: true,
  },
  parcours: {
    name: 'Parcours',
    desc: 'Timeline verticale le long des expériences',
    ats: true,
  },
};

// Ordre d'affichage des templates dans le sélecteur
export const TEMPLATE_ORDER: TemplateId[] = [
  'careerops',
  'classic',
  'modern',
  'minimal',
  'executive',
  'accent',
  'parcours',
];
