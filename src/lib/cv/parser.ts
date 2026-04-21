/**
 * Parser CV partagé - Phase 1 de la refonte templates
 * Convertit le texte brut d'un CV en structure CVData typée
 */

import type { CVData, Experience, Education, Certification, SkillCategory, Language } from './types';

// Mapping des synonymes de sections (insensible à la casse)
const SECTION_MAPPINGS: Record<string, string[]> = {
  profile: [
    'PROFIL', 'PROFIL PROFESSIONNEL', 'RÉSUMÉ', 'RESUME', 'SUMMARY',
    'ABOUT', 'À PROPOS', 'A PROPOS', 'PRESENTATION', 'PRÉSENTATION',
    'OBJECTIF', 'OBJECTIF PROFESSIONNEL'
  ],
  experience: [
    'EXPÉRIENCE', 'EXPERIENCE', 'EXPÉRIENCE PROFESSIONNELLE',
    'EXPERIENCE PROFESSIONNELLE', 'EXPÉRIENCES', 'EXPERIENCES',
    'PARCOURS', 'PARCOURS PROFESSIONNEL', 'CARRIÈRE', 'CARRIERE'
  ],
  education: [
    'FORMATION', 'FORMATIONS', 'ÉTUDES', 'ETUDES', 'EDUCATION',
    'DIPLÔMES', 'DIPLOMES', 'CURSUS', 'PARCOURS ACADÉMIQUE',
    'PARCOURS ACADEMIQUE', 'SCOLARITÉ', 'SCOLARITE'
  ],
  skills: [
    'COMPÉTENCES', 'COMPETENCES', 'COMPÉTENCES TECHNIQUES',
    'COMPETENCES TECHNIQUES', 'SKILLS', 'SAVOIR-FAIRE',
    'SAVOIR FAIRE', 'APTITUDES', 'COMPÉTENCES CLÉS',
    'COMPETENCES CLES', 'HARD SKILLS', 'SOFT SKILLS'
  ],
  certifications: [
    'CERTIFICATIONS', 'CERTIFICATION', 'CERTIFICATS',
    'ACCRÉDITATIONS', 'ACCREDITATIONS', 'QUALIFICATIONS',
    'HABILITATIONS'
  ],
  languages: [
    'LANGUES', 'LANGUAGES', 'LANGUES PARLÉES', 'LANGUES PARLEES',
    'COMPÉTENCES LINGUISTIQUES', 'COMPETENCES LINGUISTIQUES'
  ]
};

// Normalise une chaîne pour comparaison (sans accents, uppercase)
const normalize = (str: string): string =>
  str
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

// Identifie le type sémantique d'une section
// Utilise startsWith pour matcher "FORMATION EN COURS" avec "FORMATION"
// Limite longueur < 60 pour éviter faux positifs sur bullets mal formatés
const identifySectionType = (title: string): string | null => {
  const normalized = normalize(title);

  // Ignorer les lignes trop longues (probablement pas un header)
  if (title.length >= 60) return null;

  for (const [type, synonyms] of Object.entries(SECTION_MAPPINGS)) {
    for (const syn of synonyms) {
      const normalizedSyn = normalize(syn);
      // Match exact OU le titre commence par le synonyme
      if (normalized === normalizedSyn || normalized.startsWith(normalizedSyn + ' ')) {
        return type;
      }
    }
  }
  return null;
};

// Vérifie si une ligne est un header de section
const isSectionHeader = (line: string): boolean => {
  const trimmed = line.trim();
  if (trimmed.length <= 3 || trimmed.length >= 60) return false;
  if (trimmed.startsWith('•') || trimmed.startsWith('-') || trimmed.startsWith('–')) return false;

  // Header si tout en majuscules ou finit par ":"
  const isUpperCase = trimmed === trimmed.toUpperCase() && /[A-ZÀ-Ü]/.test(trimmed);
  const endsWithColon = trimmed.endsWith(':');

  return isUpperCase || endsWithColon;
};

