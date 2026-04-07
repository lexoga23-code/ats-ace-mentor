import { useState, useMemo } from "react";
import { type AnalysisResult } from "@/lib/analysis";

export interface Question {
  id: string;
  label: string;
  placeholder: string;
  type: "input" | "textarea";
  priority: number; // P1=1-3, P2=4-6, P3=7+
  tier: 1 | 2 | 3;
}

interface RewriteQuestionsModalProps {
  analysisResult: AnalysisResult;
  cvText: string;
  jobDescription?: string;
  targetJob?: string;
  region?: string;
  onSubmit: (answers: Record<string, string>) => void;
  onCancel?: () => void;
}

/* ── helpers ─────────────────────────────────────────────── */

/**
 * Détecte le SECTEUR DU POSTE CIBLE (pas du CV) pour adapter les questions
 */
const detectJobSector = (targetJob: string, jobDescription: string): string => {
  const text = (targetJob + " " + jobDescription).toLowerCase();
  if (/santé|médic|infirm|patient|soignant|hôpital|clinique|chu|pharmacie|aide.soignant|as\b|ide\b/i.test(text)) return "sante";
  if (/enseign|éducat|formation|prof|école|élève|pédagog|formateur/i.test(text)) return "enseignement";
  if (/financ|banque|comptab|audit|assurance|fidu|trésor|contrôle.?gestion/i.test(text)) return "finance";
  if (/tech|développ|logiciel|software|devops|cloud|data|ia|machine|ingénieur/i.test(text)) return "tech";
  if (/commerc|vente|retail|distribut|magasin|client|b2b|account|business/i.test(text)) return "commerce";
  if (/ressources.?humaines|rh\b|recrutement|paie|gestionnaire.?rh|chargé.?rh/i.test(text)) return "rh";
  if (/admin|assistant|secrétaire|accueil|réception/i.test(text)) return "admin";
  if (/industrie|usine|production|maintenance|qualité|opérateur/i.test(text)) return "industrie";
  if (/logistique|supply|entrepôt|transport|chauffeur|livreur/i.test(text)) return "logistique";
  return "autre";
};

/**
 * Exemples de chiffres adaptés au SECTEUR DU POSTE
 */
const sectorExamples: Record<string, string> = {
  sante: "nombre de patients par jour, actes réalisés, taux de satisfaction",
  enseignement: "nombre d'élèves, taux de réussite, classes gérées",
  finance: "budget géré (€), dossiers traités, écarts corrigés",
  tech: "utilisateurs, bugs résolus, temps de déploiement",
  commerce: "CA généré, clients gérés, taux de conversion",
  rh: "collaborateurs gérés, recrutements finalisés, formations organisées",
  admin: "dossiers traités par mois, appels gérés, réunions organisées",
  industrie: "pièces produites, taux de qualité, temps de cycle",
  logistique: "commandes traitées, colis expédiés, taux d'erreur",
  autre: "résultats mesurables, objectifs atteints, volume traité",
};

/**
 * Vérifie si une VILLE est explicitement présente dans le CV
 * (évite de redemander une info déjà connue)
 */
const hasCityInCV = (cvText: string): boolean => {
  // Codes postaux français (5 chiffres) ou suisses (4 chiffres) suivis d'un mot
  if (/\b\d{4,5}\s+[A-ZÀ-Ü][a-zà-ü]+/i.test(cvText)) return true;
  // Grandes villes communes
  const cities = /\b(Paris|Lyon|Marseille|Toulouse|Bordeaux|Lille|Nantes|Strasbourg|Nice|Montpellier|Rennes|Grenoble|Rouen|Toulon|Clermont|Angers|Dijon|Le Havre|Reims|Saint-Étienne|Genève|Lausanne|Zürich|Berne|Bâle|Fribourg|Neuchâtel|Sion|Montreux|Vevey|Nyon|Morges)\b/i;
  if (cities.test(cvText)) return true;
  // Adresse complète avec rue/avenue/boulevard
  if (/\b\d+[,\s]+(rue|avenue|boulevard|chemin|allée|place|impasse)\s+[A-Za-zÀ-ü\s-]+/i.test(cvText)) return true;
  return false;
};

/**
 * Vérifie si un EMAIL PROFESSIONNEL est déjà dans le CV
 */
