import { useState, useRef, useEffect } from "react";
import { Sparkles } from "lucide-react";
import CVUploader from "./CVUploader";
import JobOfferInput from "./JobOfferInput";
import AnalysisHistory, { getHistory, saveToHistory, type HistoryEntry } from "./AnalysisHistory";
import { useRegion } from "@/contexts/RegionContext";
import { useAuth } from "@/contexts/AuthContext";
import { analyzeCV, rewriteCV, type AnalysisResult } from "@/lib/analysis";
import {
  DEFAULT_ANALYSIS_MODE,
  TARGETED_UNSPECIFIED_TARGET_JOB,
  getAnalysisMode,
  getStoredTargetJob,
  normalizeAnalysisMode,
  type AnalysisMode,
} from "@/lib/analysisTypes";
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
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [results, setResults] = useState<AnalysisResult | null>(null);
  const [rewrittenCV, setRewrittenCV] = useState("");
  const [coverLetter, setCoverLetter] = useState("");
  const [restoringPaid, setRestoringPaid] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [currentAnalysisId, setCurrentAnalysisId] = useState<string | null>(null);
  const [activeAnalysisMode, setActiveAnalysisMode] = useState<AnalysisMode>(DEFAULT_ANALYSIS_MODE);
  const [activeStoredTargetJob, setActiveStoredTargetJob] = useState("");
  const [uploaderResetKey, setUploaderResetKey] = useState(0);
  const resultsRef = useRef<HTMLDivElement>(null);
  const uploadInProgressRef = useRef(false);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentAnalysisMode = getAnalysisMode(targetJob, jobDescription);
  const getNextUntitledTargetedIndex = () =>
    getHistory().filter((entry) => {
      const mode = normalizeAnalysisMode(entry.analysisMode);
      const title = entry.targetJob?.trim() || "";
      return mode === "targeted" && (!title || title.startsWith(TARGETED_UNSPECIFIED_TARGET_JOB));
    }).length + 1;

  /** Bug #2/#3 fix: Check server-side if user has paid for THIS SPECIFIC analysis OR has active pro subscription */
  const checkServerPaidStatus = async (userId: string, analysisId?: string | null): Promise<boolean> => {
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

    // Vérifier le statut Pro directement depuis la table user_subscriptions
    const { data: subData } = await supabase
      .from("user_subscriptions")
      .select("is_pro")
      .eq("user_id", userId)
      .maybeSingle();
    if (subData?.is_pro) return true;

    return false;
  };

  // On mount: clean analysis data (not history or subscription cache)
  // BUT preserve state if returning from payment (scorecv_paid flag present)
  useEffect(() => {
    cleanExpiredStorage();

    // Si on revient d'un paiement, NE PAS effacer les données
    if (localStorage.getItem("scorecv_paid") === "true") {
      console.log("Retour de paiement détecté — conservation des données");
      return;
    }

    // Sinon, nettoyer pour un fresh start
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
        setActiveAnalysisMode(DEFAULT_ANALYSIS_MODE);
        setActiveStoredTargetJob("");
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
        const restoredAnalysisMode = normalizeAnalysisMode(d.analysisMode);
        const restoredTargetJob = getStoredTargetJob(d.targetJob || "", restoredAnalysisMode);
        setCvText(d.cvText || "");
        setTargetJob(restoredAnalysisMode === "general" ? "" : restoredTargetJob);
        setJobDescription(d.jobDescription || "");
        setIndustry(d.industry || "");
        setResults(d.results as AnalysisResult);
        setCurrentAnalysisId(d.id || null);
        setActiveAnalysisMode(restoredAnalysisMode);
        setActiveStoredTargetJob(restoredTargetJob);

        // Reset explicite des contenus générés - important pour que les questions contextuelles s'affichent
        setRewrittenCV("");
        setCoverLetter("");

        // Bug #8: Always verify server-side before trusting isPaid
        if (user && d.id) {
          checkServerPaidStatus(user.id, d.id).then((serverPaid) => {
            setIsPaid(serverPaid);
            if (serverPaid) {
              // Restaurer les contenus générés s'ils existent
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

  // Fonction pour gérer la détection de paiement
  const handlePaymentDetected = async () => {
    if (localStorage.getItem("scorecv_paid") !== "true") return;

    // Récupérer l'analysis_id depuis localStorage (stocké par PaymentSuccess)
    const storedAnalysisId = localStorage.getItem("scorecv_analysis_id");

    console.log("[CVAnalyzer] Payment detected, analysis_id:", storedAnalysisId, "user:", user?.id);

    // NE PAS nettoyer ici — attendre que user soit chargé et la restauration réussie
    if (!user) {
      // Ne pas nettoyer, on réessaiera quand user sera chargé via useEffect
      console.log("[CVAnalyzer] User not loaded yet, will retry...");
      return;
    }

    // Utiliser l'ID stocké en priorité, sinon fallback sur currentAnalysisId
    let analysisIdToUse = storedAnalysisId || currentAnalysisId;

    // Fallback: chercher la dernière analyse payée en DB
    if (!analysisIdToUse) {
      console.log("[CVAnalyzer] No analysis_id found, searching in DB...");
      const { data: latestPaid } = await supabase
        .from("user_analyses")
        .select("id")
        .eq("user_id", user.id)
        .eq("is_paid", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (latestPaid) {
        analysisIdToUse = latestPaid.id;
      }
    }

    // Dernier fallback: chercher la plus récente
    if (!analysisIdToUse) {
      const { data: latest } = await supabase
        .from("user_analyses")
        .select("id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (latest) {
        analysisIdToUse = latest.id;
      }
    }

    if (!analysisIdToUse) {
      toast.error("Aucune analyse trouvée. Veuillez relancer une analyse.");
      return;
    }

    console.log("[CVAnalyzer] Using analysis_id:", analysisIdToUse);

    // Vérifier le paiement côté serveur
    const serverPaid = await checkServerPaidStatus(user.id, analysisIdToUse);
    if (!serverPaid) {
      console.error("[CVAnalyzer] Server says not paid for analysis:", analysisIdToUse);
      toast.error("Le paiement n'a pas pu être vérifié. Contactez-nous si le problème persiste.");
      return;
    }

    // Récupérer les données complètes de l'analyse depuis la DB
    const { data, error } = await supabase
      .from("user_analyses")
      .select("*")
      .eq("id", analysisIdToUse)
      .eq("user_id", user.id)
      .single();

    if (error) {
      console.error("[CVAnalyzer] Error fetching analysis:", error);
      toast.error("Erreur lors du chargement de l'analyse.");
      return;
    }

    if (data) {
      console.log("[CVAnalyzer] Restoring analysis data...");
      const restoredAnalysisMode = normalizeAnalysisMode(data.analysis_mode);
      const restoredTargetJob = getStoredTargetJob(data.target_job || "", restoredAnalysisMode);
      // Restaurer l'état complet depuis la DB
      setCvText(data.cv_text || "");
      setTargetJob(restoredAnalysisMode === "general" ? "" : restoredTargetJob);
      setJobDescription(data.job_description || "");
      setIndustry(data.industry || "");
      setResults(data.results as unknown as AnalysisResult);
      setCurrentAnalysisId(data.id);
      setActiveAnalysisMode(restoredAnalysisMode);
      setActiveStoredTargetJob(restoredTargetJob);
      setIsPaid(true);

      // Reset explicite puis restauration - important pour que les questions contextuelles s'affichent
      setRewrittenCV(data.rewritten_cv || "");
      setCoverLetter(data.cover_letter || "");

      // Nettoyer SEULEMENT après restauration réussie
      localStorage.removeItem("scorecv_paid");
      localStorage.removeItem("scorecv_analysis_id");

      // Scroll automatique vers le rapport complet
      setTimeout(() => {
        document.getElementById('results-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);

      toast.success("✓ Paiement confirmé — voici votre rapport complet");
    }
  };

  // Vérifier le paiement quand user devient disponible (après hard redirect depuis PaymentSuccess)
  useEffect(() => {
    // Attendre que user soit chargé avant de tenter la restauration
    if (!user) return;

    const timer = setTimeout(() => {
      if (localStorage.getItem("scorecv_paid") === "true") {
        console.log("[CVAnalyzer] User loaded, checking payment flag...");
        handlePaymentDetected();
      }
    }, 300); // 300ms pour laisser auth et composant se stabiliser
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]); // Déclencher quand user devient disponible

  // Vérifier au focus (retour d'un autre onglet)
  useEffect(() => {
    const onFocus = () => {
      if (localStorage.getItem("scorecv_paid") === "true") {
        handlePaymentDetected();
      }
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]); // Dépend de user pour pouvoir restaurer

  // Storage event listener for cross-tab payment detection
  useEffect(() => {
    const handleStorage = async (e: StorageEvent) => {
      if (e.key === "scorecv_paid" && e.newValue === "true") {
        handlePaymentDetected();
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]); // Dépend de user pour pouvoir restaurer

  // On mount: check for session_id in URL (return from Stripe same-tab redirect)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");
    if (!sessionId) return;

    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const state = JSON.parse(saved);
        const restoredAnalysisMode = normalizeAnalysisMode(state.analysisMode);
        const restoredTargetJob = getStoredTargetJob(state.targetJob || "", restoredAnalysisMode);
        setCvText(state.cvText || "");
        setTargetJob(restoredAnalysisMode === "general" ? "" : restoredTargetJob);
        setJobDescription(state.jobDescription || "");
        setIndustry(state.industry || "");
        setResults(state.results || null);
        setActiveAnalysisMode(restoredAnalysisMode);
        setActiveStoredTargetJob(restoredTargetJob);
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
              // Scroll automatique vers le rapport complet
              setTimeout(() => {
                document.getElementById('results-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }, 300);
            }
          }
          localStorage.removeItem("scorecv_checkout_session");
          window.history.replaceState({}, "", window.location.pathname + "#optimiser");
          toast.success("✓ Paiement confirmé — votre rapport complet est prêt !");

          // Reset explicite pour permettre l'affichage des questions contextuelles
          // L'utilisateur pourra répondre aux questions avant de générer le CV
          setRewrittenCV("");
          setCoverLetter("");
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


  const saveState = (
    stateCvText: string,
    storedTargetJob: string,
    analysisMode: AnalysisMode,
    stateJobDescription: string,
    stateIndustry: string,
    analysisResults: AnalysisResult
  ) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      cvText: stateCvText,
      targetJob: storedTargetJob,
      analysisMode,
      jobDescription: stateJobDescription,
      industry: stateIndustry,
      results: analysisResults,
    }));
  };

  const hardResetCVAndLetter = () => {
    setRewrittenCV('');
    setCoverLetter('');
    setResults(null);
    setIsPaid(false);
    setCurrentAnalysisId(null);
    setActiveAnalysisMode(DEFAULT_ANALYSIS_MODE);
    setActiveStoredTargetJob("");
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

  const startProgressTimer = () => {
    let current = 0;
    progressIntervalRef.current = setInterval(() => {
      current += 1;
      setLoadingProgress(current);
      if (current >= 95) {
        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    }, 210);
  };

  const stopProgressTimer = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  };

  const startAnalysis = async () => {
    if (!cvText.trim()) {
      alert("Veuillez charger un CV.");
      return;
    }

    const analysisMode = currentAnalysisMode;
    const untitledTargetedIndex =
      analysisMode === "targeted" && !targetJob.trim() ? getNextUntitledTargetedIndex() : 1;
    const storedTargetJob = getStoredTargetJob(targetJob, analysisMode, untitledTargetedIndex);

    hardResetCVAndLetter();
    setActiveAnalysisMode(analysisMode);
    setActiveStoredTargetJob(storedTargetJob);
    setLoading(true);
    setLoadingProgress(0);
    justAnalyzedRef.current = true;
    startProgressTimer();

    try {
      const effectiveIndustry = industry === "Autre" ? (customIndustry || "Non précisé") : (industry || "Non précisé");
      const result = await analyzeCV(cvText, targetJob, region, effectiveIndustry, jobDescription, analysisMode);

      result.scoreDetails.format = Math.min(result.scoreDetails.format, 20);
      result.scoreDetails.keywords = Math.min(result.scoreDetails.keywords, 35);
      result.scoreDetails.experience = Math.min(result.scoreDetails.experience, 25);
      result.scoreDetails.readability = Math.min(result.scoreDetails.readability, 20);
      result.score = Math.min(result.score, 100);
      if (!result.sectionScores) result.sectionScores = [];

      // FIX: Regrouper TOUS les setState dans le même batch pour éviter la race condition
      // où ResultsPanel se monte avec isPaid = false et le useEffect questions fait return immédiatement.
      // On fait d'abord les appels async, puis tous les setState ensemble.
      let currentPaid = false;
      let insertedId: string | null = null;

      if (user) {
        // Insert analysis first (async - AVANT les setState)
        const { data: inserted } = await supabase.from("user_analyses").insert({
          user_id: user.id,
          cv_text: cvText,
          target_job: storedTargetJob,
          analysis_mode: analysisMode,
          job_description: jobDescription,
          industry: effectiveIndustry,
          results: result as any,
          score: result.score,
          match_score: result.matchScore || null,
          is_paid: false,
        }).select("id").single();

        if (inserted) {
          insertedId = inserted.id;
          sessionStorage.setItem("scorecv_current_analysis_id", inserted.id);
          currentPaid = await checkServerPaidStatus(user.id, inserted.id);
        }
      }

      // BATCH: Tous les setState ensemble - ResultsPanel se montera avec isPaid correct
      setResults(result);
      setCurrentAnalysisId(insertedId);
      setIsPaid(currentPaid);
      setActiveAnalysisMode(analysisMode);
      setActiveStoredTargetJob(storedTargetJob);

      saveState(cvText, storedTargetJob, analysisMode, jobDescription, industry, result);

      // Save to local history
      saveToHistory({
        targetJob: storedTargetJob,
        analysisMode,
        score: result.score,
        matchScore: result.matchScore,
        results: result,
        cvText,
        jobDescription,
        industry,
      });

      // Only generate rewritten CV if server confirms paid
      if (currentPaid) {
        const rewritten = await rewriteCV(cvText, storedTargetJob, region, result.keywordsMissing, analysisMode);
        setRewrittenCV(rewritten);
      }

      stopProgressTimer();
      setLoadingProgress(100);
    } catch (err) {
      stopProgressTimer();
      setLoadingProgress(0);
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : "Une erreur est survenue lors de l'analyse";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
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
    // Reset uniquement les données d'analyse, PAS les champs du formulaire (targetJob, jobDescription, industry)
    setRewrittenCV('');
    setCoverLetter('');
    setResults(null);
    setIsPaid(false);
    setCurrentAnalysisId(null);
    sessionStorage.removeItem('scorecv_current_analysis_id');
    localStorage.removeItem('rewrittenCV');
    localStorage.removeItem('coverLetter');
    sessionStorage.removeItem('rewrittenCV');
    sessionStorage.removeItem('coverLetter');
    setCvText(text);
    console.log('CV chargé pour: nouveau fichier —', 'longueur:', text.length);
    // Les champs targetJob, jobDescription, industry sont conservés
    toast.success("✓ Nouveau CV chargé — lancez l'analyse.");
  };

  const handleRestoreHistory = (entry: HistoryEntry) => {
    const restoredAnalysisMode = normalizeAnalysisMode(entry.analysisMode);
    const restoredTargetJob = getStoredTargetJob(entry.targetJob, restoredAnalysisMode);

    setCvText(entry.cvText);
    setTargetJob(restoredAnalysisMode === "general" ? "" : restoredTargetJob);
    setJobDescription(entry.jobDescription);
    setIndustry(entry.industry);
    setResults(entry.results);
    setActiveAnalysisMode(restoredAnalysisMode);
    setActiveStoredTargetJob(restoredTargetJob);
    setRewrittenCV("");
    setCoverLetter("");
    setIsPaid(false);
    saveState(
      entry.cvText,
      restoredTargetJob,
      restoredAnalysisMode,
      entry.jobDescription,
      entry.industry,
      entry.results
    );
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
              <label className="label-ui block mb-2">Poste ciblé (recommandé)</label>
              <input
                type="text"
                value={targetJob}
                onChange={(e) => setTargetJob(e.target.value)}
                placeholder="ex: Chef de Projet Marketing"
                className="w-full p-4 bg-card rounded-xl shadow-soft border-none focus:ring-2 focus:ring-primary focus:outline-none text-foreground placeholder:text-muted-foreground"
              />
              <p className="mt-2 text-xs text-muted-foreground">
                Ajoutez un poste ou une offre pour une analyse plus précise. Sinon, ScoreCV analysera la qualité générale de votre CV.
              </p>
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

        {(loading || restoringPaid) && <LoadingOverlay progress={loadingProgress} />}

        <div ref={resultsRef} id="results-panel">
          {results && (
            <ResultsPanel
              key={currentAnalysisId || 'new'}
              results={results}
              isPaid={isPaid}
              rewrittenCV={rewrittenCV}
              coverLetter={coverLetter}
              cvText={cvText}
              targetJob={activeStoredTargetJob}
              analysisMode={activeAnalysisMode}
              industry={industry}
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