// Parse la ligne de contact en champs séparés
const parseContactLine = (line: string): CVData['contact'] => {
  const contact: CVData['contact'] = {};

  // Split sur | ou plusieurs espaces
  const parts = line.split(/\s*\|\s*|\s{3,}/).map(p => p.trim()).filter(Boolean);

  for (const part of parts) {
    // Email
    if (/@/.test(part) && !contact.email) {
      const emailMatch = part.match(/[\w.-]+@[\w.-]+\.\w+/);
      if (emailMatch) contact.email = emailMatch[0];
      continue;
    }

    // LinkedIn
    if (/linkedin\.com/i.test(part) && !contact.linkedin) {
      contact.linkedin = part;
      continue;
    }

    // Téléphone (formats FR/CH)
    const phoneMatch = part.match(/(?:\+33|0033|0)[1-9](?:[\s.-]?\d{2}){4}|\+41[\s.-]?\d{2}[\s.-]?\d{3}[\s.-]?\d{2}[\s.-]?\d{2}/);
    if (phoneMatch && !contact.phone) {
      contact.phone = phoneMatch[0];
      continue;
    }

    // Pattern téléphone simple (suite de chiffres)
    if (/^\d{2}[\s.-]\d{2}[\s.-]\d{2}[\s.-]\d{2}[\s.-]\d{2}$/.test(part) && !contact.phone) {
      contact.phone = part;
      continue;
    }

    // Sinon c'est probablement la ville (si pas trop long)
    if (!contact.location && part.length < 40 && !/^\d+$/.test(part)) {
      // Éviter les faux positifs (pas de @ ni de chiffres dominants)
      if (!/@/.test(part) && !/\d{4,}/.test(part)) {
        contact.location = part;
      }
    }
  }

  return contact;
};

// Parse une expérience professionnelle depuis les lignes
const parseExperience = (lines: string[]): Experience[] => {
  const experiences: Experience[] = [];
  let current: Partial<Experience> | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Détection header d'expérience : contient des dates (YYYY) et possiblement |
    const hasYear = /\b(19|20)\d{2}\b/.test(line);
    const hasSeparator = /\|/.test(line) || /\s[–—-]\s/.test(line);
    const isBullet = /^[•\-–]\s/.test(line);

    // Nouvelle expérience si on a une année et ce n'est pas un bullet
    if (hasYear && !isBullet && (hasSeparator || line.length < 100)) {
      // Sauvegarder l'expérience précédente
      if (current && current.company) {
        experiences.push({
          company: current.company,
          location: current.location,
          jobTitle: current.jobTitle || '',
          startDate: current.startDate || '',
          endDate: current.endDate || '',
          bullets: current.bullets || []
        });
      }

      // Parser le header de l'expérience
      current = { bullets: [] };

      // Extraire les dates
      const datePatterns = [
        // "2020 – Présent", "2020 - 2023", "01/2020 – 12/2023"
        /(\d{1,2}\/)?(\d{4})\s*[–—-]\s*(Présent|Aujourd'hui|Present|Actuel|\d{1,2}\/\d{4}|\d{4})/i,
        // "Depuis 2020", "2020 à aujourd'hui"
        /(Depuis\s+)?(\d{4})\s*(à\s+)?(aujourd'hui|présent|actuel)?/i
      ];

      for (const pattern of datePatterns) {
        const match = line.match(pattern);
        if (match) {
          const fullMatch = match[0];
          const parts = fullMatch.split(/\s*[–—-]\s*|\s+à\s+/i);
          current.startDate = parts[0]?.replace(/^Depuis\s+/i, '').trim() || '';
          current.endDate = parts[1]?.trim() || 'Présent';
          break;
        }
      }

      // Extraire entreprise et lieu (avant les dates généralement)
      const beforeDates = line.split(/\d{4}/)[0] || line;
      const companyParts = beforeDates.split(/\s*\|\s*|\s*[–—]\s*/).map(p => p.trim()).filter(Boolean);

      if (companyParts.length >= 1) {
        current.company = companyParts[0];
      }
      if (companyParts.length >= 2) {
        // Le deuxième élément peut être le lieu ou le poste
        const second = companyParts[1];
        // Si c'est une ville (court, pas de verbe d'action)
        if (second.length < 30 && !/\b(de|du|des|le|la|les)\b/i.test(second)) {
          current.location = second;
        } else {
          current.jobTitle = second;
        }
      }

      continue;
    }

    // Ligne de titre de poste (juste après le header, sans bullet)
    if (current && !current.jobTitle && !isBullet && line.length < 80) {
      // Vérifier que ce n'est pas une nouvelle expérience
      if (!hasYear) {
        current.jobTitle = line;
        continue;
      }
    }

    // Bullet point
    if (current && isBullet) {
      const bulletText = line.replace(/^[•\-–]\s*/, '').trim();
      if (bulletText) {
        current.bullets = current.bullets || [];
        current.bullets.push(bulletText);
      }
      continue;
    }

    // Ligne de texte simple (potentiellement partie d'un bullet multiligne ou description)
    if (current && current.bullets && current.bullets.length > 0) {
      // Ajouter à la dernière puce si c'est une continuation
      if (line.length > 20 && !hasYear) {
        current.bullets[current.bullets.length - 1] += ' ' + line;
      }
    }
  }

  // Sauvegarder la dernière expérience
  if (current && current.company) {
    experiences.push({
      company: current.company,
      location: current.location,
      jobTitle: current.jobTitle || '',
      startDate: current.startDate || '',
      endDate: current.endDate || '',
      bullets: current.bullets || []
    });
  }

  return experiences;
};

// Parse les formations
const parseEducation = (lines: string[]): Education[] => {
  const education: Education[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || /^[•\-–]/.test(trimmed)) continue;

    // Format typique : "Diplôme — École — Année" ou "Diplôme | École | Année"
    const parts = trimmed.split(/\s*[–—|]\s*/).map(p => p.trim()).filter(Boolean);

    // Chercher l'année
    const yearMatch = trimmed.match(/\b(19|20)\d{2}\b/);
    const year = yearMatch ? yearMatch[0] : '';

    if (parts.length >= 2) {
      // Identifier quel part est l'école vs le diplôme
      let degree = parts[0];
      let school = parts.length > 2 ? parts[1] : parts[1];

      // Si la dernière partie est l'année, ajuster
      if (/^\d{4}$/.test(parts[parts.length - 1])) {
        if (parts.length === 3) {
          degree = parts[0];
          school = parts[1];
        } else if (parts.length === 2) {
          // "Diplôme — 2020" -> chercher l'école dans le diplôme
          const degreeParts = parts[0].split(/\s+(?:à|chez|at)\s+/i);
          if (degreeParts.length === 2) {
            degree = degreeParts[0];
            school = degreeParts[1];
          }
        }
      }

      education.push({
        degree: degree.replace(/\s*\d{4}\s*$/, '').trim(),
        school: school.replace(/\s*\d{4}\s*$/, '').trim(),
        year
      });
    } else if (yearMatch && trimmed.length > 10) {
      // Ligne simple avec année
      education.push({
        degree: trimmed.replace(/\s*\d{4}\s*$/, '').trim(),
        school: '',
        year
      });
    }
  }

  return education;
};

