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
  checklist: Array<{ label: string; status: "ok" | "fail" | "warn"; detail: string; correction?: string; impact?: string }>;
  keywordsFound: string[];
  keywordsMissing: string[];
  keywordsSuggested: string[];
  suggestions: Array<{ title: string; text: string; priority: "high" | "medium" | "low"; impact?: string }>;
}

const callAnthropic = async (prompt: string, maxTokens = 1500, temperature = 0.3): Promise<string> => {
  const { data, error } = await supabase.functions.invoke('anthropic-proxy', {
    body: { prompt, maxTokens, temperature },
  });

  if (error) throw new Error(error.message || "Erreur lors de l'appel API");
  if (data?.error) throw new Error(data.error);
  return data.text;
};

export const analyzeCV = async (
  cvText: string,
  job: string,
  region: string,
  industry: string,
  jobDescription: string
): Promise<AnalysisResult> => {
  const country = region === "CH" ? "Suisse romande" : "France";

  const prompt = `Tu es un expert RH senior spécialisé dans le recrutement en France et en Suisse romande, avec 15 ans d'expérience dans l'éducation, la finance, la tech et la santé. Tu connais parfaitement les logiciels ATS Workday, SAP SuccessFactors, Taleo et SmartRecruiters. Tu analyses les CVs avec la rigueur d'un recruteur qui reçoit 200 candidatures pour un poste.

Analyse ce CV et retourne UNIQUEMENT un JSON valide sans markdown ni texte autour.

CV : ${cvText.substring(0, 2000)}
Poste visé : ${job}
Pays : ${country}
Secteur : ${industry}
Offre d'emploi : ${jobDescription}

RÈGLES DE SCORING STRICTES — ne jamais dépasser ces maximums :
- format : 0 à 20 MAX
- keywords : 0 à 35 MAX
- experience : 0 à 25 MAX
- readability : 0 à 20 MAX
- score total = somme des 4 rubriques

RÈGLES DE SCORING RÉALISTE — ne jamais mettre 0 si le contenu existe :
- Si le CV contient de l'expérience professionnelle visible → experience minimum 10/25
- Si le CV contient un nom, email ou téléphone → readability minimum 8/20
- Si le CV contient des mots liés au poste → keywords minimum 5/35
- Si le CV est en texte lisible sans colonnes → format minimum 10/20

RÈGLE DE COHÉRENCE ABSOLUE :
- Les keywordsMissing ne doivent JAMAIS contenir un mot déjà présent dans le CV
- Relis le CV avant de lister les mots manquants
- Si un mot apparaît même une fois dans le CV, il va dans keywordsFound, jamais dans keywordsMissing

${region === "CH" ? `RÈGLES POUR LA SUISSE :
- Utiliser le vocabulaire suisse : école professionnelle (pas lycée professionnel), maître d'enseignement professionnel (pas professeur), secondaire II, DGEP, CFC, formation duale, maturité professionnelle, LPP, AVS, CCT
- Signaler si l'email est non professionnel (laposte.net, hotmail, yahoo, orange) et recommander Gmail
- Toujours inclure dans les suggestions : "Adaptez votre vocabulaire au système suisse romand — les recruteurs suisses valorisent fortement la connaissance des termes locaux (DGEP, secondaire II, école professionnelle)"
- Dans le CV réécrit, ne jamais laisser "lycée professionnel" ou "Professeur" si contexte suisse` : ""}

RÈGLES POUR LES SUGGESTIONS :
- Chaque suggestion doit être CONCRÈTE et ACTIONNABLE — jamais vague
- Mauvais exemple à éviter : "Améliorez votre CV"
- Bon exemple : "Ajoutez votre taux de réussite aux examens et le nombre d'élèves encadrés. Ex : 95% de réussite sur 3 ans, 28 élèves en classe principale"
- Chaque suggestion doit indiquer l'impact estimé en points
- Maximum 5 suggestions, classées par impact décroissant

CHECKLIST — exactement ces 10 critères dans cet ordre, chacun avec ok/fail/warn et des champs detail, correction, impact :
- "detail" = une phrase décrivant ce qui est détecté dans le CV (factuel)
- "correction" = si warn ou fail : une correction CONCRÈTE avec un EXEMPLE SPÉCIFIQUE basé sur le contenu réel du CV. Ne jamais donner un conseil générique. Si ok : chaîne vide.
- "impact" = estimation de l'impact sur le score si corrigé (ex: "+3 pts format", "+5 pts keywords"). Si ok : chaîne vide.

Critères dans cet ordre :
1. Lisibilité ATS — le CV est-il en texte pur sans colonnes, tableaux, images ?
2. Mots-clés secteur — les mots-clés du secteur et du poste sont-ils présents ?
3. Pertinence du poste — le profil correspond-il à au moins 70% des exigences ?
4. Impact chiffré — y a-t-il des résultats mesurables (effectifs, taux, chiffres) ?
5. Parcours chronologique — les expériences sont-elles en ordre inverse avec dates complètes ?
6. Structure du CV — titres standards, longueur 1-2 pages, nom de fichier propre ?
7. Coordonnées — email professionnel, téléphone, ville présents ?
8. Profil professionnel — y a-t-il un résumé en début de CV ?
9. Compétences techniques — les outils et compétences spécifiques sont-ils listés ?
10. Orthographe — absence de fautes détectées ?

VERDICT — CRUCIAL : les 3 lignes doivent être ULTRA-SPÉCIFIQUES au CV analysé, jamais génériques.
Chaque ligne doit citer des éléments concrets du CV (nom de poste, compétence, entreprise, chiffre).
PHRASES INTERDITES (ne jamais utiliser) : "Profil cohérent", "Bonne expérience", "CV bien structuré", "Manque de résultats chiffrés", "Profil intéressant", "Bon potentiel", "Expérience significative", "CV à améliorer", "Profil solide"
OBLIGATOIRE : citer des faits PRÉCIS et UNIQUES au CV. Exemples :
- ✅ "4 ans comme professeur au Lycée Jean Favard avec responsabilité de classe principale — un parcours solide pour un poste en enseignement professionnel"
- ⚠️ "Email @laposte.net pénalisant en Suisse et aucun chiffre d'impact : ajoutez votre taux de réussite aux examens (ex: 92% sur 3 ans)"
- 💡 "Pour ce poste d'enseignant en Suisse, remplacez 'lycée professionnel' par 'école professionnelle' et ajoutez vos connaissances du système vaudois (DGEP, CFC)"

Format : 3 lignes séparées par \\n, commençant par ✅, ⚠️ et 💡.

JSON À RETOURNER :
{"score":0,"scoreDetails":{"format":0,"keywords":0,"experience":0,"readability":0},"verdict":"✅ Fait précis du CV\\n⚠️ Problème concret avec solution\\n💡 Conseil spécifique au poste et pays","checklist":[{"label":"","status":"ok","detail":"","correction":"","impact":""}],"keywordsFound":[],"keywordsMissing":[],"keywordsSuggested":[],"suggestions":[{"title":"","text":"","priority":"high","impact":"+X pts"}]}`;

  const text = await callAnthropic(prompt, 2500, 0.3);
  const cleaned = text.replace(/```(?:json)?\s*/g, "").replace(/```\s*/g, "").trim();
  return JSON.parse(cleaned);
};

