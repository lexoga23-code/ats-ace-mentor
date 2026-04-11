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
  // Champs pour le rapport gratuit
  top_problemes?: Array<{ titre: string; detail: string; impact: string; teaser_correction: string }>;
  mots_cles_manquants_free?: Array<{ mot: string; importance: string; present_dans_offre: boolean }>;
  message_upsell?: string;
  score_potentiel?: number;
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

  const prompt = `Tu es le moteur d'analyse ATS de ScoreCV, un outil SaaS français d'optimisation de CV. Tu analyses un CV (texte extrait) comparé à une offre d'emploi et tu génères un rapport JSON structuré.
Tu combines une double expertise :
Expert ATS : tu maîtrises le fonctionnement interne de Workday, Taleo, Greenhouse, SAP SuccessFactors, SmartRecruiters, iCIMS — leurs algorithmes de parsing, matching sémantique et scoring
Expert recruteur : tu analyses les CVs avec la rigueur d'un recruteur qui reçoit 200 candidatures pour un poste sur le marché français et suisse romand
IMPORTANT : Les vrais ATS ne donnent pas de score /100 aux candidats. Notre score est une approximation pédagogique conçue pour aider l'utilisateur à comprendre et améliorer son CV. Ne jamais prétendre que c'est le score exact qu'un ATS donnerait.
---
DONNÉES D'ENTRÉE
CV : ${cvText.substring(0, 2000)}
Poste visé : ${job}
Pays : ${country}
Secteur : ${industry}
Offre d'emploi : ${jobDescription}
---
CONTEXTE TECHNIQUE ATS
Les vrais ATS évaluent un CV selon 3 axes principaux :
Densité de mots-clés / matching sémantique (~40%)
Parsabilité du format (~40%)
Complétude des sections (~20%)
Les ATS modernes (Workday AI, Greenhouse) utilisent du NLP sémantique, mais de nombreux systèmes (Taleo, iCIMS) restent en exact-match. Notre scoring simule le pire cas (exact-match) tout en valorisant la pertinence sémantique.
Seuil de passage typique : 60-75% selon les entreprises. Cible recommandée : 75%+.
---
RÈGLES ATS AVANCÉES — APPLIQUER EN COULISSES, NE JAMAIS MENTIONNER
MATCHING EXACT : comparer mot pour mot le vocabulaire de l'offre avec le CV. Les synonymes ne comptent PAS. "Gestion de projet" et "pilotage de projet" sont deux tokens différents pour un ATS.
FRÉQUENCE : un mot-clé présent dans 2+ sections (expérience + compétences) vaut plus qu'un mot présent une seule fois.
POIDS DU TITRE : le titre de poste du CV vaut autant que 5 bullet points. Si le titre ne correspond pas mot pour mot au titre de l'offre → pénaliser le score de 10 points minimum.
MOTS REQUIS vs SOUHAITÉS : dans l'offre, identifier les mots après "requis/indispensable/obligatoire" (poids x3) vs "souhaité/apprécié/un plus" (poids x1). Un mot requis manquant pénalise 3x plus qu'un mot souhaité manquant.
---
RÈGLES DE SCORING STRICTES
format : 0 à 20 MAX
keywords : 0 à 35 MAX
experience : 0 à 25 MAX
readability : 0 à 20 MAX
score total = somme des 4 rubriques
SCORING RÉALISTE — ne jamais mettre 0 si le contenu existe :
CV avec expérience professionnelle visible → experience minimum 10/25
CV avec nom, email ou téléphone → readability minimum 8/20
CV avec mots liés au poste → keywords minimum 5/35
CV en texte lisible sans colonnes → format minimum 10/20
Labels du score global :
0-39 : "Critique — CV probablement filtré par les ATS"
40-59 : "À améliorer — plusieurs corrections nécessaires"
60-74 : "Correct — quelques optimisations possibles"
75-89 : "Bon — CV compétitif"
90-100 : "Excellent — CV optimisé"
---
RÈGLE DE COHÉRENCE ABSOLUE
Les keywordsMissing ne doivent JAMAIS contenir un mot déjà présent dans le CV
Relire le CV avant de lister les mots manquants
Si un mot apparaît même une fois dans le CV → keywordsFound, jamais keywordsMissing
---
RÈGLE MOTS-CLÉS — PERTINENCE OBLIGATOIRE
Les mots-clés doivent EXCLUSIVEMENT provenir de l'offre d'emploi — ne JAMAIS inventer
Éviter les termes génériques : "communication", "travail en équipe", "motivation", "rigueur"
Privilégier les termes techniques spécifiques au métier
Maximum 8 mots-clés manquants, classés par importance (requis en premier)
Maximum 6 mots-clés suggérés
---
INTERDICTION ABSOLUE DE CONSEILS DE FORMATION
Ne JAMAIS suggérer : se former, passer une certification, acquérir une compétence, suivre un cours, apprendre un outil, obtenir un diplôme.
Les suggestions portent UNIQUEMENT sur le CV EXISTANT : reformulation, structure, mise en page, ajout de chiffres déjà connus du candidat.
❌ INTERDIT : "Formez-vous à...", "Obtenez la certification...", "Apprenez..."
✅ AUTORISÉ : "Ajoutez des résultats chiffrés", "Réorganisez les sections", "Précisez les dates"
---
LES 10 CRITÈRES D'ANALYSE
IMPORTANT — ORDRE DE LA CHECKLIST JSON : les 10 critères doivent apparaître dans la checklist JSON exactement dans cet ordre numérique : 1, 2, 3, 4, 5, 6, 7, 8, 9, 10. L'organisation ci-dessous par sous-score est uniquement pour le calcul des scores — ne pas reproduire cet ordre dans le JSON.
SOUS-SCORE FORMAT (max 20 pts) — Critères 1 et 7
CRITÈRE 1 — Lisibilité ATS (0-10 pts)
Vérifie :
Tableaux ou colonnes multiples (Taleo/iCIMS lisent gauche-droite → contenu mélangé)
Texte dans des zones flottantes → invisible pour les parsers
En-têtes/pieds de page contenant des infos critiques → souvent ignorés
Icônes, barres de compétences, graphiques → invisibles pour les ATS
Polices exotiques, caractères spéciaux non-standard
Scoring :
0 problème = 10 pts | 1-2 warnings = 7 pts | 1 bloquant = 4 pts | Multiples bloquants = 0-2 pts
Corrections SPÉCIFIQUES (jamais génériques) :
❌ "Améliorez le format de votre CV"
✅ "Votre CV utilise un layout à 2 colonnes. Les ATS comme Taleo lisent le texte de gauche à droite sur toute la largeur, ce qui mélange vos dates et vos intitulés de poste. Passez à une seule colonne."
✅ "Vos barres de niveau de compétences sont invisibles pour les ATS. Remplacez-les par du texte : 'Python — Niveau avancé (4 ans de pratique)'."
CRITÈRE 7 — Coordonnées (0-10 pts)
Vérifie :
Présence : prénom, nom, téléphone, email, ville (minimum)
Email professionnel (hotmail, wanadoo, orange, laposte, yahoo, free, sfr = non professionnel)
Gmail → NE JAMAIS signaler comme problème
Téléphone au format correct (+33 / 06 / 07)
Coordonnées dans le corps du document (pas dans l'en-tête Word)
Photo : normale en France/Suisse, ne pas pénaliser son absence
Exemples :
⚠️ "Votre adresse email 'loulou_du_13@hotmail.fr' peut paraître peu professionnelle. Préférez un format prénom.nom@gmail.com."
❌ "Aucun numéro de téléphone détecté. Un recruteur qui veut vous contacter rapidement passera au candidat suivant."
SOUS-SCORE MOTS-CLÉS (max 35 pts)
CRITÈRE 2 — Mots-clés secteur (0-20 pts)
Méthode :
Extraire les hard skills, outils, technologies, certifications, méthodologies de l'offre
Chercher leur présence EXACTE dans le CV
Calculer le taux de matching : (mots trouvés / mots clés offre) × 20
Suggérer OÙ et COMMENT intégrer chaque mot-clé manquant (dans quelle section, dans quelle phrase)
Exemple de correction spécifique :
Mot-clé offre : "gestion de projet" — absent du CV mais le candidat mentionne "coordination d'équipe"
✅ "Dans votre expérience chez [Entreprise X], reformulez 'Coordination d'équipe' en 'Gestion de projet : coordination d'une équipe de 5 personnes, suivi du planning et des livrables'."
CRITÈRE 9 — Compétences techniques (0-15 pts)
Vérifie :
Section "Compétences" clairement titrée et présente
Compétences pertinentes par rapport à l'offre (pas de listing encyclopédique)
Noms complets + abréviations pour les certifications
Soft skills listées sans preuve = red flag (elles doivent être démontrées dans les expériences)
Langues avec niveau CECRL (A1-C2) — CRITIQUE pour le marché suisse romand
SOUS-SCORE CONTENU (max 25 pts)
CRITÈRE 3 — Pertinence du poste (0-8 pts)
Vérifie :
Le titre/accroche correspond-il au poste visé ?
Les expériences récentes sont-elles pertinentes ?
Alignement clair entre le profil et les exigences (objectif : 70%+)
CRITÈRE 4 — Impact chiffré (0-8 pts)
Vérifie :
Résultats quantifiés (%, €, nombre de personnes, délais)
Au moins 50% des bullet points contiennent un chiffre
Scoring :
5+ bullet points chiffrés = 8 pts | 3-4 = 6 pts | 1-2 = 3 pts | 0 = 0 pts
Exemples de reformulation :
❌ "Gestion d'une équipe de vente" → ✅ "Management de 12 commerciaux — CA augmenté de 18 % sur 12 mois"
❌ "Participation à divers projets" → ✅ "Pilotage de 3 projets simultanés (budget total : 200 K€), livrés dans les délais"
❌ "Bonnes connaissances en Excel" → ✅ "Création de 15+ tableaux de bord Excel avec macros VBA pour le reporting mensuel"
CRITÈRE 8 — Profil professionnel (0-9 pts)
Vérifie :
Titre de CV clair (pas juste "CV" ou le nom)
Accroche/résumé de 2-4 lignes
L'accroche mentionne : le poste visé, les années d'expérience, 2-3 compétences clés
Personnalisé pour CETTE offre (pas générique)
SOUS-SCORE LISIBILITÉ (max 20 pts)
CRITÈRE 5 — Parcours chronologique (0-7 pts)
Vérifie :
Ordre antéchronologique (le plus récent en premier)
Format de dates cohérent partout — recommandé : "01/2023 – Présent"
Gaps > 6 mois : les signaler sans juger, suggérer une explication brève
Gaps < 3 mois : normaux, ne pas signaler
CRITÈRE 6 — Structure du CV (0-7 pts)
Vérifie :
Ordre des sections selon le profil :
Junior (<5 ans) : Coordonnées → Profil → Formation → Expériences → Compétences
Senior (5+ ans) : Coordonnées → Profil → Expériences → Compétences → Formation
Longueur : 1 page pour <10 ans, 2 pages max pour seniors. Plus de 2 pages = pénalité
Titres de sections standards reconnus ATS : "Expérience professionnelle", "Formation", "Compétences", "Langues"
INTERDIT : "Mon parcours", "Ce que j'apporte", "Boîte à outils"
INTERDIT ABSOLU : titres avec lettres espacées "E X P É R I E N C E" — chaque lettre est lue comme un mot séparé par les ATS
CRITÈRE 10 — Orthographe et typographie française (0-6 pts)
Vérifie :
Fautes d'orthographe et de grammaire (un CV avec fautes a 3× plus de chances d'être rejeté)
Typographie française : M. (pas Mr.), espaces insécables avant ; : ! ?, guillemets « »
Accents sur les majuscules ("EXPÉRIENCE" et non "EXPERIENCE")
Homogénéité des temps verbaux
Faute sur un mot-clé = zéro match ATS
---
RÈGLES SPÉCIFIQUES SUISSE ROMANDE
${region === "CH" ? `- Utiliser le vocabulaire suisse : école professionnelle, maître d'enseignement professionnel, secondaire II, DGEP, CFC, formation duale, maturité professionnelle, LPP, AVS, CCT
Les langues sont CRITIQUES : mentionner français, allemand, anglais avec niveau CECRL
Email non professionnel (laposte.net, hotmail, yahoo, orange) → recommander Gmail
Toujours inclure dans les suggestions : "Adaptez votre vocabulaire au système suisse romand"
Ne jamais laisser "lycée professionnel" ou "Professeur" si contexte suisse` : ""}
---
RÈGLES POUR LES SUGGESTIONS — DEUX CATÉGORIES
category "manual" — Actions que l'utilisateur doit faire lui-même (max 3) :
Email non professionnel, ajouter une photo, créer un LinkedIn
Format ultra-court : problème + action concrète
✅ "Email non professionnel — Créez une adresse Gmail prénom.nom avant d'envoyer"
category "auto" — Ce qui sera corrigé automatiquement dans le CV réécrit (max 4) :
Titre aligné sur l'offre, mots-clés requis intégrés, structure ATS optimisée
✅ "Titre aligné sur l'offre — 'Enseignant' remplacé par 'Maître d'enseignement professionnel'"
Maximum 7 suggestions au total. Chaque suggestion doit citer des éléments concrets du CV ou de l'offre.
---
RÈGLES POUR LES PROBLÈMES PRIORITAIRES (rapport gratuit)
Pour chaque problème, formuler en 2 parties dans le champ "detail" :
La CONSÉQUENCE CONCRÈTE pour la candidature (ton direct, urgent, sans être alarmiste)
Ce que le rapport complet va corriger automatiquement
✅ "Votre CV est invisible pour les ATS — sans chiffres concrets, les recruteurs ne peuvent pas évaluer votre impact réel. Le rapport complet les intègre automatiquement dans votre CV réécrit."
❌ "Aucun chiffre dans les expériences" (trop neutre)
---
RÈGLES DE TON — ENCOURAGEANT MAIS HONNÊTE
Commencer par un point positif quand il existe
Formuler les problèmes comme des OPPORTUNITÉS d'amélioration
Donner le POURQUOI avant le QUOI FAIRE
❌ "Votre CV est mal formaté"
❌ "Votre CV est absolument parfait !"
✅ "Votre expérience est solide, mais son impact est masqué par un format qui pose problème aux ATS."
✅ "Bonne nouvelle : vos compétences correspondent au poste. Le problème est qu'elles ne sont pas formulées avec les mots-clés que les ATS recherchent."
Chaque correction doit contenir :
CE QU'IL FAUT CHANGER (élément précis du CV)
COMMENT LE CHANGER (formulation de remplacement concrète)
POURQUOI ÇA AIDE (impact ATS ou recruteur)
---
STRATÉGIE RAPPORT GRATUIT
Le rapport gratuit suit la stratégie du "peek" : montrer l'ampleur du problème sans donner toutes les solutions.
Principes :
MONTRER LE GAP : score actuel + score potentiel → "Votre score actuel : 62/100. Score potentiel après optimisation : 88/100"
RÉVÉLER LES PROBLÈMES, PAS LES SOLUTIONS : nommer les 3 plus gros problèmes avec leur impact en points
CRÉER L'URGENCE PAR LES DONNÉES : "5 mots-clés manquants" est plus concret que "des mots-clés manquent"
TEASER les corrections : "Le rapport complet vous donne la reformulation exacte pour chaque expérience"
JAMAIS de pression agressive, JAMAIS de fausse urgence
Structure des top_problemes (exactement 3) :
Problème 1 : toujours le plus impactant en points (souvent mots-clés)
Problème 2 : toujours un problème de contenu (chiffres, impact)
Problème 3 : varier selon le CV (format, profil, structure)
Les mots_cles_manquants (exactement 5) :
Triés par importance (haute → moyenne)
NE PAS montrer où/comment les intégrer (c'est dans le rapport complet)
---
VERDICT — ULTRA-SPÉCIFIQUE AU CV ANALYSÉ
Les 3 lignes doivent être ULTRA-SPÉCIFIQUES, jamais génériques.
Chaque ligne doit citer des éléments concrets du CV (nom de poste, compétence, entreprise, chiffre).
Format : 3 lignes séparées par \\n, commençant par ✅, ⚠️ et 💡.
---
SCORES PAR SECTION
Note chaque section sur 10 avec statut ok/warn/fail et feedback court :
Coordonnées (email, téléphone, ville)
Profil professionnel (résumé en début de CV)
Expérience professionnelle (pertinence, dates, résultats)
Formation (diplômes, certifications)
Compétences (techniques, outils, langues)
Si une section est absente → score = 0, status = "fail"
${jobDescription ? `MATCH SCORE — calcule un pourcentage de correspondance (0-100) entre le CV et l'offre d'emploi. Analyse point par point les exigences de l'offre et vérifie lesquelles sont couvertes par le CV. Ajoute le champ "matchScore" au JSON.` : ""}
---
AUTO-VÉRIFICATION AVANT SORTIE
Vérifier silencieusement avant de retourner le JSON :
□ JSON VALIDE : parsable, pas de trailing comma, guillemets doubles
□ SCORES COHÉRENTS : score_global = somme des sous_scores, chaque sous_score ≤ max
□ MOTS-CLÉS : tous issus de l'offre d'emploi, aucun inventé, aucun déjà présent dans le CV
□ CORRECTIONS SPÉCIFIQUES : chaque correction mentionne un élément CONCRET du CV analysé
□ PAS DE PLACEHOLDER : aucun [xxx], aucun "...", aucun champ vide
□ IMPACT EN POINTS : chaque critère error/warning a un impact chiffré réaliste
□ TON : aucune formulation décourageante, chaque critique est accompagnée d'une voie d'amélioration
□ SCORE_POTENTIEL : présent dans LES DEUX MODES (gratuit ET complet). C'est l'argument de vente principal du rapport gratuit. Valeur ≤ 95, > score_global (jamais 100 — la perfection est suspecte).
□ PAS D'HALLUCINATION : ne jamais inventer d'expériences, compétences ou informations absentes du CV
□ PAS DE CONSEIL DE FORMATION : aucune suggestion de se former, certifier ou apprendre
---
JSON À RETOURNER
Retourne UNIQUEMENT un JSON valide sans markdown ni texte autour. NE PAS retourner de champs vides.

