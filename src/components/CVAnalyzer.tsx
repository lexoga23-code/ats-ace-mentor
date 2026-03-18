import { useState, useRef, useEffect } from "react";
import { Sparkles } from "lucide-react";
import CVUploader from "./CVUploader";
import JobOfferInput from "./JobOfferInput";
import AnalysisHistory, { saveToHistory, type HistoryEntry } from "./AnalysisHistory";
import { useRegion } from "@/contexts/RegionContext";
import { useAuth } from "@/contexts/AuthContext";
import { analyzeCV, rewriteCV, type AnalysisResult } from "@/lib/analysis";
import ResultsPanel from "./ResultsPanel";
import LoadingOverlay from "./LoadingOverlay";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  const { user } = useAuth();
  const [cvText, setCvText] = useState("");
  const [targetJob, setTargetJob] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [industry, setIndustry] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<AnalysisResult | null>(null);
  const [rewrittenCV, setRewrittenCV] = useState("");
  const [restoringPaid, setRestoringPaid] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [currentAnalysisId, setCurrentAnalysisId] = useState<string | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // On mount: restore from DB if user is logged in, or from localStorage
  useEffect(() => {
    if (!user) return;
    const restoreFromDb = async () => {
      const { data } = await supabase
        .from("user_analyses")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        const latest = data[0];
        setCvText(latest.cv_text || "");
        setTargetJob(latest.target_job || "");
        setJobDescription(latest.job_description || "");
        setIndustry(latest.industry || "");
        setResults(latest.results as unknown as AnalysisResult);
        setIsPaid(latest.is_paid);
        setCurrentAnalysisId(latest.id);
        if (latest.rewritten_cv) setRewrittenCV(latest.rewritten_cv);
      }
    };
    restoreFromDb();
  }, [user]);

  // On mount: check for session_id in URL (return from Stripe same-tab redirect)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");
    if (!sessionId) return;

    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const state = JSON.parse(saved);
        setCvText(state.cvText || "");
        setTargetJob(state.targetJob || "");
        setJobDescription(state.jobDescription || "");
        setIndustry(state.industry || "");
        setResults(state.results || null);
      } catch { /* ignore */ }
    }

    setRestoringPaid(true);
    const tryVerify = async (attempt = 0) => {
      try {
        const { data } = await supabase.functions.invoke("verify-payment", {
          body: { sessionId },
        });
        if (data?.paid) {
          setIsPaid(true);
          localStorage.removeItem("scorecv_checkout_session");
          window.history.replaceState({}, "", window.location.pathname + "#optimiser");
          toast.success("✓ Paiement confirmé — votre rapport complet est prêt !");

          const savedState = localStorage.getItem(STORAGE_KEY);
          if (savedState) {
            try {
              const s = JSON.parse(savedState);
              if (s.cvText && s.targetJob && s.results) {
                const rewritten = await rewriteCV(s.cvText, s.targetJob, region, s.results.keywordsMissing || []);
                setRewrittenCV(rewritten);
              }
            } catch { /* ignore */ }
          }
          setRestoringPaid(false);
          return;
        }
      } catch { /* ignore */ }

      if (attempt < 10) {
        setTimeout(() => tryVerify(attempt + 1), 2000);
      } else {
        setRestoringPaid(false);
        toast.error("Impossible de confirmer le paiement. Contactez-nous si le problème persiste.");
      }
    };
    setTimeout(() => tryVerify(), 500);
  }, [region]);

  useEffect(() => {
    if (results && isPaid && resultsRef.current) {
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 300);
    }
  }, [results, isPaid]);

  // Poll localStorage for cross-tab payment signal
  useEffect(() => {
    const interval = setInterval(async () => {
      const paid = localStorage.getItem("scorecv_paid");
      if (paid === "true") {
        clearInterval(interval);
        localStorage.removeItem("scorecv_paid");

        // If user is logged in, restore from DB
        if (user) {
          const { data } = await supabase
            .from("user_analyses")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(1);

          if (data && data.length > 0) {
            const latest = data[0];
            setCvText(latest.cv_text || "");
            setTargetJob(latest.target_job || "");
            setResults(latest.results as unknown as AnalysisResult);
            setIsPaid(true);
            setCurrentAnalysisId(latest.id);
            if (latest.rewritten_cv) {
              setRewrittenCV(latest.rewritten_cv);
            } else if (latest.cv_text && latest.target_job) {
              const r = latest.results as unknown as AnalysisResult;
              rewriteCV(latest.cv_text, latest.target_job, region, r.keywordsMissing || [])
                .then(setRewrittenCV)
                .catch(() => {});
            }
          }
        } else {
          // Fallback: restore from localStorage
          const saved = localStorage.getItem("scorecv_data");
          if (saved) {
            try {
              const s = JSON.parse(saved);
              if (s.cvText) setCvText(s.cvText);
              if (s.targetJob) setTargetJob(s.targetJob);
              if (s.jobDescription) setJobDescription(s.jobDescription);
              if (s.industry) setIndustry(s.industry);
              if (s.results) setResults(s.results);
            } catch { /* ignore */ }
          }
          setIsPaid(true);

          const savedData = localStorage.getItem("scorecv_data");
          if (savedData) {
            try {
              const s = JSON.parse(savedData);
              if (s.cvText && s.targetJob && s.results) {
                rewriteCV(s.cvText, s.targetJob, region, s.results.keywordsMissing || [])
                  .then(setRewrittenCV)
                  .catch(() => {});
              }
            } catch { /* ignore */ }
          }
        }

        toast.success("✓ Paiement confirmé — voici votre rapport complet");
        setTimeout(() => {
          resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 300);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [region, user]);

  const saveState = (analysisResults: AnalysisResult) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      cvText, targetJob, jobDescription, industry, results: analysisResults,
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
      if (!result.sectionScores) result.sectionScores = [];

      setResults(result);
      saveState(result);

      // Save to local history
      saveToHistory({
        targetJob,
        score: result.score,
        matchScore: result.matchScore,
        results: result,
        cvText,
        jobDescription,
        industry,
      });

      // Save to DB if user is logged in
      if (user) {
        const { data: inserted } = await supabase.from("user_analyses").insert({
          user_id: user.id,
          cv_text: cvText,
          target_job: targetJob,
          job_description: jobDescription,
          industry: industry,
          results: result as any,
          score: result.score,
          match_score: result.matchScore || null,
          is_paid: isPaid,
        }).select("id").single();

        if (inserted) setCurrentAnalysisId(inserted.id);
      }

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

  const handleRestoreHistory = (entry: HistoryEntry) => {
    setCvText(entry.cvText);
    setTargetJob(entry.targetJob);
    setJobDescription(entry.jobDescription);
    setIndustry(entry.industry);
    setResults(entry.results);
    setRewrittenCV("");
    saveState(entry.results);
    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  useEffect(() => {
    if (results && resultsRef.current && !isPaid) {
      resultsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [results]);

  return (
    <section id="optimiser" className="py-20 px-6 bg-card border-y border-border/50">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-2 gap-12 items-start">
          <div className="space-y-6">
            <CVUploader onTextExtracted={setCvText} />
            <AnalysisHistory onRestore={handleRestoreHistory} />
          </div>

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
            <JobOfferInput value={jobDescription} onChange={setJobDescription} />
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
              analysisId={currentAnalysisId}
            />
          )}
        </div>
      </div>
    </section>
  );
};

export default CVAnalyzer;