const hasProEmailInCV = (cvText: string): boolean => {
  const text = cvText.toLowerCase();
  // Emails non professionnels à éviter
  const unprofessional = ["hotmail", "wanadoo", "orange", "laposte", "yahoo", "free.fr", "sfr", "msn", "live.fr", "live.com", "aol"];
  // Vérifier s'il y a un email
  const hasEmail = /@[a-z0-9.-]+\.[a-z]{2,}/i.test(text);
  if (!hasEmail) return false; // Pas d'email du tout
  // Vérifier si c'est un email non pro
  return !unprofessional.some(e => text.includes(e));
};

/**
 * Extrait les outils requis par l'offre d'emploi
 */
const extractRequiredTools = (jobDesc: string): string[] => {
  const toolPatterns = /\b(SAP|Excel|Power\s*BI|Salesforce|Jira|Figma|Photoshop|AutoCAD|KISIM|OPALE|Cerner|HiX|Primavera|MS\s*Project|Tableau|Python|SQL|R\b|SPSS|SAS|Workday|Oracle|Sage|Navision|Dynamics|ServiceNow|Zendesk|HubSpot|Pardot|Marketo|Asana|Monday|Trello|Notion|Confluence|GitHub|GitLab|Docker|Kubernetes|AWS|Azure|GCP|Terraform|Ansible|Jenkins|Bamboo|Word|Outlook|Teams|Slack|Google\s*Sheets|Google\s*Docs)\b/gi;
  const tools = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = toolPatterns.exec(jobDesc)) !== null) {
    tools.add(m[1]);
  }
  return Array.from(tools);
};

/**
 * Détecte si le candidat est en reconversion (CV ≠ poste cible)
 */
const detectReconversion = (cvText: string, targetJob: string, jobDescription: string): boolean => {
  const cvSectors = new Set<string>();
  const jobSectors = new Set<string>();
  const sectorKeywords: Record<string, RegExp> = {
    sante: /santé|médic|infirm|patient|soignant|hôpital|clinique|pharmacie/i,
    tech: /développ|logiciel|software|devops|cloud|data|programmation/i,
    finance: /financ|banque|comptab|audit|assurance|fiduciaire/i,
    enseignement: /enseign|éducat|formation|professeur|école/i,
    commerce: /commerc|vente|retail|magasin|vendeur/i,
    rh: /ressources humaines|recrutement|paie|rh\b/i,
    industrie: /industrie|usine|production|maintenance|qualité/i,
  };
  for (const [k, re] of Object.entries(sectorKeywords)) {
    if (re.test(cvText)) cvSectors.add(k);
    if (re.test(targetJob + " " + jobDescription)) jobSectors.add(k);
  }
  if (jobSectors.size === 0 || cvSectors.size === 0) return false;
  for (const s of jobSectors) {
    if (cvSectors.has(s)) return false;
  }
  return true;
};

/* ── question builder ────────────────────────────────────── */

/**
 * RÈGLES STRICTES DE GÉNÉRATION DES QUESTIONS :
 *
 * A) NE JAMAIS poser une question si l'info est déjà dans le CV
 *    → ville, email, téléphone = jamais redemandés s'ils sont présents
 *
 * B) Les questions doivent être générées UNIQUEMENT à partir des
 *    lacunes réelles détectées dans le rapport ATS (checklist/suggestions)
 *
 * C) Les questions doivent être cohérentes avec le SECTEUR DU POSTE
 *    (pas du CV) pour éviter les exemples absurdes
 *
 * D) Maximum 4 questions, toutes optionnelles
 */
