import { useState, useMemo } from "react";
import { type AnalysisResult } from "@/lib/analysis";

interface Question {
  id: string;
  label: string;
  placeholder: string;
  type: "input" | "textarea";
  priority: number; // lower = higher priority
}

interface RewriteQuestionsModalProps {
  analysisResult: AnalysisResult;
  cvText: string;
  onSubmit: (answers: Record<string, string>) => void;
  onCancel: () => void;
}

const detectQuestions = (result: AnalysisResult, cvText: string): Question[] => {
  const questions: Question[] = [];
  const text = cvText.toLowerCase();

  // 1. Aucun résultat chiffré détecté
  const impactCheck = result.checklist?.find(c => /impact|chiffr/i.test(c.label || ""));
  const hasNumbers = /\d+\s*(%|€|k|clients|personnes|collaborateurs|budget|chiffre)/i.test(cvText);
  if ((impactCheck && impactCheck.status !== "ok") || !hasNumbers) {
    questions.push({
      id: "numbers",
      label: "Avez-vous des chiffres concrets à mettre en avant ? Ex : nombre de clients, budget géré, taille d'équipe, taux de réussite...",
      placeholder: "Ex : Gestion d'une équipe de 12 personnes, +25% de satisfaction client, budget de 500K€...",
      type: "textarea",
      priority: 1,
    });
  }

  // 2. Niveaux de langue absents ou flous
  const langKeywords = ["anglais", "allemand", "espagnol", "italien", "portugais", "arabe", "chinois", "russe"];
  const detectedLangs = langKeywords.filter(l => text.includes(l));
  const hasLevels = /[abc][12]/i.test(text) || /courant|natif|bilingue|intermédiaire|avancé|scolaire/i.test(text);
  if (detectedLangs.length > 0 && !hasLevels) {
    questions.push({
      id: "languages",
      label: `Quel est votre niveau exact en ${detectedLangs.join(", ")} ? (A1 / A2 / B1 / B2 / C1 / C2)`,
      placeholder: "Ex : Anglais C1, Allemand B2",
      type: "input",
      priority: 3,
    });
  }

  // 3. Email non professionnel
  const unprofEmails = ["hotmail", "wanadoo", "orange", "laposte", "yahoo", "aol", "free.fr", "sfr"];
  const hasUnprofEmail = unprofEmails.some(e => text.includes(e));
  if (hasUnprofEmail) {
    questions.push({
      id: "email",
      label: "Avez-vous une adresse email professionnelle Gmail ou Outlook à utiliser à la place ?",
      placeholder: "Ex : prenom.nom@gmail.com",
      type: "input",
      priority: 2,
    });
  }

  // 4. Trou dans le parcours
  const chronoCheck = result.checklist?.find(c => /chronolog|parcours/i.test(c.label || ""));
  if (chronoCheck && (chronoCheck.status === "warn" || chronoCheck.status === "fail")) {
    questions.push({
      id: "gap",
      label: "Y a-t-il une période sans activité dans votre parcours ? Que faisiez-vous ? Ex : formation, projet personnel, congé parental...",
      placeholder: "Ex : Formation en ligne en data analysis de mars à septembre 2022",
      type: "input",
      priority: 4,
    });
  }

  // 5. Adresse ou ville absente
  const coordCheck = result.checklist?.find(c => /coordonn/i.test(c.label || ""));
  const coordSection = result.sectionScores?.find(s => s.name === "Coordonnées");
  const hasCity = /ville|city|adresse|rue|avenue|boulevard|chemin|\d{4,5}\s+[A-ZÀ-Ü]/i.test(cvText);
  if (!hasCity || (coordSection && coordSection.status !== "ok") || (coordCheck && coordCheck.status !== "ok")) {
    questions.push({
      id: "city",
      label: "Quelle est votre ville et pays de résidence ?",
      placeholder: "Ex : Lausanne, Suisse",
      type: "input",
      priority: 5,
    });
  }

  // 6. Aucun logiciel/outil mentionné
  const compSection = result.sectionScores?.find(s => /compétence/i.test(s.name));
  const techCheck = result.checklist?.find(c => /technique/i.test(c.label || ""));
  if ((compSection && compSection.score <= 5) || (techCheck && techCheck.status !== "ok")) {
    questions.push({
      id: "tools",
      label: "Quels logiciels ou outils maîtrisez-vous que vous n'avez pas mentionnés ?",
      placeholder: "Ex : Excel avancé, SAP, Figma, Jira, Power BI...",
      type: "input",
      priority: 6,
    });
  }

  // 7. Profil de reconversion détecté
  const pertinenceCheck = result.checklist?.find(c => /pertinence/i.test(c.label || ""));
  if (pertinenceCheck && pertinenceCheck.status !== "ok") {
    questions.push({
      id: "reconversion_motivation",
      label: "En 1-2 phrases, quelle est votre principale motivation pour ce changement de secteur ?",
      placeholder: "Ex : Passionné par le digital depuis 5 ans, j'ai développé des compétences en...",
      type: "textarea",
      priority: 7,
    });
  }

  // 8. LinkedIn absent
  if (!/linkedin/i.test(text)) {
    questions.push({
      id: "linkedin",
      label: "Avez-vous un profil LinkedIn à jour ? Si oui, collez l'URL ici.",
      placeholder: "Ex : https://linkedin.com/in/prenom-nom",
      type: "input",
      priority: 8,
    });
  }

  // 9. Compétences trop génériques
  const keywordsMissing = result.keywordsMissing || [];
  if (keywordsMissing.length >= 5) {
    questions.push({
      id: "specific_skills",
      label: "Y a-t-il des compétences spécifiques à ce poste que vous maîtrisez mais n'avez pas mentionnées ?",
      placeholder: "Ex : Gestion de projet Agile, normes ISO 9001, relation client B2B...",
      type: "textarea",
      priority: 9,
    });
  }

  // 10. Dates manquantes sur un poste
  const structCheck = result.checklist?.find(c => /structure/i.test(c.label || ""));
  const hasMissingDates = /date|période/i.test(structCheck?.detail || "") || /sans date/i.test(result.suggestions?.map(s => s.text).join(" ") || "");
  if (hasMissingDates) {
    questions.push({
      id: "missing_dates",
      label: "Pouvez-vous préciser les dates exactes d'un poste où elles manquent ?",
      placeholder: "Ex : Chez Nestlé, de janvier 2019 à mars 2021",
      type: "input",
      priority: 10,
    });
  }

  // Sort by priority, take max 5
  return questions.sort((a, b) => a.priority - b.priority).slice(0, 5);
};

const RewriteQuestionsModal = ({ analysisResult, cvText, onSubmit, onCancel }: RewriteQuestionsModalProps) => {
  const questions = useMemo(() => detectQuestions(analysisResult, cvText), [analysisResult, cvText]);
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
          <h2 className="text-xl font-bold text-foreground">✏️ Quelques précisions pour un CV plus précis</h2>
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
