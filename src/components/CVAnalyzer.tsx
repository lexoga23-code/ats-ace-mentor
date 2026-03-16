import { useState, useRef, useEffect } from "react";
import { Sparkles } from "lucide-react";
import CVUploader from "./CVUploader";
import { useRegion } from "@/contexts/RegionContext";
import { analyzeCV, rewriteCV, type AnalysisResult } from "@/lib/analysis";
import ResultsPanel from "./ResultsPanel";
import LoadingOverlay from "./LoadingOverlay";
import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "scorecv_analysis";

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
  const [jobDescription, setJobDescription] = useState("");
  const [industry, setIndustry] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<AnalysisResult | null>(null);
  const [rewrittenCV, setRewrittenCV] = useState("");
  const [restoringPaid, setRestoringPaid] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Verify payment via webhook-recorded data
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");
    if (!sessionId) return;

    const verifyPayment = async (): Promise<boolean> => {
      try {
        const { data, error } = await supabase.functions.invoke("verify-payment", {
          body: { sessionId },
        });

        if (error) {
          console.error("Payment verification error:", error);
          return false;
        }

        if (data?.paid) {
          setIsPaid(true);
          // Restore saved analysis state
          const saved = localStorage.getItem(STORAGE_KEY);
          if (saved) {
            try {
              const state = JSON.parse(saved);
              setCvText(state.cvText || "");
              setTargetJob(state.targetJob || "");
              setJobDescription(state.jobDescription || "");
              setIndustry(state.industry || "");
              setResults(state.results || null);

              if (state.results && state.cvText && state.targetJob) {
                setRestoringPaid(true);
                rewriteCV(state.cvText, state.targetJob, region, state.results.keywordsMissing || [])
                  .then(setRewrittenCV)
                  .catch(console.error)
                  .finally(() => setRestoringPaid(false));
              }
            } catch {
              console.error("Failed to restore analysis state");
            }
          }
          // Clean URL
          window.history.replaceState({}, "", window.location.pathname);
        }
      } catch (err) {
        console.error("Verification failed:", err);
      }
    };

    // Poll with retries to let webhook process
    const tryVerify = async (attempt = 0) => {
      const result = await verifyPayment();
      if (!result && attempt < 5) {
        setTimeout(() => tryVerify(attempt + 1), 2000);
      }
    };
    setTimeout(() => tryVerify(), 1500);
  }, [region]);

  // Save state to localStorage after each analysis
  const saveState = (analysisResults: AnalysisResult) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      cvText,
      targetJob,
      jobDescription,
      industry,
      results: analysisResults,
    }));
  };

  const startAnalysis = async () => {
    if (!cvText || !targetJob) {
      alert("Veuillez charger un CV et indiquer le poste ciblé.");
      return;
    }

    setLoading(true);
    setResults(null);

    try {
      const result = await analyzeCV(cvText, targetJob, region, industry || "Non précisé", jobDescription);
      result.scoreDetails.format = Math.min(result.scoreDetails.format, 20);
      result.scoreDetails.keywords = Math.min(result.scoreDetails.keywords, 35);
      result.scoreDetails.experience = Math.min(result.scoreDetails.experience, 25);
      result.scoreDetails.readability = Math.min(result.scoreDetails.readability, 20);
      result.score = Math.min(result.score, 100);

      setResults(result);
      saveState(result);

      if (isPaid) {
        const rewritten = await rewriteCV(cvText, targetJob, region, result.keywordsMissing);
        setRewrittenCV(rewritten);
      }
    } catch (err) {
      console.error(err);
      alert("Erreur lors de l'analyse. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (results && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [results]);

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
              <label className="label-ui block mb-2">
                Offre d'emploi
              </label>
              <p className="text-xs text-muted-foreground mb-2">
                Plus vous collez l'offre complète, plus l'analyse sera précise et personnalisée.
              </p>
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Collez ici le texte complet de l'offre d'emploi..."
                className="w-full h-32 p-4 bg-card rounded-xl shadow-soft border-none focus:ring-2 focus:ring-primary focus:outline-none text-foreground placeholder:text-muted-foreground resize-none text-sm"
              />
            </div>
            <div>
              <label className="label-ui block mb-2">{"Secteur d'activité (optionnel)"}</label>
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full p-4 bg-card rounded-xl shadow-soft border-none focus:ring-2 focus:ring-primary focus:outline-none text-foreground"
              >
                <option value="">— Sélectionner —</option>
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

        {(loading || restoringPaid) && <LoadingOverlay />}

        <div ref={resultsRef}>
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
      </div>
    </section>
  );
};

export default CVAnalyzer;