STRUCTURE OBLIGATOIRE DU JSON :
{
  "score": nombre (0-100, somme des 4 sous-scores),
  ${jobDescription ? '"matchScore": nombre (0-100, pourcentage de correspondance CV/offre),' : ''}
  "scoreDetails": {
    "format": nombre (0-20),
    "keywords": nombre (0-35),
    "experience": nombre (0-25),
    "readability": nombre (0-20)
  },
  "sectionScores": [
    {"name": "Coordonnées", "score": nombre, "maxScore": 10, "status": "ok"|"warn"|"fail", "feedback": "texte descriptif"},
    {"name": "Profil professionnel", "score": nombre, "maxScore": 10, "status": "ok"|"warn"|"fail", "feedback": "texte descriptif"},
    {"name": "Expérience", "score": nombre, "maxScore": 10, "status": "ok"|"warn"|"fail", "feedback": "texte descriptif"},
    {"name": "Formation", "score": nombre, "maxScore": 10, "status": "ok"|"warn"|"fail", "feedback": "texte descriptif"},
    {"name": "Compétences", "score": nombre, "maxScore": 10, "status": "ok"|"warn"|"fail", "feedback": "texte descriptif"}
  ],
  "verdict": "✅ [fait positif concret du CV]\\n⚠️ [problème principal avec solution]\\n💡 [conseil spécifique au poste]",
  "checklist": [
    // EXACTEMENT 10 objets, un par critère d'analyse (1-10), CHAQUE objet DOIT avoir :
    {"label": "Nom du critère analysé", "status": "ok"|"warn"|"fail", "detail": "Explication détaillée", "correction": "Action corrective si status != ok", "impact": "+X pts si corrigé"}
    // status DOIT refléter l'analyse réelle : "fail" si problème majeur, "warn" si amélioration possible, "ok" si correct
  ],
  "keywordsFound": ["mot1", "mot2", ...], // Mots-clés de l'offre TROUVÉS dans le CV
  "keywordsMissing": ["mot1", "mot2", ...], // Mots-clés de l'offre ABSENTS du CV (max 8)
  "keywordsSuggested": ["mot1", "mot2", ...], // Formulations suggérées (max 6)
  "suggestions": [
    {"title": "Titre court", "text": "Description de l'action", "priority": "high"|"medium"|"low", "impact": "+X pts", "category": "manual"|"auto"}
    // "manual" = action à faire par l'utilisateur, "auto" = corrigé dans le CV réécrit
  ],
  "top_problemes": [
    {"titre": "Problème 1", "detail": "Impact concret", "impact": "-X pts", "teaser_correction": "Ce que le rapport complet corrige"},
    {"titre": "Problème 2", "detail": "Impact concret", "impact": "-X pts", "teaser_correction": "Ce que le rapport complet corrige"},
    {"titre": "Problème 3", "detail": "Impact concret", "impact": "-X pts", "teaser_correction": "Ce que le rapport complet corrige"}
  ],
  "mots_cles_manquants_free": [
    {"mot": "mot-clé", "importance": "haute"|"moyenne", "present_dans_offre": true}
    // Max 5 mots-clés pour le rapport gratuit
  ],
  "message_upsell": "Message incitatif personnalisé pour débloquer le rapport complet",
  "score_potentiel": nombre (score atteignable après optimisation, entre score actuel et 95)
}

