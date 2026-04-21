/**
 * Script de test pour le parser et le générateur HTML
 * Exécuter avec: npx tsx src/lib/cv/run-tests.ts
 */

import { parseCV } from './parser';
import { buildHTML } from './templateHTML';
import { TEST_CVS } from './test-cvs';
import { TEMPLATE_ORDER } from './themes';
import { COLOR_ORDER } from './colors';
import type { TemplateId, ColorPaletteId } from './types';

// Couleurs pour la console
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

interface TestResult {
  cvName: string;
  role: string;
  parsedName: string;
  parsedJobTitle: string;
  parsedContact: {
    email: boolean;
    phone: boolean;
    linkedin: boolean;
    location: boolean;
  };
  parsedSections: {
    profile: boolean;
    experiences: number;
    education: number;
    skills: boolean;
    languages: boolean;
    certifications: boolean;
  };
  totalBullets: number;
  bugs: string[];
}

function testParser(): TestResult[] {
  const results: TestResult[] = [];

  for (const testCV of TEST_CVS) {
    const parsed = parseCV(testCV.cv);
    const bugs: string[] = [];

    // Vérifier le nom
    if (!parsed.name || parsed.name.length < 3) {
      bugs.push(`Nom non parsé correctement: "${parsed.name}"`);
    }

    // Vérifier le titre
    if (!parsed.jobTitle) {
      bugs.push('Titre de poste non détecté');
    }

    // Vérifier le contact
    if (!parsed.contact.email) {
      bugs.push('Email non détecté');
    }
    if (!parsed.contact.phone) {
      bugs.push('Téléphone non détecté');
    }

    // Vérifier les expériences
    if (parsed.experiences.length === 0) {
      bugs.push('Aucune expérience parsée');
    } else {
      // Vérifier que chaque expérience a les champs requis
      for (let i = 0; i < parsed.experiences.length; i++) {
        const exp = parsed.experiences[i];
        if (!exp.company) {
          bugs.push(`Expérience ${i + 1}: entreprise manquante`);
        }
        if (!exp.jobTitle) {
          bugs.push(`Expérience ${i + 1}: titre de poste manquant`);
        }
        if (exp.bullets.length === 0) {
          bugs.push(`Expérience ${i + 1}: aucun bullet point`);
        }
      }
    }

    // Vérifier la formation
    if (parsed.education.length === 0) {
      bugs.push('Aucune formation parsée');
    }

    // Compter le total des bullets
    const totalBullets = parsed.experiences.reduce((sum, exp) => sum + exp.bullets.length, 0);
    if (parsed.experiences.length > 0 && totalBullets === 0) {
      bugs.push('Aucun bullet point dans les expériences');
    }

    results.push({
      cvName: testCV.name,
      role: testCV.role,
      parsedName: parsed.name,
      parsedJobTitle: parsed.jobTitle || '',
      parsedContact: {
        email: !!parsed.contact.email,
        phone: !!parsed.contact.phone,
        linkedin: !!parsed.contact.linkedin,
        location: !!parsed.contact.location,
      },
      parsedSections: {
        profile: !!parsed.profile,
        experiences: parsed.experiences.length,
        education: parsed.education.length,
        skills: (parsed.technicalSkills?.length || 0) > 0,
        languages: (parsed.languages?.length || 0) > 0,
        certifications: (parsed.certifications?.length || 0) > 0,
      },
      totalBullets,
      bugs,
    });
  }

  return results;
}