export const rewriteCV = async (
  cvText: string,
  job: string,
  region: string,
  missingKeywords: string[]
): Promise<string> => {
  const country = region === "CH" ? "Suisse romande" : "France";

  const prompt = `Tu es un expert en rédaction de CV pour le marché ${country}. Réécris ce CV pour le poste de ${job} en intégrant ces mots-clés manquants : ${missingKeywords.join(", ")}.

Règles absolues :
- Structure ATS : une colonne, pas de tableau, texte pur
- Ordre chronologique inverse obligatoire
- N'ajoute PAS de chiffres à chaque ligne — cela paraît artificiel et inventé. Garde UNIQUEMENT les 3 à 4 chiffres les plus impactants et crédibles qui existent déjà dans le CV original. Priorité : taux de réussite, nombre d'élèves/clients encadrés, années d'expérience. N'invente JAMAIS de statistiques. Si un chiffre n'est pas dans le CV original, ne l'ajoute pas.
${region === "CH" ? "- Si pays = Suisse : utiliser école professionnelle, maître d'enseignement, secondaire II, DGEP, CFC\n- Si email non professionnel détecté : ajouter une note [Recommandation : remplacer par une adresse Gmail prénom.nom]" : ""}
- Profil professionnel en début de CV : 3-4 lignes percutantes qui répondent directement à l'offre
- Verbes d'action au début de chaque puce : conçu, développé, formé, géré, optimisé, coordonné

IMPORTANT : Structure le CV avec des sections clairement séparées :
- Commence par le NOM COMPLET en majuscules sur la première ligne
- Puis les coordonnées (email, téléphone, ville)
- Puis "PROFIL PROFESSIONNEL" avec 3-4 lignes
- Puis "EXPÉRIENCE PROFESSIONNELLE" avec chaque poste formaté : Titre | Entreprise | Dates, puis puces avec •
- Puis "FORMATION"
- Puis "COMPÉTENCES"
- Puis "LANGUES" si pertinent

Retourne UNIQUEMENT le CV réécrit en texte structuré, prêt à être mis en forme.

CV: ${cvText.substring(0, 2000)}`;

  return callAnthropic(prompt, 2500, 0.3);
};