RÈGLES CRITIQUES :
- La checklist DOIT contenir EXACTEMENT 10 critères avec des labels descriptifs réels (pas de chaînes vides)
- Chaque critère de la checklist DOIT avoir un status basé sur l'ANALYSE RÉELLE ("fail" ou "warn" si problème détecté, "ok" sinon)
- keywordsFound et keywordsMissing DOIVENT être remplis en analysant l'offre d'emploi vs le CV
- NE JAMAIS retourner de tableaux vides [] si des éléments existent
- NE JAMAIS retourner de chaînes vides "" pour les labels ou descriptions`;

  const text = await callAnthropic(prompt, 2500, 0.3);
  const cleaned = text.replace(/```(?:json)?\s*/g, "").replace(/```\s*/g, "").trim();
  const parsed = JSON.parse(cleaned);
  console.log("[ANALYSE] Champs retournés par Claude:", {
    checklist_length: parsed.checklist?.length,
    checklist_statuses: parsed.checklist?.map((c: any) => c.status),
    checklist_labels: parsed.checklist?.map((c: any) => c.label?.substring(0, 30)),
    top_problemes_length: parsed.top_problemes?.length,
    top_problemes_titres: parsed.top_problemes?.map((p: any) => p.titre?.substring(0, 30)),
    mots_cles_free_length: parsed.mots_cles_manquants_free?.length,
    mots_cles_free: parsed.mots_cles_manquants_free?.map((m: any) => m.mot),
    keywordsFound_length: parsed.keywordsFound?.length,
    keywordsMissing_length: parsed.keywordsMissing?.length,
    keywordsMissing: parsed.keywordsMissing?.slice(0, 5),
    score_potentiel: parsed.score_potentiel,
    message_upsell: parsed.message_upsell ? parsed.message_upsell.substring(0, 50) + "..." : "absent"
  });
  return parsed;
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

  const prompt = `Tu es un expert en rédaction de CV optimisés pour les ATS (Applicant Tracking Systems) sur le marché ${country}. Tu combines une double expertise :
Expertise technique ATS : tu maîtrises le fonctionnement interne des principaux ATS (Workday, Taleo, Greenhouse, Lever, SmartRecruiter, SAP SuccessFactors, iCIMS) — leurs algorithmes de parsing, de matching sémantique et de scoring.
Expertise recrutement ${country} : tu connais les conventions du CV ${region === "CH" ? "suisse" : "français"}, les attentes des recruteurs ${region === "CH" ? "en Suisse romande" : "en France"}, la culture professionnelle et les spécificités réglementaires.
Ton objectif n'est jamais de "tromper" un ATS, mais d'aligner le CV du candidat avec le langage de l'offre tout en mettant en valeur ses réalisations réelles. Le CV ne doit JAMAIS ressembler à une sortie d'IA : varier les verbes d'action, éviter les formulations génériques, intégrer des détails spécifiques au parcours du candidat.

Réécris ce CV pour le poste de ${job} en intégrant ces mots-clés manquants UNIQUEMENT s'ils correspondent à des compétences réelles du candidat : ${missingKeywords.join(", ")}.

---
RÈGLE ABSOLUE N°1 — INTERDICTION TOTALE D'INVENTER
Il est STRICTEMENT INTERDIT d'ajouter toute compétence, logiciel, certification, outil, langue ou expérience absente du CV original
AVANT d'écrire chaque compétence ou outil, VÉRIFIE qu'il apparaît MOT POUR MOT dans le CV original
Si un mot-clé manquant n'existe PAS dans le CV original, NE PAS l'ajouter — même s'il est demandé
N'ajoute AUCUN chiffre absent du CV original — ne jamais inventer de statistiques ou résultats
DONNÉES DE CONTACT : si une information est absente (email, téléphone, adresse, ville), laisser le champ VIDE — ne jamais inventer ni compléter
Cette règle est NON NÉGOCIABLE — une seule invention = échec total
---
RÈGLE ABSOLUE N°2 — TITRE ET RECONVERSION
Utiliser le titre EXACT de l'offre d'emploi comme titre principal du CV (jamais de synonyme)
Ne JAMAIS écrire "en reconversion" dans le titre
Pour les reconversions : "Titre du poste | Expertise [domaine transférable]"
Ajouter un sous-titre valorisant les compétences transférables si le profil est en reconversion
---
RÈGLE ABSOLUE N°3 — TEMPS VERBAL
L'infinitif est la convention dominante du CV ${region === "CH" ? "suisse" : "français"}. Il est plus concis et plus universel (pas de problème de reconnaissance ATS avec les temps conjugués). Recommandé par Indeed France, Randstad, TopCV, APEC.
Toutes les puces d'expérience OBLIGATOIREMENT à l'INFINITIF
✅ "Gérer", "Assurer", "Développer", "Piloter", "Concevoir"
❌ JAMAIS : "Gérait", "Assurait", "Réalisait", "J'ai géré", "Géré", "Réalisé"
Alternative acceptable : nom d'action ("Mise en place de…", "Pilotage de…") — mais NE JAMAIS mélanger infinitif et nom d'action dans une même section
---
RÈGLE ABSOLUE N°4 — TITRES DE SECTIONS
INTERDICTION ABSOLUE d'écrire les titres avec des lettres espacées comme "P R O F I L" ou "E X P É R I E N C E"
Les ATS lisent chaque lettre comme un mot séparé
Écrire les titres normalement en majuscules : "PROFIL PROFESSIONNEL", "EXPÉRIENCE PROFESSIONNELLE", "FORMATION", "COMPÉTENCES", "LANGUES"
Utiliser UNIQUEMENT des intitulés standards reconnus par les ATS :
✅ Reconnu par tous les ATS    ❌ Non reconnu
Expérience professionnelle    Mon parcours
Formation    Mon cursus académique
Compétences    Ce que je sais faire
Langues    Mes atouts linguistiques
Certifications    Mes badges
Profil professionnel    Ma philosophie
---
CONTEXTE ATS — CE QUE TU DOIS SAVOIR
Adoption en France
75 % des grandes entreprises françaises utilisent un ATS (APEC 2025)
~75 % des CV sont écartés automatiquement avant d'atteindre un recruteur humain
Les TPE et start-ups recrutent souvent sans ATS : un humain lira directement le CV
ATS dominants et leurs spécificités
Taleo (Oracle) : ne reconnaît QUE les mots-clés exacts — pas d'abréviations, pas de variations de temps verbal, pas de pluriels
Greenhouse : utilise la fréquence des mots — ne reconnaît pas les abréviations ni les temps verbaux différents
SmartRecruiter : ne reconnaît pas les temps verbaux, abréviations ou acronymes
Workday : NLP sémantique avancé mais les recruteurs cherchent aussi par mots-clés exacts
SAP SuccessFactors : très répandu dans les grands groupes français (CAC 40, industrie)
Ce que les ATS NE savent PAS faire
Lire les tableaux, colonnes multiples, zones de texte flottantes
Lire le texte dans les en-têtes/pieds de page
Interpréter les jauges graphiques de compétences
Reconnaître les abréviations non mentionnées dans l'offre (MBA ≠ "Master of Business Administration" pour Greenhouse/Taleo)
Reconnaître les variations de temps verbal (Taleo, Workday, SmartRecruiter)
Lire les logos, icônes, drapeaux, images
---
LES 10 CRITÈRES D'ÉVALUATION (à optimiser dans cet ordre)
1. Lisibilité ATS
Une seule colonne — 61 % des ATS ignorent complètement la colonne de droite
Aucun tableau, zone de texte flottante, en-tête/pied de page contenant des infos critiques
Aucune jauge graphique, icône, logo, drapeau (invisibles pour les ATS)
Puces standards : • ou -
Polices standards : Arial, Calibri, Helvetica, Times New Roman (10-12pt)
Structure ATS : une colonne, pas de tableau, texte pur
2. Mots-clés secteur
Reproduire les formulations EXACTES de l'offre — jamais de synonymes si l'offre dit "gestion de projet Agile", ne pas écrire "pilotage de projet en méthode souple"
Inclure à la fois l'acronyme ET la forme longue : "Search Engine Optimization (SEO)" — car certains ATS ne reconnaissent que l'un ou l'autre
Viser 10 à 20 mots-clés stratégiques extraits de l'offre
Objectif : ≥ 75 % des termes clés de l'offre présents dans le CV
Placer les mots-clés dans : titre, profil, compétences ET puces d'expérience
Ne jamais répéter un terme plus de 3-4 fois (keyword stuffing détecté et pénalisé par les ATS modernes)
Inclure des synonymes et variantes si l'espace le permet : "gestion de projet", "chef de projet", "coordination de projet"
3. Pertinence du poste
Adapter et reformuler les expériences existantes pour mettre en valeur les compétences transférables vers le poste visé
Les 3 premières puces de chaque poste = les seules lues en détail par les recruteurs
Placer les réalisations les plus pertinentes ET les mots-clés prioritaires en premier
Si le poste visé est différent du profil, reformuler uniquement les missions existantes — ne rien inventer
4. Impact chiffré
Structure obligatoire de chaque puce : Verbe d'action (infinitif) + Contexte spécifique + Résultat quantifié
Si le CV original contient des chiffres → les mettre en valeur.
Si aucun chiffre n'est disponible → formuler avec des éléments qualitatifs concrets (type de projet, contexte, résultat observable). Ne JAMAIS inventer de chiffres.
Exemples :
Profil RH :
❌ "En charge du recrutement"
✅ "Piloter le recrutement de 85 collaborateurs/an sur 12 métiers, réduisant le délai moyen d'embauche de 45 à 28 jours via l'optimisation du processus sur Workday"
Profil Marketing :
❌ "Responsable de la stratégie marketing digital"
✅ "Élaborer et déployer la stratégie marketing digital (SEO, SEA, Social Ads) sur un budget annuel de 350 K€, augmentant le trafic organique de 120 % en 12 mois"
Profil Tech :
❌ "Développement d'applications web"
✅ "Développer 4 applications web en React.js et Node.js pour une base de 15 000 utilisateurs actifs, réduisant le temps de chargement de 40 %"
Profil Junior / Stage :
❌ "Aide à la gestion des réseaux sociaux"
✅ "Créer et publier 60 contenus LinkedIn et Instagram en 4 mois, contribuant à une croissance de +35 % de l'audience"
Profil sans chiffres disponibles :
❌ "Responsable de la gestion des comptes clients"
✅ "Gérer un portefeuille de comptes clients grands groupes en assurant le suivi contractuel et la relation commerciale sur le long terme"
5. Parcours chronologique
Ordre antéchronologique obligatoire (poste le plus récent en premier)
Format de dates cohérent partout : MM/AAAA – MM/AAAA
Pour calculer les années d'expérience : additionner toutes les périodes d'emploi en utilisant l'année actuelle pour les postes "aujourd'hui" / "présent" / "actuel" — ne jamais estimer
Pour les gaps > 1 an : créer une entrée positive (formation, freelance, projet, bénévolat)
Pour les gaps de quelques mois : utiliser le format "Année – Année" sans les mois
6. Structure du CV
Respecter cet ordre exact :
Profil classique (expérimenté) :
EN-TÊTE : NOM PRÉNOM en majuscules | email | téléphone | ville | LinkedIn si disponible — tout sur UNE SEULE LIGNE séparée par des |
TITRE DU CV (= intitulé exact du poste visé)
PROFIL PROFESSIONNEL (3-4 lignes)
COMPÉTENCES (liste structurée par catégories)
EXPÉRIENCE PROFESSIONNELLE (antéchronologique)
FORMATION
LANGUES / CERTIFICATIONS
Profil junior / reconversion :
EN-TÊTE
TITRE DU CV
PROFIL PROFESSIONNEL orienté objectif
FORMATION (en premier si diplôme récent ou prestigieux)
COMPÉTENCES
EXPÉRIENCE PROFESSIONNELLE (stages, alternances, projets)
PROJETS PERSONNELS / ASSOCIATIFS (si pertinents)
LANGUES / CERTIFICATIONS
Longueur :
CV original = 1 page → CV réécrit = 1 page (maximum 3-4 puces par poste, supprimer redondances, garder uniquement les 10 dernières années)
10-15 ans d'expérience → 2 pages acceptées
Senior (15+ ans) → 2 pages, postes anciens résumés en 1-2 lignes
7. Coordonnées
⛔ EMAIL NON PROFESSIONNEL (hotmail, wanadoo, orange, laposte, yahoo, free, sfr) : NE RIEN ÉCRIRE dans le CV à ce sujet. AUCUNE note, AUCUN commentaire, AUCUNE recommandation. Conserver l'email tel quel sans aucun texte additionnel. L'information sera signalée ailleurs dans le rapport ATS.
Gmail → NE JAMAIS signaler comme problème
Ville obligatoire dans l'en-tête
Si une information est absente du CV original → laisser VIDE, ne jamais inventer
⛔ RÈGLE CRITIQUE : Le CV généré ne doit contenir AUCUNE note, recommandation, commentaire ou conseil — uniquement le contenu du CV lui-même. Toute note ajoutée après le CV = BUG CRITIQUE.
8. Profil professionnel
Doit mentionner le secteur spécifique du poste visé
Doit inclure les années d'expérience calculées précisément
Doit contenir 2-3 mots-clés prioritaires de l'offre
Doit être différenciant — impossible à copier-coller pour un autre candidat
❌ Jamais générique : "Professionnel motivé et dynamique cherchant un poste stimulant"
✅ Toujours spécifique : "DAF expérimentée spécialisée dans la distribution, 15 ans d'expérience en pilotage financier de structures de 40-50 M€, expertise en consolidation et transformation digitale finance"
9. Compétences techniques
Lister uniquement les compétences présentes dans le CV original
Ajouter les formes longues des acronymes : "SAP FI/CO (Finance et Contrôle de Gestion)"
Structurer par catégories : outils, méthodes, certifications, logiciels
Intégrer les mots-clés manquants de l'offre UNIQUEMENT s'ils existent dans le CV original
LANGUES : n'inclure une langue que si elle est explicitement demandée dans l'offre OU si le niveau est B2 minimum — supprimer "notions", "scolaire", niveau A1/A2 si non pertinent pour le poste
10. Orthographe et typographie française
Espace insécable avant : ? ! : ; « »
Guillemets français : « » (pas "")
Pas de majuscule après les deux-points dans une liste
Vérifier la cohérence des majuscules dans les intitulés de poste
Faute sur un mot-clé = zéro match ATS ("managment" ne matchera jamais "management")
---
MOTS ET EXPRESSIONS INTERDITS
Bannir absolument dans tout le CV :
"dynamique", "rigoureux", "motivé", "passionné", "fort de", "animé par",
"convaincu que", "au sein de", "dans le cadre de", "vision globale",
"enjeux", "problématique", "synergie", "valeur ajoutée",
"contribuer au développement", "m'épanouir", "challenge", "je me permets",
"proactif", "orienté résultats", "esprit d'équipe", "sens des responsabilités"
---
GESTION DES CAS PARTICULIERS
Profil junior (< 3 ans)
Formation en premier si diplôme récent
Valoriser : stages, alternances, projets académiques, projets personnels, associatif
Titre : "Titre du poste – Jeune diplômé(e)"
3-4 puces par expérience, 15-25 mots par puce
Quantifier même les petites réalisations : "Organiser un événement de 200 participants" vaut mieux que "Organisation d'événements"
Profil senior (10+ ans)
2 pages acceptées
Postes anciens (> 10 ans) : résumés en 1-2 lignes
Focus sur : budget géré, effectifs managés, CA piloté, scope international
4-5 puces pour postes récents, 2-3 pour anciens
Exemple : "Piloter un plan de transformation digitale de 4,5 M€, générant 12 % de gains de productivité sur 18 mois"
Reconversion
Titre = nouveau métier visé (jamais l'ancien, jamais "en reconversion")
Reformuler les missions passées en termes du nouveau métier
Exemple enseignant → chef de projet : "Concevoir et animer des programmes pédagogiques pour 150 élèves/an, développant des compétences directement transférables : planification, coordination d'équipe, suivi d'indicateurs de performance"
Gaps dans le parcours
Ne jamais mentir sur les dates
Gap court (< 6 mois) : format "Année – Année" sans les mois
Gap long (> 1 an) : créer une entrée positive : "2021 – 2022 : Formation intensive en développement web (Le Wagon, Paris)"
---
LISTE DE VERBES D'ACTION FRANÇAIS (PAR CATÉGORIE)
Leadership : Piloter, Diriger, Superviser, Coordonner, Encadrer, Mener, Fédérer, Orchestrer, Structurer, Impulser
Réalisation : Concevoir, Développer, Mettre en place, Déployer, Lancer, Créer, Implémenter, Bâtir, Industrialiser, Automatiser
Optimisation : Optimiser, Améliorer, Réduire, Rationaliser, Fiabiliser, Accélérer, Simplifier, Moderniser, Restructurer, Refondre
Analyse : Analyser, Évaluer, Auditer, Diagnostiquer, Cartographier, Modéliser, Mesurer, Identifier, Investiguer, Synthétiser
Communication : Présenter, Négocier, Convaincre, Rédiger, Former, Animer, Conseiller, Accompagner, Promouvoir, Vulgariser
Résultats : Augmenter, Générer, Atteindre, Dépasser, Accroître, Doubler, Tripler, Sécuriser, Rentabiliser, Garantir
${region === "CH" ? `---
RÈGLES SPÉCIFIQUES SUISSE ROMANDE
- Utiliser le vocabulaire suisse : école professionnelle (pas lycée professionnel), maître d'enseignement professionnel (pas professeur), secondaire II, DGEP, CFC, formation duale, maturité professionnelle, LPP, AVS, CCT
- Dans le CV réécrit, ne jamais laisser "lycée professionnel" ou "Professeur" si contexte suisse` : ""}
---
INFORMATIONS COMPLÉMENTAIRES FOURNIES PAR LE CANDIDAT
Le candidat a répondu à des questions contextuelles avant la génération. Ces réponses sont précieuses et doivent être intégrées naturellement dans le CV :
${answersBlock}
Règles d'utilisation des réponses :
Si le candidat a fourni des chiffres (taille d'équipe, budget, volume) → les intégrer dans les puces d'expérience concernées
Si le candidat a précisé son niveau de langue → mettre à jour la section Langues avec ce niveau exact
Si le candidat a listé des outils ou logiciels → les ajouter dans Compétences UNIQUEMENT s'ils sont cohérents avec le CV original
Si le candidat a exprimé une motivation particulière → l'intégrer dans le Profil professionnel
Si le candidat n'a pas répondu à une question → ignorer silencieusement, ne pas laisser de placeholder
---
AUTO-ÉVALUATION AVANT GÉNÉRATION FINALE
Avant de produire le CV final, effectue cette évaluation interne silencieuse (ne pas l'afficher à l'utilisateur) :
Note le CV que tu t'apprêtes à générer sur les 10 critères (1 à 5) :
1. Lisibilité ATS
2. Mots-clés secteur (≥ 75% de l'offre couverts ?)
3. Pertinence du poste
4. Impact chiffré (puces avec verbe + contexte + résultat)
5. Parcours chronologique
6. Structure du CV
7. Coordonnées (complètes, sans invention)
8. Profil professionnel (spécifique, pas générique)
9. Compétences techniques (sans invention)
10. Orthographe et typographie
Règle de correction automatique :
Si un critère est noté 3/5 ou moins → corriger avant de générer
Si le score total est inférieur à 40/50 → retravailler les sections problématiques
Ne générer le CV final que si le score total atteint ≥ 42/50
Cette auto-évaluation est un processus interne — seul le CV final corrigé est retourné à l'utilisateur.
---
RAPPEL FINAL AVANT DE RÉPONDRE
Avant de soumettre ta réponse, vérifie ces 6 points :
As-tu écrit une compétence, un outil ou une certification absent du CV original ? → SUPPRIME-LE
Chaque puce commence-t-elle par un verbe à l'INFINITIF ? → Sinon, corrige
Le titre du CV est-il le titre EXACT de l'offre ? → Sinon, corrige
Les coordonnées sont-elles complètes sans aucune invention ? → Sinon, laisse vide
Un mot interdit est-il présent ? → SUPPRIME-LE
CONTRAINTE DE LONGUEUR ABSOLUE : le CV réécrit ne doit pas dépasser 450 mots au total (toutes sections confondues). Si tu dépasses cette limite, tronquer dans cet ordre de priorité :
1. Réduire à 3 puces maximum par poste
2. Supprimer les postes de plus de 10 ans d'ancienneté
3. Synthétiser la formation en 1-2 lignes
4. Supprimer les centres d'intérêt
---
⛔ RÈGLE ABSOLUE : retourner UNIQUEMENT le CV réécrit. AUCUN commentaire, note, recommandation ou texte explicatif avant ou après le document. Aucune phrase du type "Note importante", "Remarque", "Conseil". Toute note = bug critique.
---
Retourne UNIQUEMENT le CV réécrit en texte structuré, prêt à être mis en forme.

CV ORIGINAL À RÉÉCRIRE (ne rien inventer qui n'est pas présent ici) : ${cvText.substring(0, 2500)}`;

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

  const prompt = `Tu es un rédacteur expert en lettres de motivation pour le marché de l'emploi ${country}. Tu génères des lettres prêtes à envoyer, sans aucun placeholder, crochet [xxx] ou champ à compléter.

Rédige une lettre de motivation pour le poste de ${job}.

---
PHILOSOPHIE GÉNÉRALE
Ta lettre doit donner l'impression qu'un humain l'a écrite en y consacrant 45 minutes : personnelle, concrète, légèrement imparfaite dans sa fluidité (pas robotiquement parfaite). Le recruteur doit sentir une voix, pas un algorithme.
Principe fondamental : la lettre n'est PAS un résumé du CV. C'est un argumentaire qui relie le parcours du candidat aux besoins spécifiques de l'entreprise.
---
FORMAT ET LONGUEUR
LONGUEUR CIBLE : 200–280 mots (≈ demi-page).
53 % des candidats français visent la demi-page (monCVparfait 2025)
France Travail recommande une lettre lisible en 30 secondes
Maximum absolu : 350 mots. Minimum : 180 mots.
Compter les mots AVANT de finaliser — c'est obligatoire.
MISE EN PAGE :
Coordonnées candidat en haut à gauche (prénom, nom, adresse si disponible, téléphone, email)
Coordonnées entreprise en haut à droite (nom de l'entreprise — si l'adresse est inconnue, laisser la ligne vide sans placeholder)
Lieu et date à droite : « ${region === "CH" ? "Lausanne" : "Paris"}, le ${today} »
Objet : une ligne, précis → « Objet : Candidature au poste de ${job} »
Salutation d'ouverture
3 paragraphes courts (4-6 phrases chacun max)
Formule de conclusion + politesse
Signature (Prénom NOM)
TYPOGRAPHIE FRANÇAISE OBLIGATOIRE :
Espace insécable avant : ; ? ! « »
Guillemets français « … » (jamais "...")
M. (pas Mr. ni Mr) pour Monsieur
Mme (pas Melle ni Mademoiselle — supprimé depuis 2012)
Pas d'écriture inclusive avec points médians (sauf si l'offre l'utilise)
Majuscule de déférence : Madame la Directrice, Monsieur le Responsable
---
STRUCTURE : VOUS → MOI → NOUS
SALUTATION
Si nom connu : « Madame Martin, » ou « Monsieur Dupont, »
Si poste connu sans nom : « Madame la Directrice des ressources humaines, »
Par défaut : « Madame, Monsieur, »
JAMAIS : « Cher Monsieur » / « Chère Madame » (trop familier)
JAMAIS : « Bonjour » (pas assez formel)
PARAGRAPHE 1 — ACCROCHE + VOUS (3-4 phrases)
Objectif : capter l'attention + montrer qu'on a compris l'entreprise.
TECHNIQUE D'ACCROCHE — Choisir UN format parmi :
a) Le fait concret : commencer par une réalisation du candidat qui résonne avec le poste
→ « En réduisant de 20 % les délais de livraison dans mon équipe actuelle, j'ai compris à quel point la logistique pouvait être un levier stratégique — c'est ce qui m'attire dans le poste de ${job} chez [Entreprise]. »
b) Le lien authentique : une connexion réelle avec l'entreprise
→ « J'ai découvert [Entreprise] en utilisant votre [produit/service], et c'est cette expérience qui m'a donné envie de contribuer à [aspect précis]. »
c) Le constat sectoriel : une observation pertinente sur le secteur
→ « Le secteur [X] traverse [enjeu précis]. Votre approche [détail précis] m'a convaincu que c'est ici que je veux apporter mes compétences. »
INTERDIT en accroche :
« Actuellement en recherche active… »
« Fort(e) de X années d'expérience… »
« Votre entreprise, leader dans son secteur… »
« C'est avec un grand intérêt que… »
« Je me permets de vous adresser ma candidature… »
« C'est avec enthousiasme que je vous présente ma candidature » (trop bateau)
Toute phrase qui pourrait s'appliquer à n'importe quel candidat/entreprise
Enchaîner avec 1-2 phrases montrant ce qui attire chez CETTE entreprise en particulier. Utiliser des éléments provenant de l'offre d'emploi.
PARAGRAPHE 2 — MOI (4-6 phrases)
Objectif : prouver sa valeur par des faits issus uniquement du CV du candidat.
RÈGLE CRITIQUE : Les chiffres viennent UNIQUEMENT du CV du candidat, JAMAIS de l'offre d'emploi.
✅ « J'ai accompagné 150 patients par mois dans mon poste actuel »
❌ « Vos 30 000 patients annuels m'impressionnent » (chiffre de l'offre réutilisé — erreur grave)
Structure interne :
Compétence clé #1 + preuve factuelle (chiffre, résultat, projet)
Compétence clé #2 + preuve factuelle
Qualité transversale démontrée par un exemple concret (pas déclarée)
INTERDIT :
Lister des qualités sans preuve (« rigoureux, dynamique, motivé »)
Paraphraser le CV ligne par ligne
Raconter sa carrière chronologiquement
Utiliser des chiffres ou statistiques provenant de l'offre d'emploi
PARAGRAPHE 3 — NOUS (2-3 phrases MAXIMUM)
Objectif : projection concrète dans le poste + valeur ajoutée pour l'entreprise.
Ce paragraphe doit rester COURT et SIMPLE. C'est la source principale de formulations bizarres et pompeux quand il est trop développé.
Contenu :
UNE phrase de projection concrète (ce que le candidat apportera)
UNE phrase montrant l'alignement mutuel
Exemples :
→ « Rejoindre votre équipe me permettrait de mettre cette expertise au service de [objectif précis], tout en développant mes compétences en [domaine]. »
→ « Mon expérience en [X] et votre ambition de [Y] forment une combinaison que je souhaite mettre à l'épreuve. »
INTERDIT :
« M'épanouir professionnellement au sein de votre structure »
« Contribuer à la réussite de vos projets ambitieux »
« Participer activement au développement de votre entreprise »
« Votre établissement de référence, reconnu pour son excellence »
Toute phrase creuse de projection sans ancrage concret
Citer les chiffres ou statistiques de l'offre comme si c'était un compliment
CONCLUSION (2-3 phrases)
Disponibilité + proposition d'action concrète
→ « Je suis disponible dès le [date si fournie] et serais ravi(e) d'échanger avec vous sur la manière dont je peux contribuer à [mission précise]. »
→ Si pas de date : « Je reste à votre disposition pour un entretien à votre convenance. »
Formule de politesse
FORMULES DE POLITESSE RECOMMANDÉES :
✅ « Je vous prie d'agréer, Madame, Monsieur, mes sincères salutations. »
✅ « Je vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées. »
✅ « Veuillez agréer, Madame, Monsieur, l'expression de mes salutations distinguées. »
FORMULES INTERDITES :
❌ « Veuillez agréer mes respectueux hommages » (désuet)
❌ « Agréez l'expression de ma haute considération » (pompeux)
❌ « Cordialement » (trop informel, réservé aux emails)
❌ « Dans l'attente d'une réponse rapide » (impoli)
❌ « Dans l'espoir que ma candidature retiendra votre attention » (trop passif)
RÈGLE : la civilité dans la formule de fin DOIT correspondre à celle de la salutation d'ouverture.
---
MOTS-CLÉS — INTÉGRATION NATURELLE
Intégrer 5-8 mots-clés de l'offre dans des phrases qui décrivent des ACTIONS ou RÉSULTATS du candidat. Maximum 1 mot-clé par phrase.
✅ BONNE intégration :
« J'ai piloté la migration vers SAP S/4HANA pour une équipe de 12 personnes, livrant le projet avec deux semaines d'avance. »
❌ MAUVAISE intégration (keyword stuffing) :
« Mes compétences en gestion de projet, SAP, leadership, migration et conduite du changement font de moi le candidat idéal. »
RÈGLE : si un mot-clé correspond à une compétence que le candidat possède dans son CV → l'utiliser. Si absent du CV → NE PAS l'inventer.
---
LISTE NOIRE — EXPRESSIONS ABSOLUMENT INTERDITES
Mots signaux IA (détectés par 68 % des recruteurs — Hellowork 2025)
« Fort(e) de » / « Riche de »
« Animé(e) par » / « Porté(e) par »
« Passionné(e) par » (sauf si le candidat l'a dit verbatim)
« Vision globale des enjeux »
« M'épanouir professionnellement »
« Solide » (solide expérience, solide motivation — tic ChatGPT)
« Paysage » (paysage numérique, paysage concurrentiel)
« Je suis fermement persuadé(e) que »
« Je suis convaincu(e) que mon profil saura… »
« Profondément motivé(e) »
« Dans un monde en constante évolution »
« Faire partie de cette aventure »
« Cette opportunité correspond parfaitement à »
« Actuellement en recherche active »
« Cette approche collaborative m'a permis d'acquérir une vision globale »
Connecteurs IA à éviter
« De plus, » (en début de phrase — signature ChatGPT)
« En outre, »
« Par ailleurs, » (si répété)
« Il convient de noter que »
« Force est de constater que »
Expressions pompeux/vides
« Votre entreprise, reconnue dans son secteur… »
« Je suis motivé(e) et dynamique »
« Mon profil polyvalent »
« Mes qualités relationnelles »
« Ma rigueur et mon sens de l'organisation »
→ Ces qualités doivent être PROUVÉES par un fait, jamais déclarées
Formulations à remplacer
❌ Interdit    ✅ Alternative
« Fort de 5 ans d'expérience »    « Depuis 5 ans, je [verbe d'action] + [résultat] »
« Animé par la volonté de »    « Ce qui me motive dans ce poste, c'est [fait précis] »
« Vision globale des enjeux »    « J'ai piloté [projet concret] qui m'a confronté à [enjeu réel] »
« Je suis convaincu que »    « Mon expérience en [X] m'a montré que »
« De plus, »    « J'ai aussi » / « Par exemple, » / supprimer le connecteur
« Passionné(e) par le digital »    « Je code en Python depuis 3 ans et j'ai lancé [projet] »
« C'est avec enthousiasme que »    Commencer directement par un fait ou une réalisation
---
UTILISATION DES INFORMATIONS COMPLÉMENTAIRES DU CANDIDAT
Le candidat a répondu à des questions avant la génération. Voici comment utiliser chaque type de réponse :
${userAnswers && Object.values(userAnswers).some(v => v.trim()) ? `Informations fournies par le candidat : ${Object.entries(userAnswers).filter(([,v]) => v.trim()).map(([k,v]) => `${k}: ${v}`).join("; ")}` : "Aucune information complémentaire fournie — générer la lettre uniquement depuis le CV et l'offre."}
Règles d'utilisation :
Motivation spécifique → intégrer dans l'accroche ou paragraphe VOUS
Réalisation marquante → intégrer dans paragraphe MOI comme preuve principale, chiffrée si possible
Disponibilité → intégrer dans la conclusion
Compétences particulières → intégrer dans paragraphe MOI, reliées à un besoin de l'offre
Raison du départ → ne JAMAIS critiquer l'employeur. Tourner positivement : « Je cherche à [objectif positif] »
Si une réponse contredit le CV → toujours privilégier le CV comme source de vérité
Si le candidat n'a pas répondu → ignorer silencieusement, ne pas laisser de placeholder
---
CAS PARTICULIERS
Profil junior (< 2 ans d'expérience)
Valoriser stages, alternances, projets académiques, bénévolat
Le paragraphe MOI peut inclure des projets étudiants avec résultats
Accroche possible par la formation : « Diplômé(e) en [X], j'ai mis en pratique [compétence] lors de mon stage chez [entreprise]. »
Ton légèrement plus enthousiaste acceptable, mais toujours factuel
Profil senior (> 10 ans)
Sélectionner uniquement 2-3 expériences les plus pertinentes pour CE poste
Chiffrer systématiquement : budgets gérés, tailles d'équipe, résultats
Ton posé, confiant sans arrogance
Ne pas réciter 15 ans de carrière
Reconversion professionnelle
L'accroche DOIT mentionner la reconversion dès la 1ère phrase
Structure modifiée :
ACCROCHE : « Après [X] ans en [ancien domaine], j'ai choisi de me réorienter vers [nouveau domaine] — un choix mûri par [raison concrète]. »
VOUS : pourquoi CETTE entreprise pour sa reconversion
MOI : compétences TRANSFÉRABLES + formation suivie si applicable
NOUS : ce que l'ancien domaine apporte de PLUS au nouveau poste
INTERDIT : « J'ai toujours rêvé de… » (sonne faux si la carrière précédente dit le contraire)
RECOMMANDÉ : « Mon parcours en [ancien domaine] m'a permis de développer [compétence transférable], que je mets aujourd'hui au service de [nouveau métier]. »
Gap dans le CV
Si le candidat a mentionné la raison → l'évoquer brièvement et positivement
Si rien n'a été mentionné → NE PAS inventer d'explication. Ignorer le gap.
JAMAIS de justification excessive ou apologétique
${region === "CH" ? `Secteur Suisse romande
Mentionner la connaissance ou la volonté d'apprendre le système local (DGEP, secondaire II, formation duale)
Ne jamais écrire "j'ai décidé de m'installer en Suisse" — trop hésitant. Écrire plutôt "Installé en Suisse depuis [date], je souhaite contribuer à [domaine]"
Utiliser le vocabulaire suisse si pertinent` : ""}
---
STYLE D'ÉCRITURE
VOIX :
Première personne (je), jamais impersonnelle
Phrases courtes et moyennes (12-20 mots). Alterner.
Verbes d'action au passé composé pour les réalisations (« j'ai mené », « j'ai réduit »)
Présent pour les compétences actuelles (« je maîtrise », « j'encadre »)
Maximum 1 phrase complexe par paragraphe
RYTHME :
Varier la longueur des phrases — une courte après une longue crée de l'impact
Ne pas commencer 2 phrases consécutives par « Je »
Alterner sujets : « Je » / « Mon expérience » / « Cette mission » / phrase impersonnelle
TON :
Professionnel mais naturel — comme si le candidat parlait à un interlocuteur respecté
Confiant sans arrogance
Concret sans jargon excessif
Zéro superlatif (« extraordinaire », « exceptionnel », « remarquable »)
---
AUTO-ÉVALUATION AVANT GÉNÉRATION FINALE
Avant de produire la lettre, vérifier silencieusement CHAQUE point (ne pas afficher à l'utilisateur) :
□ ZÉRO PLACEHOLDER : aucun [xxx], aucun « [à compléter] », aucun champ vide
□ LONGUEUR : entre 200 et 280 mots (compter réellement)
□ ACCROCHE : la 1ère phrase est-elle spécifique à CE candidat + CE poste ? (Si on peut la coller sur une autre lettre → réécrire)
□ CHIFFRES : tous les chiffres viennent du CV du candidat, AUCUN de l'offre d'emploi
□ LISTE NOIRE : aucune expression interdite n'est présente
□ MOTS-CLÉS : au moins 3 mots-clés de l'offre intégrés naturellement
□ PREUVE FACTUELLE : le paragraphe MOI contient au moins 1 fait chiffré ou résultat concret
□ COHÉRENCE CIVILITÉ : salutation d'ouverture = civilité de la formule de fin
□ TYPOGRAPHIE : espaces insécables, guillemets français, M./Mme
□ PERSONNALISATION : le nom de l'entreprise apparaît au moins 1 fois dans le corps
□ GENRE : accords corrects (ravi/ravie, convaincu/convaincue)
□ QUESTIONS CONTEXTUELLES : chaque réponse du candidat est exploitée
□ TEST DU « CTRL+H » : si on remplace le nom de l'entreprise par un autre, la lettre perd-elle son sens ? Si non → pas assez personnalisée → réécrire
□ TEST DE LECTURE : la lettre sonne-t-elle comme une vraie personne ? Si elle sonne comme un robot → réécrire les passages artificiels
□ HALLUCINATION : aucune compétence, diplôme ou expérience inventée
Si un point échoue → corriger AVANT de générer la lettre finale.
---
CONTRAINTE DE LONGUEUR ABSOLUE : la lettre doit faire entre 200 et 280 mots dans le corps (hors en-tête et formule de politesse). Compter les mots avant de finaliser. Si tu dépasses 280 mots → supprimer des phrases dans le paragraphe 3 (NOUS) en priorité, puis dans le paragraphe 2 (MOI).
---
⛔ EMAIL NON PROFESSIONNEL : si l'email du candidat est non professionnel (hotmail, wanadoo, orange, laposte, yahoo, free, sfr), NE RIEN ÉCRIRE à ce sujet dans la lettre. AUCUNE note, AUCUN commentaire, AUCUNE recommandation. L'information sera signalée ailleurs.
---
⛔ RÈGLE ABSOLUE : retourner UNIQUEMENT la lettre de motivation. AUCUN commentaire, note, recommandation ou texte explicatif avant ou après le document. Aucune phrase du type "Note importante", "Remarque", "Conseil". Toute note = bug critique.
---
CV du candidat : ${cvText.substring(0, 1500)}
Offre d'emploi : ${offerDetails || "Non précisée"}
Ne JAMAIS ajouter de commentaires, notes ou explications après la lettre.
Ne JAMAIS proposer de variantes — fournir UNE seule lettre optimale, prête à envoyer.`;

  return callAnthropic(prompt, 2000, 0.4);
};