export const detectQuestions = (
  result: AnalysisResult,
  cvText: string,
  jobDescription = "",
  targetJob = "",
  region = "FR",
): Question[] => {
  const questions: Question[] = [];
  const text = cvText.toLowerCase();

  // IMPORTANT: Détecter le secteur du POSTE CIBLE, pas du CV
  const jobSector = detectJobSector(targetJob, jobDescription);
  const examples = sectorExamples[jobSector];
  const requiredTools = extractRequiredTools(jobDescription);
  const isSwiss = region === "CH";

  // ═══════════════════════════════════════════════════════════════
  // RÈGLE A : VÉRIFIER QUE L'INFO N'EST PAS DÉJÀ DANS LE CV
  // ═══════════════════════════════════════════════════════════════

  const cityAlreadyInCV = hasCityInCV(cvText);
  const proEmailAlreadyInCV = hasProEmailInCV(cvText);

  // ═══════════════════════════════════════════════════════════════
  // RÈGLE B : QUESTIONS BASÉES SUR LES LACUNES ATS RÉELLES
  // ═══════════════════════════════════════════════════════════════

  // Helper pour vérifier si une lacune est mentionnée dans le rapport
  const checklistHasIssue = (pattern: RegExp) =>
    result.checklist?.some(c => pattern.test(c.label || "") && c.status !== "ok");

  const suggestionsHasIssue = (pattern: RegExp) =>
    result.suggestions?.some(s => pattern.test(s.text || "") || pattern.test(s.title || ""));

  // ─── P1: Lacunes critiques détectées par l'ATS ───

  // Email non professionnel — SEULEMENT si détecté comme problème ET pas déjà corrigé
  const emailIssueInReport = checklistHasIssue(/email|coordonn/i) || suggestionsHasIssue(/email|professionnel/i);
  if (emailIssueInReport && !proEmailAlreadyInCV) {
    questions.push({
      id: "email",
      label: "Votre adresse email semble non professionnelle — avez-vous une adresse Gmail ou Outlook ?",
      placeholder: "Ex : prenom.nom@gmail.com",
      type: "input",
      priority: 1,
      tier: 1,
    });
  }

  // Ville absente — SEULEMENT si le rapport le mentionne ET pas déjà dans le CV
  const locationIssueInReport = checklistHasIssue(/coordonn|contact|adresse|localisation/i) ||
    suggestionsHasIssue(/ville|adresse|localisation|coordonn/i);
  if (locationIssueInReport && !cityAlreadyInCV) {
    questions.push({
      id: "city",
      label: "Votre CV ne mentionne pas votre ville de résidence — où habitez-vous ?",
      placeholder: isSwiss ? "Ex : Lausanne, Suisse" : "Ex : Lyon, France",
      type: "input",
      priority: 2,
      tier: 1,
    });
  }

  // Dates manquantes — SEULEMENT si le rapport le détecte
  const datesIssueInReport = checklistHasIssue(/date|chronolog|structure/i) ||
    suggestionsHasIssue(/date|période|chronolog/i);
  if (datesIssueInReport) {
    questions.push({
      id: "missing_dates",
      label: "Certaines dates semblent manquer dans votre parcours — pouvez-vous préciser les périodes d'emploi ?",
      placeholder: "Ex : De janvier 2019 à mars 2021 chez [entreprise]",
      type: "input",
      priority: 3,
      tier: 1,
    });
  }

  // ─── P2: Lacunes de contenu détectées par l'ATS ───

  // Chiffres absents — SEULEMENT si le rapport le mentionne
  // Exemples adaptés au SECTEUR DU POSTE (règle C)
  const numbersIssueInReport = checklistHasIssue(/quantif|chiffr|mesur|impact|résultat/i) ||
    suggestionsHasIssue(/quantif|chiffr|mesur|impact|résultat|concret/i);
  const hasNumbers = /\d+\s*(%|€|k|clients|personnes|collaborateurs|budget|chiffre|patients|élèves|utilisateurs|dossiers|appels|commandes)/i.test(cvText);
  if (numbersIssueInReport && !hasNumbers) {
    questions.push({
      id: "numbers",
      label: "Pouvez-vous quantifier vos résultats professionnels ?",
      placeholder: `Ex : ${examples}`,
      type: "textarea",
      priority: 4,
      tier: 2,
    });
  }

  // Logiciels requis par l'offre mais absents du CV
  // SEULEMENT si une offre d'emploi est fournie
  if (jobDescription && requiredTools.length > 0) {
    const missingTools = requiredTools.filter(t => !text.includes(t.toLowerCase()));
    if (missingTools.length > 0) {
      const toolList = missingTools.slice(0, 3).join(", ");
      questions.push({
        id: "tools",
        label: `Le poste exige ${toolList} — maîtrisez-vous ${missingTools.length === 1 ? "ce logiciel" : "ces outils"} ?`,
        placeholder: `Ex : ${missingTools[0]} depuis 3 ans, niveau avancé`,
        type: "input",
        priority: 5,
        tier: 2,
      });
    }
  }

  // Langues sans niveau — SEULEMENT si mentionnées dans le CV sans niveau
  const langKeywords = ["anglais", "allemand", "espagnol", "italien", "portugais", "arabe", "chinois", "russe"];
  const detectedLangs = langKeywords.filter(l => text.includes(l));
  const hasLevels = /[abc][12]/i.test(text) || /courant|natif|bilingue|intermédiaire|avancé|scolaire|notions|opérationnel/i.test(text);
  const langIssueInReport = checklistHasIssue(/langue/i) || suggestionsHasIssue(/langue|niveau/i);
  if (detectedLangs.length > 0 && !hasLevels && langIssueInReport) {
    questions.push({
      id: "languages",
      label: `Vous mentionnez ${detectedLangs.join(" et ")} — quel est votre niveau exact ?`,
      placeholder: "Ex : Anglais C1 (courant), Allemand B2",
      type: "input",
      priority: 6,
      tier: 2,
    });
  }

  // Trou dans le parcours — SEULEMENT si le rapport le détecte
  const gapIssueInReport = checklistHasIssue(/trou|gap|chronolog|parcours|période/i) ||
    suggestionsHasIssue(/trou|gap|période|inactiv/i);
  if (gapIssueInReport) {
    questions.push({
      id: "gap",
      label: "Une période sans activité apparaît dans votre parcours — que faisiez-vous ?",
      placeholder: "Ex : Formation, congé parental, projet personnel...",
      type: "input",
      priority: 4,
      tier: 2,
    });
  }

  // Suisse: reconnaissance diplôme — contexte spécifique
  if (isSwiss && /diplôme|brevet|licence|master|bts|dut|cap|bep/i.test(text) && !/croix.rouge|reconnaissance|équivalence|crs/i.test(text)) {
    const healthJob = /santé|médic|infirm|soignant|aide.soignant/i.test(targetJob + jobDescription);
    if (healthJob) {
      questions.push({
        id: "swiss_diploma",
        label: "Avez-vous fait reconnaître votre diplôme par la Croix-Rouge Suisse ?",
        placeholder: "Ex : Diplôme reconnu par la CRS — Infirmier diplômé ES",
        type: "input",
        priority: 4,
        tier: 2,
      });
    }
  }

  // ─── P3: Questions complémentaires ───

  // Reconversion — seulement si détectée
  if (detectReconversion(cvText, targetJob, jobDescription)) {
    questions.push({
      id: "reconversion_motivation",
      label: "Votre parcours et le poste visé semblent dans des secteurs différents — quelle est votre motivation ?",
      placeholder: "Ex : Compétences transférables, passion pour ce domaine, formation récente...",
      type: "textarea",
      priority: 7,
      tier: 3,
    });
  }

  // Sort by priority
  questions.sort((a, b) => a.priority - b.priority);

  // P3 filtering: si questions P1 critiques, on retire les P3 moins urgentes
  const hasP1 = questions.some(q => q.tier === 1);
  const filtered = hasP1 ? questions.filter(q => q.tier <= 2) : questions;

  // Max 4 questions (règle D)
  return filtered.slice(0, 4);
};