export const rewriteSelection = async (
  selection: string,
  job: string,
  keywords: string[]
): Promise<string> => {
  const prompt = `Réécris ce passage pour le poste ${job}. Intègre si possible : ${keywords.join(", ")}. Retourne UNIQUEMENT le texte réécrit. Texte: ${selection}`;
  return callAnthropic(prompt, 800, 0.3);
};

export const generateCoverLetter = async (
  cvText: string,
  job: string,
  region: string,
  offerDetails?: string
): Promise<string> => {
  const country = region === "CH" ? "Suisse romande" : "France";

  const prompt = `Tu es un expert en recrutement ${country}. Rédige une lettre de motivation professionnelle pour le poste de ${job}.

Règles :
${region === "CH" ? `- Ne jamais écrire "j'ai décidé de m'installer en Suisse" — trop hésitant. Écrire plutôt "Installé en Suisse depuis [date], je souhaite contribuer au système éducatif vaudois"
- Mentionner la connaissance ou la volonté d'apprendre le système éducatif local (DGEP, secondaire II, formation duale)` : ""}
- 3 paragraphes maximum : accroche forte / expérience et valeur ajoutée / motivation spécifique à l'établissement
- Personnalisée selon l'offre fournie, pas générique
- Ton professionnel mais humain
- Jamais de formule creuse comme "je suis une personne motivée et dynamique"

IMPORTANT — STRUCTURE OBLIGATOIRE de la lettre :
- Ligne 1 : [NOM COMPLET EN MAJUSCULES]
- Ligne 2 : [Adresse ou Ville]
- Ligne 3 : [Téléphone]
- Ligne 4 : [Email]
- Ligne 5 : (vide)
- Ligne 6 : [Nom de l'entreprise/établissement si connu, sinon "Entreprise"]
- Ligne 7 : [Ville, le DATE DU JOUR]
- Ligne 8 : (vide)
- Ligne 9 : Objet : Candidature au poste de ${job}
- Ligne 10 : (vide)
- Ligne 11 : Madame, Monsieur,
- Ligne 12 : (vide)
- Puis les 3 paragraphes séparés par des lignes vides
- Puis ligne vide
- Puis formule de politesse complète
- Puis ligne vide
- Puis [Prénom NOM]

CV : ${cvText.substring(0, 1500)}
Offre : ${offerDetails || "Non précisée"}

Retourne UNIQUEMENT la lettre, prête à envoyer, avec la structure ci-dessus.`;

  return callAnthropic(prompt, 1500, 0.4);
};
