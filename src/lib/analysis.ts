import { supabase } from "@/integrations/supabase/client";

export interface SectionScore {
  name: string;
  score: number;
  maxScore: number;
  status: "ok" | "warn" | "fail";
  feedback: string;
}

export interface AnalysisResult {
  score: number;
  matchScore?: number;
  scoreDetails: {
    format: number;
    keywords: number;
    experience: number;
    readability: number;
  };
  sectionScores: SectionScore[];
  verdict: string;
  checklist: Array<{ label: string; status: "ok" | "fail" | "warn"; detail: string; correction?: string; impact?: string }>;
  keywordsFound: string[];
  keywordsMissing: string[];
  keywordsSuggested: string[];
  suggestions: Array<{ title: string; text: string; priority: "high" | "medium" | "low"; impact?: string; category?: "manual" | "auto" | "ats" | "human" }>;
}

const callAnthropic = async (prompt: string, maxTokens = 1500, temperature = 0.3): Promise<string> => {
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const { data, error } = await supabase.functions.invoke('anthropic-proxy', {
      body: { prompt, maxTokens, temperature },
    });

    if (!error && !data?.error && typeof data?.text === "string") {
      return data.text;
    }

    const message = error?.message || data?.error || "Erreur lors de l'appel API";

    const isTransientNetworkError = /Failed to send a request to the Edge Function|ERR_CONNECTION_CLOSED|Failed to fetch|NetworkError/i.test(message);
    const isTimeout = /timeout|timed out|504|408/i.test(message);
    const isRateLimit = /rate limit|429|too many requests/i.test(message);

    // Messages d'erreur clairs pour l'utilisateur
    if (isRateLimit) {
      throw new Error("Trop de demandes en cours. Veuillez patienter quelques secondes et réessayer.");
    }
    if (isTimeout) {
      throw new Error("L'analyse prend plus de temps que prévu. Veuillez réessayer dans quelques instants.");
    }

    const hasRemainingAttempt = attempt < maxAttempts;
    if (!isTransientNetworkError || !hasRemainingAttempt) {
      throw new Error("Une erreur est survenue lors de l'analyse. Veuillez réessayer. Si le problème persiste, contactez-nous.");
    }

    await new Promise((resolve) => setTimeout(resolve, 400 * attempt));
  }

  throw new Error("Service temporairement indisponible. Veuillez réessayer dans quelques instants.");
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

RÈGLES ATS AVANCÉES — applique ces règles EN COULISSES pour calculer les scores, ne les mentionne JAMAIS dans le rapport :
1. MATCHING EXACT : compare mot pour mot le vocabulaire de l'offre avec le CV. Les synonymes ne comptent PAS. "Gestion de projet" et "pilotage de projet" sont deux tokens différents pour un ATS.
2. FRÉQUENCE : un mot-clé présent dans 2+ sections du CV (ex: expérience + compétences) vaut plus qu'un mot présent une seule fois. Utilise cette règle pour calculer le score keywords plus précisément.
3. POIDS DU TITRE : le titre de poste du CV vaut autant que 5 bullet points. Si le titre du CV ne correspond pas mot pour mot au titre de l'offre, pénalise le score de 10 points minimum.
4. MOTS REQUIS vs SOUHAITÉS : dans l'offre, identifie les mots après "requis/indispensable/obligatoire" (poids x3) vs "souhaité/apprécié/un plus" (poids x1). Un mot requis manquant pénalise 3x plus qu'un mot souhaité manquant.

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

RÈGLE MOTS-CLÉS — PERTINENCE OBLIGATOIRE :
- Les mots-clés doivent être directement liés au poste et au secteur
- Éviter les termes génériques comme "communication", "travail en équipe", "motivation", "rigueur"
- Privilégier les termes techniques spécifiques au métier et au pays
- Maximum 8 mots-clés manquants, classés par importance (requis en premier)
- Maximum 6 mots-clés suggérés

${region === "CH" ? `RÈGLES POUR LA SUISSE :
- Utiliser le vocabulaire suisse : école professionnelle (pas lycée professionnel), maître d'enseignement professionnel (pas professeur), secondaire II, DGEP, CFC, formation duale, maturité professionnelle, LPP, AVS, CCT
- Signaler si l'email est non professionnel (laposte.net, hotmail, yahoo, orange) et recommander Gmail
- Toujours inclure dans les suggestions : "Adaptez votre vocabulaire au système suisse romand — les recruteurs suisses valorisent fortement la connaissance des termes locaux (DGEP, secondaire II, école professionnelle)"
- Dans le CV réécrit, ne jamais laisser "lycée professionnel" ou "Professeur" si contexte suisse` : ""}