function testHTMLGeneration(): string[] {
  const bugs: string[] = [];

  for (const testCV of TEST_CVS) {
    const parsed = parseCV(testCV.cv);

    for (const templateId of TEMPLATE_ORDER) {
      try {
        const html = buildHTML(parsed, templateId as TemplateId, 'sarcelle');

        // Vérifier que le HTML est valide
        if (!html.includes('<!DOCTYPE html>')) {
          bugs.push(`${testCV.name} + ${templateId}: DOCTYPE manquant`);
        }
        if (!html.includes('</html>')) {
          bugs.push(`${testCV.name} + ${templateId}: balise HTML non fermée`);
        }

        // Vérifier les polices
        if (!html.includes('space-grotesk')) {
          bugs.push(`${testCV.name} + ${templateId}: police Space Grotesk manquante`);
        }
        if (!html.includes('dm-sans')) {
          bugs.push(`${testCV.name} + ${templateId}: police DM Sans manquante`);
        }

        // Vérifier les sections principales
        if (parsed.name && !html.includes(parsed.name)) {
          bugs.push(`${testCV.name} + ${templateId}: nom absent du HTML`);
        }

        // Vérifier l'échappement HTML
        if (html.includes('<script') && !html.includes('&lt;script')) {
          bugs.push(`${testCV.name} + ${templateId}: potentielle faille XSS`);
        }

      } catch (error) {
        bugs.push(`${testCV.name} + ${templateId}: ERREUR - ${error}`);
      }
    }
  }

  return bugs;
}

function analyzeHTMLSize(): { cvName: string; template: string; size: number; estimatedPages: number }[] {
  const results: { cvName: string; template: string; size: number; estimatedPages: number }[] = [];

  for (const testCV of TEST_CVS) {
    const parsed = parseCV(testCV.cv);

    for (const templateId of ['careerops', 'classic'] as TemplateId[]) {
      const html = buildHTML(parsed, templateId, 'sarcelle');

      // Estimation grossière: ~5000 caractères HTML = 1 page A4
      const estimatedPages = Math.ceil(html.length / 5000);

      results.push({
        cvName: testCV.name,
        template: templateId,
        size: html.length,
        estimatedPages,
      });
    }
  }

  return results;
}

// Exécuter les tests
console.log('\n========================================');
console.log('   TESTS DU PARSER CV - PHASE 5');
console.log('========================================\n');

const parserResults = testParser();

console.log('📋 RÉSULTATS DU PARSER:\n');
console.log('| CV | Nom | Titre | Email | Tel | Exp | Bullets | Edu | Bugs |');
console.log('|---|---|---|---|---|---|---|---|---|');

for (const result of parserResults) {
  const status = result.bugs.length === 0 ? GREEN + '✅' + RESET : RED + '❌' + RESET;
  console.log(
    `| ${result.cvName} | ${result.parsedName ? '✅' : '❌'} | ${result.parsedJobTitle ? '✅' : '❌'} | ` +
    `${result.parsedContact.email ? '✅' : '❌'} | ${result.parsedContact.phone ? '✅' : '❌'} | ` +
    `${result.parsedSections.experiences} | ${result.totalBullets} | ${result.parsedSections.education} | ` +
    `${result.bugs.length > 0 ? result.bugs.join(', ') : '-'} |`
  );
}

console.log('\n📋 BUGS DÉTECTÉS DANS LE PARSER:\n');
for (const result of parserResults) {
  if (result.bugs.length > 0) {
    console.log(`${RED}❌ ${result.cvName}:${RESET}`);
    for (const bug of result.bugs) {
      console.log(`   - ${bug}`);
    }
  }
}

console.log('\n========================================');
console.log('   TESTS GÉNÉRATION HTML');
console.log('========================================\n');

const htmlBugs = testHTMLGeneration();
if (htmlBugs.length === 0) {
  console.log(`${GREEN}✅ Aucun bug détecté dans la génération HTML${RESET}`);
} else {
  console.log(`${RED}❌ ${htmlBugs.length} bugs détectés:${RESET}`);
  for (const bug of htmlBugs) {
    console.log(`   - ${bug}`);
  }
}

console.log('\n========================================');
console.log('   ANALYSE TAILLE HTML (estimation pages)');
console.log('========================================\n');

const sizeResults = analyzeHTMLSize();
console.log('| CV | Template | Taille | Pages estimées |');
console.log('|---|---|---|---|');
for (const result of sizeResults) {
  const warning = result.estimatedPages > 2 ? YELLOW + ' ⚠️' + RESET : '';
  console.log(`| ${result.cvName} | ${result.template} | ${result.size} | ${result.estimatedPages}${warning} |`);
}

console.log('\n========================================');
console.log('   FIN DES TESTS');
console.log('========================================\n');
