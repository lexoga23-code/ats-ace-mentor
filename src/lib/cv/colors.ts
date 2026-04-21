/**
 * Palettes de couleurs pour les templates CV
 * Phase 2 de la refonte templates
 *
 * Chaque palette définit 4 valeurs :
 * - primary : couleur principale (titres, accents forts)
 * - accent : variante complémentaire (sous-titres, liens)
 * - primarySoft : fond très léger pour les tags
 * - primaryBorder : bordure de tag
 */

import type { ColorPaletteId } from './types';

export type ColorPalette = {
  id: ColorPaletteId;
  name: string;
  primary: string;
  accent: string;
  primarySoft: string;
  primaryBorder: string;
};

export const COLORS: Record<ColorPaletteId, ColorPalette> = {
  sarcelle: {
    id: 'sarcelle',
    name: 'Sarcelle',
    primary: 'hsl(187, 74%, 32%)',
    accent: 'hsl(270, 70%, 45%)',
    primarySoft: 'hsl(187, 40%, 95%)',
    primaryBorder: 'hsl(187, 40%, 88%)',
  },
  marine: {
    id: 'marine',
    name: 'Marine',
    primary: '#1a365d',
    accent: '#2c5282',
    primarySoft: '#ebf4fb',
    primaryBorder: '#c3dafe',
  },
  bordeaux: {
    id: 'bordeaux',
    name: 'Bordeaux',
    primary: '#742a2a',
    accent: '#9b2c2c',
    primarySoft: '#fff5f5',
    primaryBorder: '#fed7d7',
  },
  foret: {
    id: 'foret',
    name: 'Forêt',
    primary: '#1a4731',
    accent: '#276749',
    primarySoft: '#f0fff4',
    primaryBorder: '#c6f6d5',
  },
  or: {
    id: 'or',
    name: 'Or',
    primary: '#744210',
    accent: '#975a16',
    primarySoft: '#fffaf0',
    primaryBorder: '#feebc8',
  },
  violet: {
    id: 'violet',
    name: 'Violet',
    primary: '#44337a',
    accent: '#6b46c1',
    primarySoft: '#faf5ff',
    primaryBorder: '#e9d8fd',
  },
  turquoise: {
    id: 'turquoise',
    name: 'Turquoise',
    primary: '#0097A7',
    accent: '#00ACC1',
    primarySoft: '#e0f7fa',
    primaryBorder: '#b2ebf2',
  },
  corail: {
    id: 'corail',
    name: 'Corail',
    primary: '#c53030',
    accent: '#e53e3e',
    primarySoft: '#fff5f5',
    primaryBorder: '#feb2b2',
  },
  anthracite: {
    id: 'anthracite',
    name: 'Anthracite',
    primary: '#2d3748',
    accent: '#4a5568',
    primarySoft: '#f7fafc',
    primaryBorder: '#e2e8f0',
  },
  indigo: {
    id: 'indigo',
    name: 'Indigo',
    primary: '#3F51B5',
    accent: '#5C6BC0',
    primarySoft: '#e8eaf6',
    primaryBorder: '#c5cae9',
  },
};

// Ordre d'affichage des couleurs dans le sélecteur
export const COLOR_ORDER: ColorPaletteId[] = [
  'sarcelle',
  'marine',
  'bordeaux',
  'foret',
  'or',
  'violet',
  'turquoise',
  'corail',
  'anthracite',
  'indigo',
];
