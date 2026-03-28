import { useState } from "react";
import { type AnalysisResult } from "@/lib/analysis";

interface Question {
  id: string;
  label: string;
  placeholder: string;
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

  // Check experience level
  const expSection = result.sectionScores?.find(s => s.name === "Expérience");
  if (expSection && expSection.score <= 4) {
    questions.push({
      id: "extra_experience",
      label: "Avez-vous des projets personnels, bénévolat ou stages à ajouter ?",
      placeholder: "Ex: Stage chez X pendant 3 mois, bénévolat à Y...",
    });
  }

  // Check address
  const coordSection = result.sectionScores?.find(s => s.name === "Coordonnées");
  if (coordSection && coordSection.status !== "ok") {
    questions.push({
      id: "city",
      label: "Quelle est votre ville et pays de résidence ?",
      placeholder: "Ex: Lausanne, Suisse",
    });
  }

  // Check technical skills
  const compSection = result.sectionScores?.find(s => s.name === "Compétences");
  if (compSection && compSection.score <= 5) {
    questions.push({
      id: "tools",
      label: "Quels outils ou logiciels maîtrisez-vous que vous n'avez pas mentionnés ?",
      placeholder: "Ex: Excel avancé, SAP, Salesforce, Figma...",
    });
  }

  // Check for measurable results
  const impactCheck = result.checklist?.find(c => c.label?.includes("Impact chiffré") || c.label?.includes("chiffré"));
  if (impactCheck && impactCheck.status !== "ok") {
    questions.push({
      id: "numbers",
      label: "Avez-vous des chiffres concrets à mettre en avant ? (nombre de clients, taux de réussite, équipe gérée...)",
      placeholder: "Ex: Gestion d'une équipe de 12 personnes, +25% de satisfaction client...",
    });
  }

  // Check language levels
  const hasLanguages = text.includes("anglais") || text.includes("allemand") || text.includes("espagnol") || text.includes("italien");
  const hasLevels = /[abc][12]/i.test(text) || /courant|natif|bilingue|intermédiaire/i.test(text);
  if (hasLanguages && !hasLevels) {
    const langs: string[] = [];
    if (text.includes("anglais")) langs.push("anglais");
    if (text.includes("allemand")) langs.push("allemand");
    if (text.includes("espagnol")) langs.push("espagnol");
    if (text.includes("italien")) langs.push("italien");
    questions.push({
      id: "languages",
      label: `Quel est votre niveau exact en ${langs.join(", ")} ? (A1/A2/B1/B2/C1/C2)`,
      placeholder: "Ex: Anglais C1, Allemand B2",
    });
  }

  // Check unprofessional email
  const emailCheck = result.checklist?.find(c => c.label?.includes("Coordonnées") || c.label?.includes("email"));
  if (emailCheck && emailCheck.status !== "ok" && emailCheck.detail?.toLowerCase().includes("email")) {
    questions.push({
      id: "email",
      label: "Avez-vous une adresse email professionnelle Gmail ou Outlook à utiliser ?",
      placeholder: "Ex: prenom.nom@gmail.com",
    });
  }

  // Check career gaps
  const chronoCheck = result.checklist?.find(c => c.label?.includes("chronologique") || c.label?.includes("Parcours"));
  if (chronoCheck && chronoCheck.status === "warn" && chronoCheck.detail?.includes("trou")) {
    questions.push({
      id: "gap",
      label: "Y a-t-il une période sans activité dans votre parcours ? Que faisiez-vous ?",
      placeholder: "Ex: Formation en ligne, congé parental, projet personnel...",
    });
  }

  // Max 4 questions
  return questions.slice(0, 4);
};

const RewriteQuestionsModal = ({ analysisResult, cvText, onSubmit, onCancel }: RewriteQuestionsModalProps) => {
  const questions = detectQuestions(analysisResult, cvText);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  // If no questions detected, auto-submit immediately
  if (questions.length === 0) {
    onSubmit({});
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-card rounded-3xl shadow-xl max-w-lg w-full p-8 space-y-6 max-h-[90vh] overflow-y-auto">
        <div>
          <h2 className="text-xl font-bold text-foreground">Avant de générer votre CV, quelques précisions :</h2>
          <p className="text-sm text-muted-foreground mt-1">Ces informations amélioreront la qualité de votre CV réécrit.</p>
        </div>

        <div className="space-y-4">
          {questions.map((q) => (
            <div key={q.id}>
              <label className="block text-sm font-semibold text-foreground mb-1.5">{q.label}</label>
              <input
                type="text"
                value={answers[q.id] || ""}
                onChange={(e) => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                placeholder={q.placeholder}
                className="w-full p-3 bg-secondary rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:outline-none border-none"
              />
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl font-bold text-sm bg-secondary text-foreground hover:opacity-80 transition-all"
          >
            Annuler
          </button>
          <button
            onClick={() => onSubmit(answers)}
            className="flex-1 py-3 rounded-xl font-bold text-sm bg-primary text-primary-foreground hover:opacity-90 transition-all"
          >
            Générer mon CV →
          </button>
        </div>
      </div>
    </div>
  );
};

export default RewriteQuestionsModal;
