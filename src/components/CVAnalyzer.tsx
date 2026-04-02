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
import { cleanExpiredStorage } from "@/lib/storage";

const STORAGE_KEY = "scorecv_analysis";

const INDUSTRIES = [
  "Finance / Banque",
  "Technologie / IT",
  "Santé / Médical",
  "Industrie",
  "Services",
  "Éducation / Formation",
  "Ressources Humaines",
  "Commerce / Distribution",
  "Autre",
];

const CVAnalyzer = () => {
  const { region } = useRegion();
  const { user } = useAuth();
  const [cvText, setCvText] = useState("");
  const [targetJob, setTargetJob] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [industry, setIndustry] = useState("");
  const [customIndustry, setCustomIndustry] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<AnalysisResult | null>(null);
  const [rewrittenCV, setRewrittenCV] = useState("");
  const [coverLetter, setCoverLetter] = useState("");
  const [restoringPaid, setRestoringPaid] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [currentAnalysisId, setCurrentAnalysisId] = useState<string | null>(null);
  const [uploaderResetKey, setUploaderResetKey] = useState(0);
  const resultsRef = useRef<HTMLDivElement>(null);
  const uploadInProgressRef = useRef(false);  // Flag pour éviter race condition avec restauration DB

  /** Bug #2/#3 fix: Check server-side if user has paid for THIS SPECIFIC analysis OR has active pro subscription */
  /** Amélioration: Cache de 60 secondes pour check-subscription */
  const checkServerPaidStatus = async (userId: string, analysisId?: string | null): Promise<boolean> => {
    const cacheKey = "scorecv_sub_cache";

    // Fonction helper pour vérifier le statut Pro avec cache
    const checkProWithCache = async (): Promise<boolean> => {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        try {
          const c = JSON.parse(cached);
          if (Date.now() - c.timestamp < 60000 && c.isPro) {
            return true;
          }
        } catch { /* ignore */ }
      }

      try {
        const { data: subData } = await supabase.functions.invoke("check-subscription");
        if (subData) {
          sessionStorage.setItem(cacheKey, JSON.stringify({ ...subData, timestamp: Date.now() }));
          if (subData.isPro) return true;
        }
      } catch { /* ignore */ }
      return false;
    };

    // Sécurité: exiger analysisId, sinon retourner false par défaut
    if (!analysisId) {
      return false;
    }

    // Vérifier l'analyse spécifique
    const { data } = await supabase
      .from("user_analyses")
      .select("is_paid")
      .eq("id", analysisId)
      .eq("user_id", userId)
      .single();
    if (data?.is_paid) return true;

    // Aussi vérifier l'abonnement Pro avec cache
    return await checkProWithCache();
  };

  // On mount: clean analysis data (not history or subscription cache)
  // Ensures fresh start on page refresh as per user requirements
  useEffect(() => {
    // Nettoyer les entrées localStorage expirées (24h)
    cleanExpiredStorage();
    // Nettoyer les données d'analyse au rafraîchissement
    sessionStorage.removeItem('scorecv_current_analysis_id');
    localStorage.removeItem('scorecv_analysis');
    localStorage.removeItem('scorecv_data');
    localStorage.removeItem('rewrittenCV');
    localStorage.removeItem('coverLetter');
    sessionStorage.removeItem('rewrittenCV');
    sessionStorage.removeItem('coverLetter');
  }, []);

  // Handle reset flag — must react to route navigation, not just user changes
  useEffect(() => {
    const checkReset = () => {
      if (localStorage.getItem("scorecv_reset") === "true") {
        localStorage.removeItem("scorecv_reset");
        setCvText("");
        setTargetJob("");
        setJobDescription("");
        setIndustry("");
        setCustomIndustry("");
        setResults(null);
        setRewrittenCV("");
        setCoverLetter("");
        setIsPaid(false);
        setCurrentAnalysisId(null);
        setUploaderResetKey(k => k + 1);
      }
    };
    checkReset();
    window.addEventListener("focus", checkReset);
    return () => window.removeEventListener("focus", checkReset);
  }, []);

  // Handle restore from Account page only (explicit user action)
  // No automatic restore from DB on refresh — fresh start each time
  useEffect(() => {
    const restoreData = localStorage.getItem("scorecv_restore_analysis");
    if (restoreData) {
      localStorage.removeItem("scorecv_restore_analysis");
      try {
        const d = JSON.parse(restoreData);
        setCvText(d.cvText || "");
        setTargetJob(d.targetJob || "");
        setJobDescription(d.jobDescription || "");
        setIndustry(d.industry || "");
        setResults(d.results as AnalysisResult);
        setCurrentAnalysisId(d.id || null);

        // Bug #8: Always verify server-side before trusting isPaid
        if (user && d.id) {
          checkServerPaidStatus(user.id, d.id).then((serverPaid) => {
            setIsPaid(serverPaid);
            if (serverPaid) {
              if (d.rewrittenCV) setRewrittenCV(d.rewrittenCV);
              if (d.coverLetter) setCoverLetter(d.coverLetter);
            }
          });
        } else {
          setIsPaid(false);
        }
      } catch { /* ignore */ }
    }
  }, [user]);

  // Bug #14 fix: Single storage event listener only (removed redundant polling interval)
  useEffect(() => {
    const handleStorage = async (e: StorageEvent) => {
      if (e.key === "scorecv_paid" && e.newValue === "true") {
        localStorage.removeItem("scorecv_paid");

        if (user && currentAnalysisId) {
          // Verify payment for the CURRENT analysis only
          const serverPaid = await checkServerPaidStatus(user.id, currentAnalysisId);
          if (!serverPaid) return;

          // Fetch the current analysis data
          const { data } = await supabase
            .from("user_analyses")
            .select("*")
            .eq("id", currentAnalysisId)
            .eq("user_id", user.id)
            .single();

          if (data) {
            setIsPaid(true);
            if (data.rewritten_cv) {
              setRewrittenCV(data.rewritten_cv);
            } else if (cvText && targetJob) {
              // Generate rewritten CV for current analysis
              const r = results;
              if (r) {
                rewriteCV(cvText, targetJob, region, r.keywordsMissing || [])
                  .then(setRewrittenCV)
                  .catch(() => {});
              }
            }
            if (data.cover_letter) {
              setCoverLetter(data.cover_letter);
            }
          }
        }

        toast.success("✓ Paiement confirmé — voici votre rapport complet");
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [user, region, currentAnalysisId, cvText, targetJob, results]);

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
          if (user) {
            // Get latest analysis ID for server check
            const { data: analyses } = await supabase
              .from("user_analyses")
              .select("id")
              .eq("user_id", user.id)
              .order("created_at", { ascending: false })
              .limit(1);
            const latestId = analyses?.[0]?.id || null;
            const serverPaid = await checkServerPaidStatus(user.id, latestId);
            if (serverPaid) {
              setIsPaid(true);
              setCurrentAnalysisId(latestId);
            }
          }
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
  }, [region, user]); // Bug #5: added user


  const saveState = (analysisResults: AnalysisResult) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      cvText, targetJob, jobDescription, industry, results: analysisResults,
    }));
  };

  const hardResetCVAndLetter = () => {
    setRewrittenCV('');
    setCoverLetter('');
    setResults(null);
    setIsPaid(false);
    setCurrentAnalysisId(null);
    sessionStorage.removeItem('scorecv_current_analysis_id');
    localStorage.removeItem('rewrittenCV');
    localStorage.removeItem('coverLetter');
    localStorage.removeItem('scorecv_data');
    localStorage.removeItem('scorecv_paid');
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('scorecv_restore_analysis');
    sessionStorage.removeItem('rewrittenCV');
    sessionStorage.removeItem('coverLetter');
    console.log('HARD RESET — CV et lettre effacés');
  };

  const startAnalysis = async () => {
    if (!cvText || !targetJob) {
      alert("Veuillez charger un CV et indiquer le poste ciblé.");
      return;
    }

    hardResetCVAndLetter();
    setLoading(true);
    justAnalyzedRef.current = true;

    try {
      const effectiveIndustry = industry === "Autre" ? (customIndustry || "Non précisé") : (industry || "Non précisé");
      const result = await analyzeCV(cvText, targetJob, region, effectiveIndustry, jobDescription);
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

      // For new analyses, isPaid starts as false — must pay first
      let currentPaid = false;
      if (user) {
        // Insert analysis first
        const { data: inserted } = await supabase.from("user_analyses").insert({
          user_id: user.id,
          cv_text: cvText,
          target_job: targetJob,
          job_description: jobDescription,
          industry: effectiveIndustry,
          results: result as any,
          score: result.score,
          match_score: result.matchScore || null,
          is_paid: false, // Always false for new analysis
        }).select("id").single();

        if (inserted) {
          setCurrentAnalysisId(inserted.id);
          sessionStorage.setItem("scorecv_current_analysis_id", inserted.id);
          // Check if user is Pro (Pro users get auto-paid)
          currentPaid = await checkServerPaidStatus(user.id, inserted.id);
          setIsPaid(currentPaid);
        }
      }

      // Only generate rewritten CV if server confirms paid
      if (currentPaid) {
        const rewritten = await rewriteCV(cvText, targetJob, region, result.keywordsMissing);
        setRewrittenCV(rewritten);
      }
    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : "Une erreur est survenue lors de l'analyse";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
      // Scroll to results after analysis completes
      setTimeout(() => {
        document.getElementById('results-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 200);
    }
  };

  // Bug #19/#20: Callback to save generated CV/letter to DB
  const handleRewrittenCVUpdate = async (cv: string) => {
    setRewrittenCV(cv);
    if (user && currentAnalysisId && cv) {
      await supabase.from("user_analyses").update({ rewritten_cv: cv }).eq("id", currentAnalysisId);
    }
  };

  const handleCoverLetterUpdate = async (letter: string) => {
    setCoverLetter(letter);
    if (user && currentAnalysisId && letter) {
      await supabase.from("user_analyses").update({ cover_letter: letter }).eq("id", currentAnalysisId);
    }
  };

  const handleFileUploaded = (text: string) => {
    uploadInProgressRef.current = true;  // Empêche la restauration DB d'écraser ce nouveau CV
    hardResetCVAndLetter();
    setCvText(text);
    console.log('CV chargé pour: nouveau fichier —', 'longueur:', text.length);
    setTargetJob("");
    setJobDescription("");
    setIndustry("");
    setCustomIndustry("");
    toast.success("✓ Nouveau CV chargé — remplissez le poste ciblé et relancez l'analyse.");
  };

  const handleRestoreHistory = (entry: HistoryEntry) => {
    setCvText(entry.cvText);
    setTargetJob(entry.targetJob);
    setJobDescription(entry.jobDescription);
    setIndustry(entry.industry);
    setResults(entry.results);
    setRewrittenCV("");
    setCoverLetter("");
    setIsPaid(false);
    saveState(entry.results);
  };

  // Only auto-scroll to results after a NEW analysis (not on restore)
  const justAnalyzedRef = useRef(false);
  useEffect(() => {
    if (justAnalyzedRef.current && results) {
      justAnalyzedRef.current = false;
    }
  }, [results]);

  return (
    <section id="optimiser" className="py-20 px-6 bg-card border-y border-border/50">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-2 gap-12 items-start">
          <div className="space-y-6">
            <CVUploader onTextExtracted={setCvText} onFileUploaded={handleFileUploaded} resetKey={uploaderResetKey} />
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
                onChange={(e) => {
                  setIndustry(e.target.value);
                  if (e.target.value !== "Autre") setCustomIndustry("");
                }}
                className="w-full p-4 bg-card rounded-xl shadow-soft border-none focus:ring-2 focus:ring-primary focus:outline-none text-foreground"
              >
                <option value="">— Sélectionner —</option>
                {INDUSTRIES.map((ind) => (
                  <option key={ind}>{ind}</option>
                ))}
              </select>
              {industry === "Autre" && (
                <input
                  type="text"
                  value={customIndustry}
                  onChange={(e) => setCustomIndustry(e.target.value)}
                  placeholder="Précisez votre secteur d'activité..."
                  className="w-full mt-2 p-4 bg-card rounded-xl shadow-soft border-none focus:ring-2 focus:ring-primary focus:outline-none text-foreground placeholder:text-muted-foreground"
                />
              )}
            </div>
            <button
              onClick={(e) => { e.preventDefault(); startAnalysis(); }}
              disabled={loading}
              className="w-full py-4 bg-primary text-primary-foreground rounded-xl font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {"Lancer l'analyse"} <Sparkles className="w-4 h-4" />
            </button>
          </div>
        </div>

        {(loading || restoringPaid) && <LoadingOverlay />}

        <div ref={resultsRef} id="results-panel">
          {results && (
            <ResultsPanel
              results={results}
              isPaid={isPaid}
              rewrittenCV={rewrittenCV}
              coverLetter={coverLetter}
              cvText={cvText}
              targetJob={targetJob}
              region={region}
              analysisId={currentAnalysisId}
              jobDescription={jobDescription}
              onRewrittenCVChange={handleRewrittenCVUpdate}
              onCoverLetterChange={handleCoverLetterUpdate}
            />
          )}
        </div>
      </div>
    </section>
  );
};

export default CVAnalyzer;
