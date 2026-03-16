import { supabase } from "@/integrations/supabase/client";

export interface AnalysisResult {
  score: number;
  scoreDetails: {
    format: number;
    keywords: number;
    experience: number;
    readability: number;
  };
  verdict: string;
  checklist: Array<{ label: string; status: "ok" | "fail" | "warn"; detail: string }>;
  keywordsFound: string[];
  keywordsMissing: string[];
  keywordsSuggested: string[];
  suggestions: Array<{ title: string; text: string; priority: "high" | "medium" | "low"; impact?: string }>;
}

const callAnthropic = async (prompt: string, maxTokens = 1500): Promise<string> => {
  const { data, error } = await supabase.functions.invoke('anthropic-proxy', {
    body: { prompt, maxTokens },
  });

  if (error) throw new Error(error.message || "Erreur lors de l'appel API");
  if (data?.error) throw new Error(data.error);
  return data.text;
};

const getSwissContext = (region: string) => {
  if (region !== "CH") return "";
  return `
IMPORTANT - CONTEXTE SUISSE : Le candidat postule en Suisse. Tu DOIS :
- Remplacer "Professeur" par "Maître d'enseignement professionnel"
- Remplacer "lycée professionnel" par "école professionnelle"
- Utiliser les termes suisses : DGEP, CFC, formation duale, secondaire II, maturité professionnelle
- Signaler si l'email n'est pas professionnel (laposte.net, hotmail, yahoo) et recommander Gmail
- Vérifier l'adaptation au vocabulaire suisse du système éducatif et professionnel
`;
};

const getSwissSuggestion = (region: string): string => {
  if (region !== "CH") return "";
  return `Ajoute TOUJOURS cette suggestion dans les améliorations : {"title":"Vocabulaire suisse","text":"Adaptez votre vocabulaire au système suisse : remplacez les termes français par leurs équivalents suisses (école professionnelle, CFC, formation duale, DGEP, maturité professionnelle). Les recruteurs suisses accordent une grande importance à cette connaissance du système local.","priority":"high","impact":"Crédibilité locale"}`;
};

export const analyzeCV = async (
  cvText: string,
  job: string,
  region: string,
  industry: string
): Promise<AnalysisResult> => {
  const prompt = `Tu es un expert ATS. Analyse ce CV et retourne UNIQUEMENT un JSON valide sans markdown ni backticks.

CV: ${cvText.substring(0, 1500)}
Poste: ${job}
Pays: ${region}
Secteur: ${industry}

RÈGLES DE SCORING STRICTES :
- format 0-20 MAX, keywords 0-35 MAX, experience 0-25 MAX, readability 0-20 MAX
- Évalue de façon RÉALISTE. Score minimum si le contenu existe : format 8/20, keywords 5/35, experience 10/25, readability 10/20.
- Un CV avec de l'expérience professionnelle visible ne peut JAMAIS avoir 0 dans une rubrique.
- Les keywordsMissing ne doivent JAMAIS contenir un mot déjà présent dans le CV.
- score = somme des 4 sous-scores.

CHECKLIST OBLIGATOIRE — exactement ces 10 critères dans cet ordre :
1. "Lisibilité ATS" — le CV est-il parsable par un ATS ?
2. "Mots-clés secteur" — les mots-clés du secteur sont-ils présents ?
3. "Pertinence du poste" — le CV est-il aligné avec le poste ciblé ?
4. "Impact chiffré" — y a-t-il des résultats quantifiés ?
5. "Parcours chronologique" — le parcours est-il en ordre chronologique inverse ?
6. "Structure du CV" — sections claires (expérience, formation, compétences) ?
7. "Coordonnées" — email, téléphone, ville présents ? Signaler si email non pro (laposte.net, hotmail, yahoo).
8. "Profil professionnel" — y a-t-il un résumé/profil en haut du CV ?
9. "Compétences techniques" — les compétences techniques sont-elles listées ?
10. "Orthographe" — y a-t-il des fautes visibles ?

Chaque critère a status "ok", "fail" ou "warn" et un "detail" avec un conseil actionnable.

${getSwissContext(region)}
${getSwissSuggestion(region)}

JSON attendu : {"score":0,"scoreDetails":{"format":0,"keywords":0,"experience":0,"readability":0},"verdict":"","checklist":[{"label":"","status":"ok","detail":""}],"keywordsFound":[],"keywordsMissing":[],"keywordsSuggested":[],"suggestions":[{"title":"","text":"","priority":"high","impact":""}]}`;

  const text = await callAnthropic(prompt, 2000);
  return JSON.parse(text);
};

export const rewriteCV = async (
  cvText: string,
  job: string,
  region: string,
  missingKeywords: string[]
): Promise<string> => {
  const swissContext = region === "CH" ? `
CONTEXTE SUISSE OBLIGATOIRE :
- Remplacer "Professeur" par "Maître d'enseignement professionnel"
- Remplacer "lycée professionnel" par "école professionnelle"
- Utiliser : DGEP, CFC, formation duale, secondaire II, maturité professionnelle
- Si email non professionnel, suggérer Gmail` : "";

  const prompt = `Réécris ce CV pour le poste ${job} en ${region}. Intègre ces mots-clés : ${missingKeywords.join(", ")}. 

Structure ATS, chronologique inverse, résultats chiffrés.

IMPORTANT : Structure le CV avec des sections clairement séparées :
- Commence par le NOM COMPLET en majuscules sur la première ligne
- Puis les coordonnées (email, téléphone, ville)
- Puis "PROFIL PROFESSIONNEL" avec 2-3 phrases
- Puis "EXPÉRIENCE PROFESSIONNELLE" avec chaque poste formaté : Titre | Entreprise | Dates, puis puces avec •
- Puis "FORMATION"
- Puis "COMPÉTENCES"
- Puis "LANGUES" si pertinent

${swissContext}

Retourne UNIQUEMENT le CV réécrit en texte brut structuré. CV: ${cvText.substring(0, 2000)}`;
  return callAnthropic(prompt, 2500);
};

export const rewriteSelection = async (
  selection: string,
  job: string,
  keywords: string[]
): Promise<string> => {
  const prompt = `Réécris ce passage pour le poste ${job}. Intègre si possible : ${keywords.join(", ")}. Retourne UNIQUEMENT le texte réécrit. Texte: ${selection}`;
  return callAnthropic(prompt, 800);
};

export const generateCoverLetter = async (
  cvText: string,
  job: string,
  region: string,
  offerDetails?: string
): Promise<string> => {
  const swissContext = region === "CH" ? `
CONTEXTE SUISSE OBLIGATOIRE :
- Ne JAMAIS écrire "j'ai décidé de m'installer en Suisse"
- Mentionner la connaissance du système éducatif vaudois/suisse
- Ne pas laisser le statut administratif flou
- Utiliser le vocabulaire suisse : école professionnelle, CFC, formation duale, DGEP
- Ton professionnel adapté au marché suisse` : "";

  const prompt = `Rédige une lettre de motivation professionnelle pour ${job} en ${region}. CV : ${cvText.substring(0, 1500)}. Offre : ${offerDetails || "Non précisée"}. 3-4 paragraphes. ${swissContext} Retourne UNIQUEMENT la lettre.`;
  return callAnthropic(prompt, 1500);
};
