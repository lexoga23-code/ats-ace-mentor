import { useState } from "react";
import { Sparkles } from "lucide-react";
import CVUploader from "./CVUploader";
import { useRegion } from "@/contexts/RegionContext";
import { analyzeCV, rewriteCV, type AnalysisResult } from "@/lib/analysis";
import ResultsPanel from "./ResultsPanel";
import LoadingOverlay from "./LoadingOverlay";

const INDUSTRIES = [
  "Finance / Banque",
  "Technologie / IT",
  "Santé / Médical",
  "Industrie",
  "Services",
  "Éducation / Formation",
  "Commerce / Distribution",
];

const CVAnalyzer = () => {
  const { region } = useRegion();
  const [cvText, setCvText] = useState("");
  const [targetJob, setTargetJob] = useState("");
  const [jobOfferUrl, setJobOfferUrl] = useState("");
  const [industry, setIndustry] = useState(INDUSTRIES[0]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<AnalysisResult | null>(null);
  const [rewrittenCV, setRewrittenCV] = useState("");
  const isPaid = new URLSearchParams(window.location.search).get("paid") === "true";

  const startAnalysis = async () => {
    if (!cvText || !targetJob) {
      alert("Veuillez charger un CV et indiquer le poste ciblé.");
      return;
    }

    setLoading(true);
    setProgress(30);
    setResults(null);

    try {
      const result = await analyzeCV(cvText, targetJob, region, industry);
      // Cap scores
      result.scoreDetails.format = Math.min(result.scoreDetails.format, 20);
      result.scoreDetails.keywords = Math.min(result.scoreDetails.keywords, 35);
      result.scoreDetails.experience = Math.min(result.scoreDetails.experience, 25);
      result.scoreDetails.readability = Math.min(result.scoreDetails.readability, 20);
      result.score = Math.min(result.score, 100);

      setResults(result);
      setProgress(70);

      if (isPaid) {
        const rewritten = await rewriteCV(cvText, targetJob, region, result.keywordsMissing);
        setRewrittenCV(rewritten);
      }
    } catch (err) {
      console.error(err);
      alert("Erreur lors de l'analyse. Veuillez réessayer.");
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  return (
    <section id="optimiser" className="py-20 px-6 bg-card border-y border-border/50">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-2 gap-12 items-start">
          <CVUploader onTextExtracted={setCvText} />

          <div className="bg-secondary p-8 rounded-3xl space-y-6">
            <div>
              <label className="label-ui block mb-2">Poste ciblé</label>
              <input
                type="text"
                value={targetJob}
                onChange={(e) => setTargetJob(e.target.value)}
                placeholder="ex: Chef de Projet Marketing"
                className="w-full p-4 bg-card rounded-xl shadow-soft border-none focus:ring-2 focus:ring-primary focus:outline-none text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <div>
              <label className="label-ui block mb-2">{"Lien de l'offre d'emploi (optionnel)"}</label>
              <input
                type="url"
                value={jobOfferUrl}
                onChange={(e) => setJobOfferUrl(e.target.value)}
                placeholder="https://..."
                className="w-full p-4 bg-card rounded-xl shadow-soft border-none focus:ring-2 focus:ring-primary focus:outline-none text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <div>
              <label className="label-ui block mb-2">Secteur d'activité</label>
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full p-4 bg-card rounded-xl shadow-soft border-none focus:ring-2 focus:ring-primary focus:outline-none text-foreground"
              >
                {INDUSTRIES.map((ind) => (
                  <option key={ind}>{ind}</option>
                ))}
              </select>
            </div>
            <button
              onClick={startAnalysis}
              disabled={loading}
              className="w-full py-4 bg-primary text-primary-foreground rounded-xl font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {"Lancer l'analyse"} <Sparkles className="w-4 h-4" />
            </button>
          </div>
        </div>

        {loading && <LoadingOverlay />}

        {results && (
          <ResultsPanel
            results={results}
            isPaid={isPaid}
            rewrittenCV={rewrittenCV}
            cvText={cvText}
            targetJob={targetJob}
            region={region}
          />
        )}
      </div>

      {/* Progress bar */}
      {progress > 0 && (
        <div
          className="fixed top-0 left-0 z-[100] h-1 progress-gradient transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      )}
    </section>
  );
};

export default CVAnalyzer;