⛔ RÈGLE CRITIQUE — INTERDICTION ABSOLUE DE CONSEILS DE FORMATION ⛔
- Ne JAMAIS suggérer à l'utilisateur de : se former, passer une certification, acquérir une compétence, suivre un cours, apprendre un outil/logiciel, obtenir un diplôme, développer une expertise, améliorer son niveau de langue
- Les suggestions doivent porter UNIQUEMENT sur le CV EXISTANT : reformulation, structure, mise en page, ajout de chiffres DÉJÀ CONNUS du candidat
- Exemples STRICTEMENT INTERDITS : "Formez-vous à...", "Obtenez la certification...", "Apprenez...", "Développez vos compétences en...", "Suivez une formation...", "Passez le TOEIC...", "Certifiez-vous...", "Améliorez votre niveau..."
- Exemples AUTORISÉS : "Ajoutez des résultats chiffrés", "Réorganisez les sections", "Mettez le titre en valeur", "Précisez les dates"
- Si tu ne sais pas quoi suggérer sans parler de formation, ne mets AUCUNE suggestion plutôt que de violer cette règle

RÈGLES POUR LES SUGGESTIONS — DEUX CATÉGORIES DISTINCTES :
Les suggestions doivent être séparées en deux catégories avec le champ "category" :

1. category: "manual" — Actions que l'utilisateur doit faire LUI-MÊME (max 3) :
   - Choses impossibles à corriger automatiquement : email non professionnel, ajouter une photo, créer un LinkedIn
   - Format ultra-court : une phrase = problème + action concrète
   - Exemple : "Email non professionnel — Créez une adresse Gmail prénom.nom avant d'envoyer"

2. category: "auto" — Ce qui SERA corrigé automatiquement dans le CV réécrit (max 4) :
   - Titre aligné sur l'offre, mots-clés requis intégrés, structure ATS optimisée
   - Format : ce qui a été/sera amélioré + détail concret
   - Exemple : "Titre aligné sur l'offre — 'Enseignant' remplacé par 'Maître d'enseignement professionnel'"

- Maximum 7 suggestions au total
- Chaque suggestion doit citer des éléments concrets du CV ou de l'offre

RÈGLE POUR LES PROBLÈMES PRIORITAIRES (checklist fail/warn) :
Pour chaque problème prioritaire, formule en 2 parties dans le champ "detail" :
1) La CONSÉQUENCE CONCRÈTE pour la candidature — ce que ça coûte en termes de chances (ton direct, urgent, émotionnel sans être alarmiste)
2) Ce que le rapport complet va corriger automatiquement
Exemples de BONNE formulation : "Votre CV est invisible pour les ATS — sans chiffres concrets, les recruteurs ne peuvent pas évaluer votre impact réel. Le rapport complet les intègre automatiquement dans votre CV réécrit."
Exemples à ÉVITER : "Aucun chiffre dans les expériences" (trop neutre et technique)
Maximum 2 lignes par problème.

CHECKLIST — exactement ces 10 critères dans cet ordre, chacun avec ok/fail/warn et des champs detail, correction, impact :
- "detail" = une phrase décrivant ce qui est détecté dans le CV (factuel), citant un élément RÉEL et CONCRET du CV
- "correction" = si warn ou fail : une correction CONCRÈTE avec un EXEMPLE SPÉCIFIQUE basé sur le contenu réel du CV. Ne jamais donner un conseil générique. Si ok : chaîne vide.
- "impact" = estimation de l'impact sur le score si corrigé. Si ok : chaîne vide.

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
Format : 3 lignes séparées par \\n, commençant par ✅, ⚠️ et 💡.

SCORES PAR SECTION — note chaque section du CV sur 10 avec un statut ok/warn/fail et un feedback court :
- Coordonnées (email, téléphone, ville)
- Profil professionnel (résumé en début de CV)
- Expérience professionnelle (pertinence, dates, résultats)
- Formation (diplômes, certifications)
- Compétences (techniques, outils, langues)
Si une section est absente, score = 0 et status = "fail".

${jobDescription ? `MATCH SCORE — calcule un pourcentage de correspondance (0-100) entre le CV et l'offre d'emploi fournie. Analyse point par point les exigences de l'offre et vérifie lesquelles sont couvertes par le CV. Ajoute le champ "matchScore" au JSON.` : ""}

