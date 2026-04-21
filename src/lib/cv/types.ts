// Types pour le système de CV - Phase 1 de la refonte templates

export type Experience = {
  company: string;
  location?: string;
  jobTitle: string;
  startDate: string;
  endDate: string;
  bullets: string[];
};

export type Education = {
  degree: string;
  school: string;
  year: string;
  description?: string;
};

export type Certification = {
  name: string;
  issuer: string;
  year: string;
};

export type SkillCategory = {
  category: string;
  skills: string;
};

export type Language = {
  language: string;
  level: string;
};

export type CVData = {
  name: string;
  jobTitle?: string;
  contact: {
    phone?: string;
    email?: string;
    linkedin?: string;
    location?: string;
  };
  profile?: string;
  keySkills?: string[];
  experiences: Experience[];
  education: Education[];
  certifications?: Certification[];
  technicalSkills?: SkillCategory[];
  languages?: Language[];
};

// Templates disponibles (Phase 2+)
export type TemplateId =
  | 'careerops'
  | 'classic'
  | 'modern'
  | 'minimal'
  | 'executive'
  | 'accent'
  | 'parcours';

// Palettes de couleurs disponibles (Phase 2+)
export type ColorPaletteId =
  | 'sarcelle'
  | 'marine'
  | 'bordeaux'
  | 'foret'
  | 'or'
  | 'violet'
  | 'turquoise'
  | 'corail'
  | 'anthracite'
  | 'indigo';

export type Theme = {
  templateId: TemplateId;
  colorId: ColorPaletteId;
};