/* ── component ───────────────────────────────────────────── */

const RewriteQuestionsModal = ({
  analysisResult, cvText, jobDescription, targetJob, region,
  onSubmit, onCancel,
}: RewriteQuestionsModalProps) => {
  const questions = useMemo(
    () => detectQuestions(analysisResult, cvText, jobDescription, targetJob, region),
    [analysisResult, cvText, jobDescription, targetJob, region],
  );
  const [answers, setAnswers] = useState<Record<string, string>>({});

  // If fewer than 3 questions detected, auto-submit
  if (questions.length < 3) {
    onSubmit({});
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-card rounded-3xl shadow-xl max-w-lg w-full p-8 space-y-6 max-h-[90vh] overflow-y-auto">
        <div>
          <h2 className="text-xl font-bold text-foreground">✏️ Quelques précisions pour personnaliser votre CV</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Répondez à ces questions pour que votre CV soit le plus pertinent possible. Vous pouvez ignorer les questions sans réponse.
          </p>
        </div>

        <div className="space-y-4">
          {questions.map((q) => (
            <div key={q.id}>
              <label className="block text-sm font-semibold text-foreground mb-1.5">{q.label}</label>
              {q.type === "textarea" ? (
                <textarea
                  value={answers[q.id] || ""}
                  onChange={(e) => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                  placeholder={q.placeholder}
                  rows={3}
                  className="w-full p-3 bg-secondary rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:outline-none border-none resize-none"
                />
              ) : (
                <input
                  type="text"
                  value={answers[q.id] || ""}
                  onChange={(e) => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                  placeholder={q.placeholder}
                  className="w-full p-3 bg-secondary rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:outline-none border-none"
                />
              )}
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <button
            onClick={() => onSubmit(answers)}
            className="w-full py-3 rounded-xl font-bold text-sm text-white hover:opacity-90 transition-all"
            style={{ background: "#1a365d" }}
          >
            Générer mon CV →
          </button>
          <p className="text-xs text-muted-foreground text-center">
            Vous pouvez laisser les champs vides et cliquer directement sur Générer.
          </p>
        </div>
      </div>
    </div>
  );
};

export default RewriteQuestionsModal;