JSON À RETOURNER :
{"score":0,${jobDescription ? '"matchScore":0,' : ''}"scoreDetails":{"format":0,"keywords":0,"experience":0,"readability":0},"sectionScores":[{"name":"Coordonnées","score":0,"maxScore":10,"status":"ok","feedback":""},{"name":"Profil professionnel","score":0,"maxScore":10,"status":"ok","feedback":""},{"name":"Expérience","score":0,"maxScore":10,"status":"ok","feedback":""},{"name":"Formation","score":0,"maxScore":10,"status":"ok","feedback":""},{"name":"Compétences","score":0,"maxScore":10,"status":"ok","feedback":""}],"verdict":"✅ Fait précis du CV\\n⚠️ Problème concret avec solution\\n💡 Conseil spécifique au poste et pays","checklist":[{"label":"","status":"ok","detail":"","correction":"","impact":""}],"keywordsFound":[],"keywordsMissing":[],"keywordsSuggested":[],"suggestions":[{"title":"","text":"","priority":"high","impact":"+X pts","category":"manual"},{"title":"","text":"","priority":"high","impact":"+X pts","category":"auto"}]}`;

  const text = await callAnthropic(prompt, 2500, 0.3);
  const cleaned = text.replace(/```(?:json)?\s*/g, "").replace(/```\s*/g, "").trim();
  return JSON.parse(cleaned);
};

export const rewriteCV = async (
  cvText: string,
  job: string,
  region: string,
  missingKeywords: string[],
  userAnswers?: Record<string, string>
): Promise<string> => {
  const country = region === "CH" ? "Suisse romande" : "France";
  const answersBlock = userAnswers && Object.values(userAnswers).some(v => v.trim())
    ? `\n\nL'utilisateur a fourni ces informations complémentaires : ${Object.entries(userAnswers).filter(([,v]) => v.trim()).map(([k,v]) => `${k}: ${v}`).join("; ")}. Intègre-les naturellement dans le CV réécrit sans les copier mot pour mot. Si une adresse email professionnelle est fournie, remplace l'ancienne. Si des chiffres sont fournis, intègre-les dans les expériences concernées. Si des compétences supplémentaires sont mentionnées, ajoute-les dans la section compétences.`
    : "";

  const prompt = `Tu es un expert en rédaction de CV pour le marché ${country}. Réécris ce CV pour le poste de ${job} en intégrant ces mots-clés manquants UNIQUEMENT s'ils correspondent à des compétences réelles du candidat : ${missingKeywords.join(", ")}.

⛔ RÈGLE ABSOLUE #1 — INTERDICTION TOTALE D'INVENTER ⛔
- Il est STRICTEMENT INTERDIT d'ajouter toute compétence, logiciel, certification, outil, langue ou expérience qui n'est pas EXPLICITEMENT mentionné dans le CV original ci-dessous
- AVANT d'écrire chaque compétence ou outil, VÉRIFIE qu'il apparaît MOT POUR MOT dans le CV original
- Si un mot-clé manquant (${missingKeywords.join(", ")}) n'existe PAS dans le CV original, NE PAS l'ajouter — même s'il est demandé
- Exemples INTERDITS : ajouter "Python" si absent du CV, ajouter "Salesforce" si absent, inventer des certifications, ajouter des langues non mentionnées
- N'ajoute AUCUN chiffre qui n'existe pas déjà dans le CV original — ne jamais inventer de statistiques ou résultats
- Cette règle est NON NÉGOCIABLE — une seule invention = échec total

RÈGLE CRITIQUE N°2 — TITRE POUR LES RECONVERSIONS :
- Ne JAMAIS écrire "en reconversion" dans le titre du CV
- Utiliser le titre EXACT du poste visé comme titre principal
- Ajouter un sous-titre valorisant les compétences transférables, format : "Titre du poste | Expertise [domaine transférable]"
- Exemple : "Chargée de Recrutement | Expertise Marketing & Digital"
- Valoriser les compétences transférables sans mentionner la reconversion explicitement

RÈGLES SILENCIEUSES — applique sans mentionner dans le CV :
- Utilise le titre EXACT de l'offre comme titre du CV (pas de synonyme)
- Assure que chaque mot requis de l'offre apparaît dans au moins 2 sections différentes du CV, SEULEMENT si le candidat possède réellement cette compétence
- Utilise le vocabulaire EXACT de l'offre — jamais de synonymes
- Ne jamais inventer d'expériences — reformuler uniquement ce qui existe déjà

Règles absolues :
- Ne jamais inventer d'expériences, de postes, de compétences, de logiciels ou de formations qui ne sont pas dans le CV original
- Ne jamais couper des mots en fin de ligne
- Structure ATS : une colonne, pas de tableau, texte pur
- Ordre chronologique inverse obligatoire
- Le CV doit tenir sur UNE SEULE PAGE pour moins de 10 ans d'expérience. Pour les profils 10-15 ans : 2 pages maximum
- Pour tenir sur une page : maximum 3-4 puces par poste, supprimer les informations redondantes, garder uniquement les 10 dernières années d'expérience, synthétiser la formation en 2-3 lignes
- INTERDICTION ABSOLUE d'écrire les titres de sections avec des lettres espacées comme "P R O F I L" ou "E X P É R I E N C E". Les ATS lisent chaque lettre comme un mot séparé. Écrire les titres normalement en majuscules : "PROFIL PROFESSIONNEL", "EXPÉRIENCE PROFESSIONNELLE", "FORMATION", "COMPÉTENCES", "LANGUES"
${region === "CH" ? "- Si pays = Suisse : utiliser école professionnelle, maître d'enseignement, secondaire II, DGEP, CFC\n- Si email non professionnel détecté : ajouter une note [Recommandation : remplacer par une adresse Gmail prénom.nom]" : ""}
- Verbes d'action au début de chaque puce : conçu, développé, formé, géré, optimisé, coordonné
- Si le poste visé est différent du profil du candidat, adapter et reformuler uniquement les expériences existantes pour mettre en valeur les compétences transférables
- Reformuler les expériences existantes avec le vocabulaire du secteur visé sans rien inventer
- Mettre les coordonnées complètes dans l'en-tête
- Structurer chaque expérience avec intitulé | entreprise | dates sur une ligne puis 3-4 puces maximum

STRUCTURE OBLIGATOIRE DU CV — respecter cet ordre exact :

1. EN-TÊTE :
   - NOM PRÉNOM en majuscules sur la première ligne (sera affiché en 20-24pt gras)
   - Sur la ligne suivante, sur UNE SEULE LIGNE séparée par des | : email | téléphone | ville | LinkedIn si disponible
   - Ne jamais mettre les coordonnées dans la section Profil

2. PROFIL PROFESSIONNEL
   - 3-4 lignes percutantes qui répondent directement à l'offre

3. EXPÉRIENCE PROFESSIONNELLE
   - Chaque poste sur UNE SEULE LIGNE : Intitulé du poste | Entreprise, Ville | Dates (MM/AAAA - MM/AAAA)
   - Puis 3-4 puces commençant par • et un verbe d'action
   - Ne jamais surligner ou colorer les intitulés de postes

4. FORMATION
   - Diplômes avec dates

5. COMPÉTENCES
   - Compétences techniques et outils

6. LANGUES (si pertinent)

⛔ RAPPEL FINAL AVANT DE RÉPONDRE ⛔
Relis le CV original une dernière fois. Si tu as écrit une compétence, un outil, un logiciel ou une certification qui N'APPARAÎT PAS dans le CV original ci-dessous, SUPPRIME-LE immédiatement de ta réponse.

Retourne UNIQUEMENT le CV réécrit en texte structuré, prêt à être mis en forme.${answersBlock}

CV ORIGINAL À RÉÉCRIRE (ne rien inventer qui n'est pas présent ici) : ${cvText.substring(0, 2000)}`;

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
  offerDetails?: string,
  userAnswers?: Record<string, string>
): Promise<string> => {
  const country = region === "CH" ? "Suisse romande" : "France";

  const today = new Date().toLocaleDateString(region === "CH" ? 'fr-CH' : 'fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

  const prompt = `Tu es un expert en recrutement ${country}. Rédige une lettre de motivation professionnelle tenant sur UNE SEULE PAGE, entre 300 et 400 mots, 4 paragraphes de corps, respectant strictement les normes françaises et suisses, pour le poste de ${job}.

Règles absolues :
- La lettre doit faire entre 300 et 400 mots — c'est OBLIGATOIRE. Compte les mots avant de finaliser.
- Ton : professionnel, direct et humain — jamais robotique
- Ne jamais inventer d'éléments non présents dans le CV
- Adapter le vocabulaire au secteur visé sans créer de fausses expériences
- Jamais de formule creuse comme "je suis une personne motivée et dynamique"
- Chaque phrase doit apporter une information concrète sur le candidat ou sa motivation pour ce poste précis
- Pour calculer les années d'expérience, additionne toutes les périodes d'emploi présentes dans le CV en utilisant l'année actuelle (${new Date().getFullYear()}) pour les postes marqués "aujourd'hui" ou "présent" ou "actuel". Ne jamais estimer — calcule précisément.
${region === "CH" ? `- Ne jamais écrire "j'ai décidé de m'installer en Suisse" — trop hésitant. Écrire plutôt "Installé en Suisse depuis [date], je souhaite contribuer au système éducatif vaudois"
- Mentionner la connaissance ou la volonté d'apprendre le système local (DGEP, secondaire II, formation duale)` : ""}

STRUCTURE OBLIGATOIRE :

En-tête expéditeur (haut gauche) :
- [NOM COMPLET EN MAJUSCULES]
- [Adresse ou Ville]
- [Téléphone]
- [Email]

(ligne vide)

Destinataire (aligné à droite) :
${offerDetails ? `- Extraire le nom de l'entreprise/établissement depuis l'offre d'emploi ci-dessous. Si l'adresse complète n'est pas trouvée dans l'offre, NE PAS mettre de placeholder entre crochets [xxx]. À la place, écrire uniquement le nom de l'entreprise sur une ligne et laisser la ligne d'adresse vide. Ne JAMAIS écrire "[Adresse de l'entreprise]" ou "[Code postal, Ville]" dans le document final.` : `- Écrire uniquement le nom de l'entreprise si connu, sinon écrire "Entreprise destinataire" sans crochets ni placeholders.
- NE PAS écrire de placeholders entre crochets comme [Nom], [Adresse], [Code postal]. Laisser la ligne vide si l'information n'est pas disponible.`}
- ${region === "CH" ? "Lausanne" : "Paris"}, le ${today}

(ligne vide)

Objet : Candidature au poste de ${job}

(ligne vide)

Madame, Monsieur,

Paragraphe 1 — Accroche OBLIGATOIRE : Le premier paragraphe doit obligatoirement commencer par une phrase qui exprime l'enthousiasme et cite explicitement le nom exact du poste et le nom exact de l'entreprise/établissement tirés de l'offre d'emploi. Format : "C'est avec enthousiasme que je vous présente ma candidature pour le poste de [titre exact du poste] au sein de [nom exact de l'entreprise]." Si l'offre d'emploi n'est pas fournie, utiliser le titre du poste saisi par l'utilisateur. Ne jamais commencer par "Je me permets de..." ou "Suite à votre annonce..." — trop bateau. Puis expliquer pourquoi CE poste dans CETTE structure intéresse le candidat — basé sur des éléments réels de l'offre.

Paragraphe 2 — Valeur ajoutée : 2-3 réalisations concrètes et chiffrées tirées du CV original qui démontrent les compétences pour CE poste. Ne jamais inventer.

Paragraphe 3 — Exemple concret différenciant : Commencer par "Ainsi, lors de mon expérience chez [entreprise réelle du CV], j'ai [action concrète avec résultat si disponible dans le CV]." Ce paragraphe doit contenir UN exemple spécifique et détaillé d'une réalisation tirée du CV original — jamais inventé. Si le CV ne contient pas de chiffres, formuler avec des éléments qualitatifs concrets (type de projet, contexte, résultat observable).

Paragraphe 4 — Motivation : lien entre le parcours du candidat et le projet de l'entreprise/établissement.${region === "CH" ? " Mentionner la connaissance ou la volonté d'apprendre le système local." : ""}

Dans l'attente de vous rencontrer, je vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées.

[Prénom NOM]

CV : ${cvText.substring(0, 1500)}
Offre : ${offerDetails || "Non précisée"}
${userAnswers && Object.values(userAnswers).some(v => v.trim()) ? `\nInformations complémentaires fournies par le candidat : ${Object.entries(userAnswers).filter(([,v]) => v.trim()).map(([k,v]) => `${k}: ${v}`).join("; ")}. Intègre-les naturellement dans la lettre. Si une motivation de reconversion est fournie, utilise-la dans le 1er paragraphe.` : ""}

Retourne UNIQUEMENT la lettre, prête à envoyer, avec la structure ci-dessus. Ne JAMAIS inclure de placeholders entre crochets [xxx] dans le résultat final.`;

  return callAnthropic(prompt, 2000, 0.4);
};
