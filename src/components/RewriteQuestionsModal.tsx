import { useState, useMemo } from "react";
import { type AnalysisResult } from "@/lib/analysis";

interface Question {
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
  onCancel: () => void;
}

/* ── helpers ─────────────────────────────────────────────── */

const extractCompanyNames = (cv: string): string[] => {
  const patterns = [
    /(?:chez|au sein de|à|at)\s+([A-ZÀ-Ü][A-Za-zÀ-ü&\-'. ]{2,30})/g,
    /(?:^|\n)\s*([A-ZÀ-Ü][A-Za-zÀ-ü&\-'. ]{2,30})\s*[-–—|]\s*\d{4}/gm,
  ];
  const names = new Set<string>();
  for (const p of patterns) {
    let m: RegExpExecArray | null;
    while ((m = p.exec(cv)) !== null) names.add(m[1].trim());
  }
  return [...names].slice(0, 3);
};

const detectSector = (industry: string | undefined, cv: string): string => {
  const text = (industry || "").toLowerCase() + " " + cv.toLowerCase();
  if (/santé|médic|infirm|patient|soignant|hôpital|clinique|chu|pharmacie/i.test(text)) return "sante";
  if (/enseign|éducat|formation|prof|école|élève|pédagog/i.test(text)) return "enseignement";
  if (/financ|banque|comptab|audit|assurance|fidu|trésor/i.test(text)) return "finance";
  if (/tech|développ|logiciel|software|devops|cloud|data|ia|machine/i.test(text)) return "tech";
  if (/commerc|vente|retail|distribut|magasin|client|b2b/i.test(text)) return "commerce";
  return "autre";
};

const sectorExamples: Record<string, string> = {
  sante: "nombre de patients par jour, actes réalisés, taux de satisfaction",
  enseignement: "nombre d'élèves, taux de réussite aux examens, nombre de classes",
  finance: "budget géré en €, nombre de clients, CA supervisé",
  tech: "nombre d'utilisateurs, réduction des bugs en %, temps de déploiement",
  commerce: "CA généré, nombre de clients, taux de conversion",
  autre: "résultats mesurables, objectifs atteints, impact concret",
};

const extractRequiredTools = (jobDesc: string): string[] => {
  const toolPatterns = /\b(SAP|Excel|Power\s*BI|Salesforce|Jira|Figma|Photoshop|AutoCAD|KISIM|OPALE|Cerner|HiX|Primavera|MS\s*Project|Tableau|Python|SQL|R\b|SPSS|SAS|Workday|Oracle|Sage|Navision|Dynamics|ServiceNow|Zendesk|HubSpot|Pardot|Marketo|Asana|Monday|Trello|Notion|Confluence|GitHub|GitLab|Docker|Kubernetes|AWS|Azure|GCP|Terraform|Ansible|Jenkins|Bamboo)\b/gi;
  const tools = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = toolPatterns.exec(jobDesc)) !== null) {
    tools.add(m[1]);
  }
  return [...tools];
};

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
  // Reconversion = aucun secteur en commun
  for (const s of jobSectors) {
    if (cvSectors.has(s)) return false;
  }
  return true;
};

/* ── question builder ────────────────────────────────────── */

const detectQuestions = (
  result: AnalysisResult,
  cvText: string,
  jobDescription = "",
  targetJob = "",
  region = "FR",
): Question[] => {
  const questions: Question[] = [];
  const text = cvText.toLowerCase();
  const companies = extractCompanyNames(cvText);
  const sector = detectSector(undefined, cvText + " " + targetJob + " " + jobDescription);
  const examples = sectorExamples[sector];
  const requiredTools = extractRequiredTools(jobDescription);
  const isSwiss = region === "CH";

  // ─── P1: Critical missing info ───

  // Email non professionnel
  const unprofEmails = ["hotmail", "wanadoo", "orange", "laposte", "yahoo", "aol", "free.fr", "sfr"];
  if (unprofEmails.some(e => text.includes(e))) {
    questions.push({
      id: "email",
      label: "Votre adresse email actuelle peut nuire à votre crédibilité — avez-vous une adresse Gmail ou Outlook ?",
      placeholder: "Ex : prenom.nom@gmail.com",
      type: "input",
      priority: 1,
      tier: 1,
    });
  }

  // Ville absente
  const hasCity = /ville|city|adresse|rue|avenue|boulevard|chemin|\d{4,5}\s+[A-ZÀ-Ü]/i.test(cvText);
  const coordCheck = result.checklist?.find(c => /coordonn/i.test(c.label || ""));
  if (!hasCity || (coordCheck && coordCheck.status !== "ok")) {
    questions.push({
      id: "city",
      label: "Votre CV ne mentionne pas votre ville de résidence — où habitez-vous ?",
      placeholder: isSwiss ? "Ex : Lausanne, Suisse" : "Ex : Lyon, France",
      type: "input",
      priority: 2,
      tier: 1,
    });
  }

  // Dates manquantes
  const structCheck = result.checklist?.find(c => /structure/i.test(c.label || ""));
  const hasMissingDates = /date|période/i.test(structCheck?.detail || "") || /sans date/i.test(result.suggestions?.map(s => s.text).join(" ") || "");
  if (hasMissingDates) {
    questions.push({
      id: "missing_dates",
      label: companies.length > 0
        ? `Les dates de votre poste chez ${companies[0]} semblent incomplètes — pouvez-vous les préciser ?`
        : "Certains postes n'ont pas de dates précises — pouvez-vous compléter ?",
      placeholder: "Ex : De janvier 2019 à mars 2021",
      type: "input",
      priority: 3,
      tier: 1,
    });
  }

  // ─── P2: Missing content ───

  // Chiffres absents — adapté au secteur
  const hasNumbers = /\d+\s*(%|€|k|clients|personnes|collaborateurs|budget|chiffre|patients|élèves|utilisateurs)/i.test(cvText);
  if (!hasNumbers) {
    const companyMention = companies.length > 0 ? ` chez ${companies[0]}` : "";
    questions.push({
      id: "numbers",
      label: `Votre CV ne contient aucun chiffre — combien de ${examples.split(",")[0].trim()}${companyMention} ?`,
      placeholder: `Ex : ${examples}`,
      type: "textarea",
      priority: 4,
      tier: 2,
    });
  }

  // Logiciels requis par l'offre
  if (requiredTools.length > 0) {
    const missingTools = requiredTools.filter(t => !text.includes(t.toLowerCase()));
    if (missingTools.length > 0) {
      const toolList = missingTools.slice(0, 3).join(", ");
      questions.push({
        id: "tools",
        label: `Le poste exige ${toolList} — maîtrisez-vous ${missingTools.length === 1 ? "ce logiciel" : "ces outils"} ? Si oui, depuis combien de temps ?`,
        placeholder: `Ex : ${missingTools[0]} depuis 3 ans, niveau avancé`,
        type: "input",
        priority: 5,
        tier: 2,
      });
    }
  } else {
    // Fallback: aucun outil mentionné dans le CV
    const compSection = result.sectionScores?.find(s => /compétence/i.test(s.name));
    const techCheck = result.checklist?.find(c => /technique/i.test(c.label || ""));
    if ((compSection && compSection.score <= 5) || (techCheck && techCheck.status !== "ok")) {
      questions.push({
        id: "tools",
        label: "Quels logiciels ou outils spécifiques à votre métier maîtrisez-vous ?",
        placeholder: "Ex : Excel avancé, SAP, Power BI, Jira...",
        type: "input",
        priority: 5,
        tier: 2,
      });
    }
  }

  // Langues sans niveau
  const langKeywords = ["anglais", "allemand", "espagnol", "italien", "portugais", "arabe", "chinois", "russe"];
  const detectedLangs = langKeywords.filter(l => text.includes(l));
  const hasLevels = /[abc][12]/i.test(text) || /courant|natif|bilingue|intermédiaire|avancé|scolaire/i.test(text);
  if (detectedLangs.length > 0 && !hasLevels) {
    questions.push({
      id: "languages",
      label: `Vous mentionnez ${detectedLangs.join(" et ")} sans préciser le niveau — quel est votre niveau exact ?`,
      placeholder: "Ex : Anglais C1 (courant), Allemand B2",
      type: "input",
      priority: 6,
      tier: 2,
    });
  }

  // ─── P3: Complementary ───

  // Reconversion — seulement si détectée
  if (detectReconversion(cvText, targetJob, jobDescription)) {
    questions.push({
      id: "reconversion_motivation",
      label: "Votre parcours et le poste visé sont dans des secteurs différents — quelle est votre motivation pour ce changement ?",
      placeholder: "Ex : Passionné par le digital depuis 5 ans, j'ai développé des compétences en...",
      type: "textarea",
      priority: 7,
      tier: 3,
    });
  }

  // LinkedIn absent
  if (!/linkedin/i.test(text)) {
    questions.push({
      id: "linkedin",
      label: "Avez-vous un profil LinkedIn à jour à ajouter ?",
      placeholder: "Ex : https://linkedin.com/in/prenom-nom",
      type: "input",
      priority: 8,
      tier: 3,
    });
  }

  // Suisse: reconnaissance diplôme
  if (isSwiss && /diplôme|brevet|licence|master|bts|dut|cap|bep/i.test(text) && !/croix.rouge|reconnaissance|équivalence/i.test(text)) {
    questions.push({
      id: "swiss_diploma",
      label: "Avez-vous fait reconnaître votre diplôme par la Croix-Rouge Suisse ? Si oui, précisez le diplôme équivalent suisse obtenu.",
      placeholder: "Ex : Diplôme reconnu par la CRS — Infirmier diplômé ES",
      type: "input",
      priority: 4, // P2 level for Swiss context
      tier: 2,
    });
  }

  // Trou dans le parcours
  const chronoCheck = result.checklist?.find(c => /chronolog|parcours/i.test(c.label || ""));
  if (chronoCheck && (chronoCheck.status === "warn" || chronoCheck.status === "fail")) {
    questions.push({
      id: "gap",
      label: "Une période sans activité apparaît dans votre parcours — que faisiez-vous ?",
      placeholder: "Ex : Formation en data analysis de mars à septembre 2022",
      type: "input",
      priority: 4,
      tier: 2,
    });
  }

  // Sort by priority
  questions.sort((a, b) => a.priority - b.priority);

  // P3 filtering: if any P1 exists, remove all P3
  const hasP1 = questions.some(q => q.tier === 1);
  const filtered = hasP1 ? questions.filter(q => q.tier <= 2) : questions;

  // Max 4 questions
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

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl font-bold text-sm bg-secondary text-muted-foreground hover:opacity-80 transition-all"
          >
            Passer cette étape
          </button>
          <button
            onClick={() => onSubmit(answers)}
            className="flex-1 py-3 rounded-xl font-bold text-sm text-white hover:opacity-90 transition-all"
            style={{ background: "#1a365d" }}
          >
            Générer mon CV →
          </button>
        </div>
      </div>
    </div>
  );
};

export default RewriteQuestionsModal;