// Parse les compétences techniques
const parseSkills = (lines: string[]): SkillCategory[] => {
  const skills: SkillCategory[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Format : "Catégorie : compétence1, compétence2" ou "Catégorie — comp1, comp2"
    const match = trimmed.match(/^([^:–—]+)\s*[:–—]\s*(.+)$/);

    if (match) {
      skills.push({
        category: match[1].trim(),
        skills: match[2].trim()
      });
    } else if (!trimmed.startsWith('•') && !trimmed.startsWith('-')) {
      // Ligne simple de compétences
      skills.push({
        category: 'Compétences',
        skills: trimmed
      });
    }
  }

  return skills;
};

// Parse les langues
const parseLanguages = (lines: string[]): Language[] => {
  const languages: Language[] = [];

  // Joindre toutes les lignes pour parser ensemble
  const combined = lines.join(' | ');

  // Séparer par | ou par —
  const parts = combined.split(/\s*\|\s*|\s*[–—]\s*(?=[A-Z])/).map(p => p.trim()).filter(Boolean);

  for (const part of parts) {
    // Format : "Français — Natif" ou "Anglais (C1)" ou "Anglais - Courant"
    const match = part.match(/^([A-Za-zÀ-ÿ]+)\s*[–—:\-]\s*(.+)$/i) ||
                  part.match(/^([A-Za-zÀ-ÿ]+)\s*\(([^)]+)\)$/i);

    if (match) {
      languages.push({
        language: match[1].trim(),
        level: match[2].trim()
      });
    } else if (/^[A-Za-zÀ-ÿ]+$/.test(part.trim())) {
      // Juste le nom de la langue
      languages.push({
        language: part.trim(),
        level: ''
      });
    }
  }

  return languages;
};

// Parse les certifications
const parseCertifications = (lines: string[]): Certification[] => {
  const certifications: Certification[] = [];

  for (const line of lines) {
    const trimmed = line.trim().replace(/^[•\-–]\s*/, '');
    if (!trimmed) continue;

    // Format : "Nom certification — Organisme — Année"
    const parts = trimmed.split(/\s*[–—|]\s*/).map(p => p.trim()).filter(Boolean);
    const yearMatch = trimmed.match(/\b(19|20)\d{2}\b/);

    if (parts.length >= 2) {
      certifications.push({
        name: parts[0].replace(/\s*\d{4}\s*$/, '').trim(),
        issuer: parts[1].replace(/\s*\d{4}\s*$/, '').trim(),
        year: yearMatch ? yearMatch[0] : ''
      });
    } else if (trimmed.length > 5) {
      certifications.push({
        name: trimmed.replace(/\s*\d{4}\s*$/, '').trim(),
        issuer: '',
        year: yearMatch ? yearMatch[0] : ''
      });
    }
  }

  return certifications;
};

