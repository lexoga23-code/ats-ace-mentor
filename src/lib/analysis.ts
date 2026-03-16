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

export const analyzeCV = async (
  cvText: string,
  job: string,
  region: string,
  industry: string
): Promise<AnalysisResult> => {
  const prompt = `Tu es un expert ATS. Analyse ce CV et retourne UNIQUEMENT un JSON valide sans markdown. CV: ${cvText.substring(0, 1500)}. Poste: ${job}. Pays: ${region}. Secteur: ${industry}. Scores STRICTS : format 0-20 MAX, keywords 0-35 MAX, experience 0-25 MAX, readability 0-20 MAX. JSON : {"score":0,"scoreDetails":{"format":0,"keywords":0,"experience":0,"readability":0},"verdict":"","checklist":[{"label":"","status":"ok","detail":""}],"keywordsFound":[],"keywordsMissing":[],"keywordsSuggested":[],"suggestions":[{"title":"","text":"","priority":"high","impact":""}]}`;
  const text = await callAnthropic(prompt);
  return JSON.parse(text);
};

export const rewriteCV = async (
  cvText: string,
  job: string,
  region: string,
  missingKeywords: string[]
): Promise<string> => {
  const prompt = `Réécris ce CV pour le poste ${job} en ${region}. Intègre ces mots-clés : ${missingKeywords.join(", ")}. Structure ATS, chronologique inverse, résultats chiffrés. Retourne UNIQUEMENT le CV réécrit en texte brut. CV: ${cvText.substring(0, 2000)}`;
  return callAnthropic(prompt, 2000);
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
  const prompt = `Rédige une lettre de motivation professionnelle pour ${job} en ${region}. CV : ${cvText.substring(0, 1500)}. Offre : ${offerDetails || "Non précisée"}. 3-4 paragraphes. Retourne UNIQUEMENT la lettre.`;
  return callAnthropic(prompt, 1500);
};
