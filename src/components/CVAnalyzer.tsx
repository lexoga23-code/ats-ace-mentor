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

  /** Bug #2/#3 fix: Check server-side if user has paid for THIS SPECIFIC analysis OR has active pro subscription */
  const checkServerPaidStatus = async (userId: string, analysisId?: string | null): Promise<boolean> => {
    // If no analysisId, default to false (never assume paid)
    if (!analysisId) {
      // Still check pro subscription
      try {
        const { data: subData } = await supabase.functions.invoke("check-subscription");
        if (subData?.isPro) return true;
      } catch { /* ignore */ }
      return false;
    }

    // Check this specific analysis
    const { data } = await supabase
      .from("user_analyses")
      .select("is_paid")
      .eq("id", analysisId)
      .eq("user_id", userId)
      .single();
    if (data?.is_paid) return true;

    // Also check pro subscription
    try {
      const { data: subData } = await supabase.functions.invoke("check-subscription");
      if (subData?.isPro) return true;
    } catch { /* ignore */ }

    return false;
  };

  // On mount: handle reset flag, restore from localStorage, or restore from DB
  // Separate effect for reset flag — must react to route navigation, not just user changes
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

  useEffect(() => {

    // Handle restore from Account page (specific analysis)
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
        setCoverLetter(d.coverLetter || "");

        // Bug #8: Always verify server-side before trusting isPaid
        if (user && d.id) {
          checkServerPaidStatus(user.id, d.id).then((serverPaid) => {
            setIsPaid(serverPaid);
            if (d.rewrittenCV && serverPaid) setRewrittenCV(d.rewrittenCV);
          });
        } else {
          setIsPaid(false);
        }

      } catch { /* ignore */ }
      return;
    }

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
        setCurrentAnalysisId(latest.id);
        const serverPaid = await checkServerPaidStatus(user.id, latest.id);
        setIsPaid(serverPaid);
        if (latest.rewritten_cv && serverPaid) setRewrittenCV(latest.rewritten_cv);
        if (latest.cover_letter && serverPaid) setCoverLetter(latest.cover_letter);
      }
    };
    restoreFromDb();
  }, [user]);

  // Bug #14 fix: Single storage event listener only (removed redundant polling interval)
  useEffect(() => {
    const handleStorage = async (e: StorageEvent) => {
      if (e.key === "scorecv_paid" && e.newValue === "true") {
        localStorage.removeItem("scorecv_paid");

        if (user) {
          // Get the latest analysis to find its ID
          const { data } = await supabase
            .from("user_analyses")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(1);

          if (data && data.length > 0) {
            const latest = data[0];
            // Bug #8: Always verify server-side with specific analysisId
            const serverPaid = await checkServerPaidStatus(user.id, latest.id);
            if (!serverPaid) return;
            setIsPaid(true);

            setCvText(latest.cv_text || "");
            setTargetJob(latest.target_job || "");
            setResults(latest.results as unknown as AnalysisResult);
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
        }

        toast.success("✓ Paiement confirmé — voici votre rapport complet");
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [user, region]); // Bug #5: added user to dependencies

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

  const startAnalysis = async () => {
    if (!cvText || !targetJob) {
      alert("Veuillez charger un CV et indiquer le poste ciblé.");
      return;
    }


    setLoading(true);
    setResults(null);
    setRewrittenCV("");
    setCoverLetter("");
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
      alert("Erreur lors de l'analyse. Veuillez réessayer.");
    } finally {
      setLoading(false);
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
    // 1) Set cvText with extracted content
    setCvText(text);
    console.log('CV chargé pour: nouveau fichier —', 'longueur:', text.length);
    // 2) Then reset everything else
    setTargetJob("");
    setJobDescription("");
    setIndustry("");
    setCustomIndustry("");
    setResults(null);
    setRewrittenCV("");
    setCoverLetter("");
    setIsPaid(false);
    setCurrentAnalysisId(null);
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