/**
 * Parse un texte brut de CV en structure CVData typée
 * Ne throw jamais - retourne un CVData avec champs vides si parsing échoue
 */
export const parseCV = (text: string): CVData => {
  const lines = text.split('\n').map(l => l.trim());

  // Résultat par défaut
  const result: CVData = {
    name: '',
    contact: {},
    experiences: [],
    education: []
  };

  // État du parsing
  let lineIndex = 0;
  let currentSectionType: string | null = null;
  let currentSectionLines: string[] = [];
  const sections: Map<string, string[]> = new Map();

  // Phase 1 : Extraire nom, contact, titre (premières lignes avant sections)
  for (lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex];
    if (!line) continue;

    // Première ligne non vide = nom (AVANT de vérifier les headers de section)
    // Ceci évite de confondre "SOPHIE MARTIN" (nom en majuscules) avec un header
    if (!result.name && lineIndex < 3 && line.length < 60 && !line.startsWith('•')) {
      result.name = line;
      continue;
    }

    // Ligne de contact (email, téléphone, ou séparateurs |)
    if (!result.contact.email && !result.contact.phone) {
      if (line.includes('@') || /\d{2}[\s.-]\d{2}/.test(line) || (line.includes('|') && line.length < 150)) {
        result.contact = parseContactLine(line);
        continue;
      }
    }

    // Titre de poste (ligne courte, pas de contact, pas de bullet)
    if (!result.jobTitle && lineIndex < 6 && line.length < 80) {
      if (!line.includes('@') && !/\d{2}[\s.-]\d{2}/.test(line) && !line.startsWith('•')) {
        result.jobTitle = line;
        continue;
      }
    }

    // Vérifier si on atteint une section (APRÈS avoir extrait nom/contact/titre)
    if (isSectionHeader(line)) {
      break;
    }
  }

  // Phase 2 : Parser les sections
  for (; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex];

    if (isSectionHeader(line)) {
      // Sauvegarder la section précédente
      if (currentSectionType && currentSectionLines.length > 0) {
        sections.set(currentSectionType, [...currentSectionLines]);
      }

      // Identifier la nouvelle section
      const cleanTitle = line.replace(/:$/, '').trim();
      currentSectionType = identifySectionType(cleanTitle) || 'other';
      currentSectionLines = [];
    } else if (line && currentSectionType) {
      currentSectionLines.push(line);
    }
  }

  // Sauvegarder la dernière section
  if (currentSectionType && currentSectionLines.length > 0) {
    sections.set(currentSectionType, [...currentSectionLines]);
  }

  // Phase 3 : Convertir les sections en données typées

  // Profil
  const profileLines = sections.get('profile');
  if (profileLines && profileLines.length > 0) {
    result.profile = profileLines.join(' ').trim();
  }

  // Expériences
  const experienceLines = sections.get('experience');
  if (experienceLines && experienceLines.length > 0) {
    result.experiences = parseExperience(experienceLines);
  }

  // Formation
  const educationLines = sections.get('education');
  if (educationLines && educationLines.length > 0) {
    result.education = parseEducation(educationLines);
  }

  // Compétences techniques
  const skillsLines = sections.get('skills');
  if (skillsLines && skillsLines.length > 0) {
    result.technicalSkills = parseSkills(skillsLines);

    // Extraire aussi les keySkills (premiers mots-clés)
    const allSkills = skillsLines.join(' ');
    const keywords = allSkills
      .split(/[,;|]/)
      .map(s => s.trim())
      .filter(s => s.length > 2 && s.length < 30)
      .slice(0, 10);
    if (keywords.length > 0) {
      result.keySkills = keywords;
    }
  }

  // Langues
  const languagesLines = sections.get('languages');
  if (languagesLines && languagesLines.length > 0) {
    result.languages = parseLanguages(languagesLines);
  }

  // Certifications
  const certificationsLines = sections.get('certifications');
  if (certificationsLines && certificationsLines.length > 0) {
    result.certifications = parseCertifications(certificationsLines);
  }

  return result;
};

/**
 * Formate un contact CVData en chaîne lisible (pour affichage legacy)
 */
export const formatContact = (contact: CVData['contact']): string => {
  const parts: string[] = [];
  if (contact.phone) parts.push(contact.phone);
  if (contact.email) parts.push(contact.email);
  if (contact.linkedin) parts.push(contact.linkedin);
  if (contact.location) parts.push(contact.location);
  return parts.join(' | ');
};
