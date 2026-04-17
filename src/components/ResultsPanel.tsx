import { useState, useEffect } from "react";
import { Target, Share2, Mail, Loader2, Sparkles } from "lucide-react";
import { type AnalysisResult, generateCoverLetter, rewriteCV } from "@/lib/analysis";
import CVPreview from "./CVPreview";
import CoverLetterPreview from "./CoverLetterPreview";
import SectionScores from "./SectionScores";

import { useRegion } from "@/contexts/RegionContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface ContextualQuestion {
  id: string;
  priorite: number;
  lacune_ciblee: string;
  question: string;
  type: "text" | "textarea" | "select";
  placeholder: string;
  obligatoire: boolean;
  options?: string[];
}

interface ResultsPanelProps {
  results: AnalysisResult;
  isPaid: boolean;
  rewrittenCV: string;
  coverLetter?: string;
  cvText: string;
  targetJob: string;
  region: string;
  analysisId?: string | null;
  jobDescription?: string;
  onRewrittenCVChange?: (cv: string) => void;
  onCoverLetterChange?: (letter: string) => void;
}

const ScoreCircle = ({ score }: { score: number }) => {
  const [offset, setOffset] = useState(364.4);
  useEffect(() => {
    const timer = setTimeout(() => {
      setOffset(364.4 - (364.4 * score) / 100);
    }, 100);
    return () => clearTimeout(timer);
  }, [score]);

  return (
    <div className="text-center">
      <div className="relative inline-flex items-center justify-center">
        <svg className="w-32 h-32 transform -rotate-90">
          <circle cx="64" cy="64" r="58" strokeWidth="8" fill="transparent" className="stroke-secondary" />
          <circle cx="64" cy="64" r="58" strokeWidth="8" fill="transparent" strokeDasharray="364.4" strokeDashoffset={offset} className="stroke-primary transition-all duration-1000 ease-out" strokeLinecap="round" />
        </svg>
        <span className="absolute text-3xl font-bold text-foreground">{score}</span>
      </div>
      <p className="mt-4 font-bold text-muted-foreground uppercase tracking-widest text-xs">Score ATS Global</p>
    </div>
  );
};

const ScoreBar = ({ label, value, max }: { label: string; value: number; max: number }) => (
  <div>
    <div className="flex justify-between text-sm font-bold mb-1.5 text-foreground">
      <span>{label}</span>
      <span>{value}/{max}</span>
    </div>
    <div className="h-2 bg-secondary rounded-full overflow-hidden">
      <div className="h-full bg-primary transition-all duration-1000 rounded-full" style={{ width: `${(value / max) * 100}%` }} />
    </div>
  </div>
);

const STORAGE_KEY = "scorecv_analysis";

const verifyPaidStatus = async (userId: string, analysisId?: string | null): Promise<boolean> => {
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

const ResultsPanel = ({
  results, isPaid, rewrittenCV: initialRewrite, coverLetter: initialCoverLetter,
  cvText, targetJob, region, analysisId, jobDescription,
  onRewrittenCVChange, onCoverLetterChange,
}: ResultsPanelProps) => {
  const { currency, prices } = useRegion();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rewrittenCV, setRewrittenCV] = useState(initialRewrite);
  const [coverLetter, setCoverLetter] = useState(initialCoverLetter || "");
  const [loadingRewrite, setLoadingRewrite] = useState(false);
  const [loadingLetter, setLoadingLetter] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [shareEmail, setShareEmail] = useState("");
  const [showPaymentOptions, setShowPaymentOptions] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewDone, setReviewDone] = useState(false);
  const [inlineAnswers, setInlineAnswers] = useState<Record<string, string>>({});
  const [contextualQuestions, setContextualQuestions] = useState<ContextualQuestion[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [questionsLoaded, setQuestionsLoaded] = useState(false);
  const [questionsLoadingLong, setQuestionsLoadingLong] = useState(false);

  // Affiche le lien de fallback si le chargement dépasse 15s
  useEffect(() => {
    if (!questionsLoading) {
      setQuestionsLoadingLong(false);
      return;
    }
    const t = setTimeout(() => setQuestionsLoadingLong(true), 15000);
    return () => clearTimeout(t);
  }, [questionsLoading]);

  const scrollToGenerateButton = () => {
    document.getElementById("generate-cv-button")?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  // Vérification serveur au montage pour contenu payant existant
  useEffect(() => {
    const verifyAndSetContent = async () => {
      if (initialRewrite || initialCoverLetter) {
        if (user && analysisId) {
          const serverPaid = await verifyPaidStatus(user.id, analysisId);
          if (serverPaid) {
            if (initialRewrite) setRewrittenCV(initialRewrite);
            if (initialCoverLetter) setCoverLetter(initialCoverLetter);
          } else {
            setRewrittenCV("");
            setCoverLetter("");
          }
        }
      } else {
        setRewrittenCV("");
        setCoverLetter("");
      }
      setLoadingRewrite(false);
      setLoadingLetter(false);
    };
    verifyAndSetContent();
  }, [initialRewrite, initialCoverLetter, user, analysisId]);

  // Réinitialiser les états à chaque nouvelle analyse
  useEffect(() => {
    setReviewDone(false);
    setQuestionsLoaded(false);
    setContextualQuestions([]);
    setInlineAnswers({});
    // Note: rewrittenCV est géré par l'useEffect de vérification ci-dessus
    // qui dépend aussi de analysisId
  }, [analysisId]);

  useEffect(() => {
    if (!user || !analysisId) return;
    const checkReview = async () => {
      try {
        const { data } = await supabase.functions.invoke("check-subscription");
        if (data?.reviewRequested) setReviewDone(true);
      } catch { /* ignore */ }
    };
    checkReview();
  }, [user, analysisId]);

  // Appeler l'edge function pour générer les questions contextuelles quand isPaid
  useEffect(() => {
    // DEBUG: À retirer après validation du fix
    console.log("[questions useEffect]", { isPaid, questionsLoaded, analysisId });

    if (!isPaid || questionsLoaded) return;

    console.log("[questions useEffect] Fetching questions...");
    const fetchQuestions = async () => {
      setQuestionsLoading(true);
      try {
        // Construire la liste des problèmes à partir du rapport
        const problemsList = [
          ...results.checklist
            .filter(c => c.status === "fail" || c.status === "warn")
            .map(c => `- ${c.label}: ${c.detail}`),
          ...results.suggestions.map(s => `- ${s.title}: ${s.text}`),
        ].join("\n");

        const { data, error } = await supabase.functions.invoke("generate-questions", {
          body: {
            cv_text: cvText,
            score: results.score,
            score_format: results.scoreDetails.format,
            score_mots_cles: results.scoreDetails.keywords,
            score_contenu: results.scoreDetails.experience,
            score_lisibilite: results.scoreDetails.readability,
            problems_list: problemsList,
            job_offer: jobDescription || null,
          },
        });

        if (error) {
          console.error("[generate-questions] Error:", error);
          setContextualQuestions([]);
        } else {
          setContextualQuestions(data?.questions || []);
        }
      } catch (err) {
        console.error("[generate-questions] Exception:", err);
        setContextualQuestions([]);
      } finally {
        setQuestionsLoading(false);
        setQuestionsLoaded(true);
      }
    };

    fetchQuestions();
  }, [isPaid, questionsLoaded, cvText, results, jobDescription]);

  const handleGenerateCV = async () => {
    if (!user) { toast.error("Connectez-vous pour accéder à cette fonctionnalité."); return; }
    const serverPaid = await verifyPaidStatus(user.id, analysisId);
    if (!serverPaid) { toast.error("Veuillez débloquer le rapport complet pour générer votre CV optimisé."); return; }
    setLoadingRewrite(true);
    console.log('CV utilisé pour réécriture — longueur:', cvText.length);
    try {
      const text = await rewriteCV(cvText, targetJob, region, results.keywordsMissing, inlineAnswers);
      setRewrittenCV(text);
      onRewrittenCVChange?.(text);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erreur lors de la génération du CV";
      toast.error(errorMessage);
    }
    setLoadingRewrite(false);
  };

  const handleGenerateLetter = async () => {
    if (!user) { toast.error("Connectez-vous pour accéder à cette fonctionnalité."); return; }
    const serverPaid = await verifyPaidStatus(user.id, analysisId);
    if (!serverPaid) { toast.error("Veuillez débloquer le rapport complet pour générer votre lettre."); return; }
    setLoadingLetter(true);
    try {
      const text = await generateCoverLetter(cvText, targetJob, region, jobDescription, inlineAnswers);
      setCoverLetter(text);
      onCoverLetterChange?.(text);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erreur lors de la génération de la lettre";
      toast.error(errorMessage);
    }
    setLoadingLetter(false);
  };

  const handleCheckout = async (productType: "report" | "pro") => {
    if (!user) {
      localStorage.setItem("scorecv_data", JSON.stringify({ cvText, targetJob, jobDescription: "", industry: "", results }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ cvText, targetJob, jobDescription: "", industry: "", results }));
      toast.info("Créez un compte pour obtenir votre rapport complet");
      navigate("/auth");
      return;
    }
    setCheckoutLoading(productType);
    try {
      localStorage.setItem("scorecv_data", JSON.stringify({ cvText, targetJob, jobDescription: "", industry: "", results }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ cvText, targetJob, jobDescription: "", industry: "", results }));
      // Stocker l'analysis_id pour le récupérer après paiement
      if (analysisId) {
        sessionStorage.setItem("scorecv_pending_analysis_id", analysisId);
      }
      // Passer analysisId dans l'URL de success ET dans le body pour les metadata Stripe
      const successUrl = analysisId
        ? `${window.location.origin}/payment-success?product=${productType}&analysis_id=${analysisId}`
        : `${window.location.origin}/payment-success?product=${productType}`;
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { productType, region, analysisId, successUrl, cancelUrl: `${window.location.origin}/#optimiser` },
      });
      if (error || !data?.url) throw new Error("Impossible de créer la session de paiement");
      window.open(data.url, '_blank');
      setCheckoutLoading(null);
    } catch (err) {
      console.error("[Checkout] Error:", err);
      alert("Erreur lors de la redirection vers le paiement.");
      setCheckoutLoading(null);
    }
  };

  const handleReviewCheckout = async () => {
    if (!user) { toast.info("Créez un compte pour commander une relecture"); navigate("/auth"); return; }
    setReviewLoading(true);
    try {
      await supabase.from("review_requests").insert({
        user_id: user.id, user_email: user.email || "",
        user_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "",
        analysis_id: analysisId || null, status: "pending",
      } as any);
      // Stocker l'analysis_id pour le récupérer après paiement
      if (analysisId) {
        sessionStorage.setItem("scorecv_pending_analysis_id", analysisId);
      }
      const successUrl = analysisId
        ? `${window.location.origin}/payment-success?product=review&analysis_id=${analysisId}`
        : `${window.location.origin}/payment-success?product=review`;
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { productType: "review", region, analysisId, successUrl, cancelUrl: `${window.location.origin}/#optimiser` },
      });
      if (error || !data?.url) throw new Error("Impossible de créer la session");
      window.open(data.url, '_blank');
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la redirection vers le paiement.");
    } finally { setReviewLoading(false); }
  };

  const statusColors = { ok: "bg-emerald-50 text-emerald-900", fail: "bg-destructive/10 text-destructive", warn: "bg-amber-50 text-amber-900" };
  const statusIcons = { ok: "✅", fail: "❌", warn: "⚠️" };

  const totalPossibleGain = 100 - results.score;
  const hasJobDescription = !!(jobDescription && jobDescription.length >= 50);
  const matchPct = hasJobDescription ? (results.matchScore ?? null) : null;

  // Top 3 problèmes pour le rapport gratuit
  // Priorité à top_problemes (retourné par Claude), fallback sur checklist filtrée
  const topProblemsFromChecklist = results.checklist
    .filter(c => c.status === "fail" || c.status === "warn")
    .sort((a, b) => {
      if (a.status === "fail" && b.status !== "fail") return -1;
      if (a.status !== "fail" && b.status === "fail") return 1;
      return 0;
    })
    .slice(0, 3);

  const hasTopProblemes = results.top_problemes && results.top_problemes.length > 0;
  const topProblems = hasTopProblemes ? results.top_problemes : topProblemsFromChecklist;

  // Mots-clés manquants pour le rapport gratuit
  // Priorité à mots_cles_manquants_free, fallback sur keywordsMissing
  const hasFreeKeywords = results.mots_cles_manquants_free && results.mots_cles_manquants_free.length > 0;
  const freeKeywords = hasFreeKeywords
    ? results.mots_cles_manquants_free
    : results.keywordsMissing.slice(0, 5).map(k => ({ mot: k, importance: "haute" as const, present_dans_offre: true }));

  // Separate suggestions by category
  const manualSuggestions = results.suggestions.filter(s => s.category === "manual").slice(0, 3);
  const autoSuggestions = results.suggestions.filter(s => s.category === "auto").slice(0, 4);

  // Fallback for old data with ats/human categories
  const fallbackManual = manualSuggestions.length > 0 ? manualSuggestions : results.suggestions.filter(s => s.category === "ats").slice(0, 3);
  const fallbackAuto = autoSuggestions.length > 0 ? autoSuggestions : results.suggestions.filter(s => s.category === "human").slice(0, 4);

  return (
    <div className="mt-12 space-y-8">
      {/* Paid: Score Overview */}
      {isPaid && (
        <div className="space-y-4">
          {matchPct !== null && matchPct > 0 ? (
            <p className="text-xl md:text-2xl font-bold" style={{ color: "#1a365d" }}>
              🎯 Votre profil correspond à {matchPct}% de l'offre — {totalPossibleGain} points peuvent être gagnés
            </p>
          ) : (
            <p className="text-xl md:text-2xl font-bold" style={{ color: "#1a365d" }}>
              📊 Votre CV obtient {results.score}/100 — voici comment progresser vers 80+
            </p>
          )}
        <div className="grid md:grid-cols-3 gap-8 items-center bg-card p-8 rounded-3xl shadow-soft">
          <div className="space-y-4">
            <ScoreCircle score={results.score} />
            {hasJobDescription && results.matchScore !== undefined && results.matchScore > 0 && (
              <div className="text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full">
                  <Target className="w-4 h-4 text-primary" />
                  <span className="text-sm font-bold text-primary">Match Offre : {results.matchScore}%</span>
                </div>
              </div>
            )}
          </div>
          <div className="md:col-span-2 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <ScoreBar label="FORMAT" value={results.scoreDetails.format} max={20} />
              <ScoreBar label="MOTS-CLÉS" value={results.scoreDetails.keywords} max={35} />
              <ScoreBar label="CONTENU" value={results.scoreDetails.experience} max={25} />
              <ScoreBar label="LISIBILITÉ" value={results.scoreDetails.readability} max={20} />
            </div>
          </div>
      </div>
      </div>
      )}

      {/* FREE MODE */}
      {!isPaid && (
        <div className="space-y-6">
          {matchPct !== null && matchPct > 0 ? (
            <p className="text-xl md:text-2xl font-bold" style={{ color: "#1a365d" }}>
              🎯 Votre profil correspond à {matchPct}% de l'offre — {results.score_potentiel ? `score potentiel : ${results.score_potentiel}/100` : `${totalPossibleGain} points peuvent être gagnés`}
            </p>
          ) : (
            <p className="text-xl md:text-2xl font-bold" style={{ color: "#1a365d" }}>
              📊 Votre CV obtient {results.score}/100 {results.score_potentiel ? `→ potentiel ${results.score_potentiel}/100` : "— voici comment progresser vers 80+"}
            </p>
          )}

          {/* Score + bars */}
          <div className="bg-card p-8 rounded-3xl shadow-soft">
            <div className="grid md:grid-cols-3 gap-8 items-center">
              <div className="space-y-4">
                <ScoreCircle score={results.score} />
                {hasJobDescription && results.matchScore !== undefined && results.matchScore > 0 && (
                  <div className="text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full">
                      <Target className="w-4 h-4 text-primary" />
                      <span className="text-sm font-bold text-primary">Match Offre : {results.matchScore}%</span>
                    </div>
                  </div>
                )}
              </div>
              <div className="md:col-span-2 space-y-3">
                <ScoreBar label="FORMAT" value={results.scoreDetails.format} max={20} />
                <ScoreBar label="MOTS-CLÉS" value={results.scoreDetails.keywords} max={35} />
                <ScoreBar label="CONTENU" value={results.scoreDetails.experience} max={25} />
                <ScoreBar label="LISIBILITÉ" value={results.scoreDetails.readability} max={20} />
              </div>
            </div>
          </div>

          {/* Section Scores — detailed criteria */}
          {results.sectionScores && results.sectionScores.length > 0 && (
            <SectionScores sections={results.sectionScores} maxVisible={5} />
          )}

          {/* CTA — Unlock button — immediately after score */}
          {results.message_upsell && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-center">
              <p className="text-sm text-amber-800 font-medium">{results.message_upsell}</p>
            </div>
          )}
          {!showPaymentOptions ? (
            <button
              onClick={() => setShowPaymentOptions(true)}
              className="w-full font-bold hover:opacity-90 transition-all flex items-center justify-center gap-2"
              style={{ padding: "1.4rem 2rem", fontSize: "1.15rem", borderRadius: "12px", background: "#1a365d", color: "#fff" }}
            >
              🔓 Générer votre CV et débloquer le rapport complet — {prices.single}{currency}
            </button>
          ) : (
            <div className="p-6 rounded-3xl border-2 border-primary/30 bg-card">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="p-6 rounded-2xl border border-border bg-background space-y-3">
                  <h4 className="font-bold text-lg text-foreground">1 CV + rapport complet</h4>
                  <div className="text-3xl font-bold text-foreground">
                    {prices.single}<span className="text-lg">{currency}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    CV réécrit · Checklist · Lettre de motivation · Export PDF & Word
                  </p>
                  <button
                    onClick={() => handleCheckout("report")}
                    disabled={checkoutLoading === "report"}
                    className="w-full py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    style={{ background: "#1a365d", color: "#fff" }}
                  >
                    {checkoutLoading === "report" ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Ouverture...</>
                    ) : (
                      `Choisir — ${prices.single}${currency}`
                    )}
                  </button>
                </div>
                <div className="relative p-6 rounded-2xl border-2 border-primary bg-primary/5 space-y-3">
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest whitespace-nowrap">
                    Meilleur choix
                  </span>
                  <h4 className="font-bold text-lg text-foreground">Abonnement Pro</h4>
                  <div className="text-3xl font-bold text-foreground">
                    {prices.pro}<span className="text-lg">{currency}</span>
                    <span className="text-sm text-muted-foreground font-normal">/mois</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    CV réécrit et analyses illimitées · Tout débloqué
                  </p>
                  <button
                    onClick={() => handleCheckout("pro")}
                    disabled={checkoutLoading === "pro"}
                    className="w-full py-4 rounded-xl font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    style={{ background: "#1a365d", color: "#fff", fontSize: "1rem" }}
                  >
                    {checkoutLoading === "pro" ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Ouverture...</>
                    ) : (
                      `S'abonner — ${prices.pro}${currency}/mois`
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Top 3 priority problems */}
          {topProblems.length > 0 && (
            <div className="bg-card p-8 rounded-3xl shadow-soft">
              <h3 className="text-xl font-bold mb-4 text-foreground">🔍 Problèmes prioritaires détectés</h3>
              <div className="space-y-3">
                {hasTopProblemes ? (
                  // Format top_problemes (retourné par Claude)
                  (topProblems as typeof results.top_problemes)!.map((item, i) => (
                    <div key={i} className="flex items-start gap-3" style={{ fontSize: "15px" }}>
                      <span className="mt-0.5">🔴</span>
                      <div>
                        <span className="text-foreground font-medium">{item.titre}</span>
                        <span className="text-foreground"> — {item.detail}</span>
                        {item.impact && <span className="text-destructive ml-1">({item.impact})</span>}
                      </div>
                    </div>
                  ))
                ) : (
                  // Fallback: format checklist
                  (topProblems as typeof topProblemsFromChecklist).map((item, i) => (
                    <div key={i} className="flex items-start gap-3" style={{ fontSize: "15px" }}>
                      <span className="mt-0.5">{item.status === "fail" ? "🔴" : "🟠"}</span>
                      <span className="text-foreground font-medium">{item.label}</span>
                      <span className="text-foreground">— {item.detail}</span>
                    </div>
                  ))
                )}
              </div>
              {/* +N problèmes verrouillés — intégré dans le même encadré */}
              {(() => {
                const allProblems = results.checklist.filter(c => c.status === "fail" || c.status === "warn");
                const realCount = Math.max(allProblems.length - 3, 0);
                const lockedCount = Math.max(realCount, 9);
                const lockedTitles = allProblems.slice(3).map(p => p.label).join(", ");
                return (
                  <div className="mt-4 pt-4 flex items-center gap-3" style={{ borderTop: "1px dashed #cbd5e0" }}>
                    <span style={{ fontSize: "22px", flexShrink: 0 }}>🔒</span>
                    <div>
                      <p className="font-bold" style={{ color: "#1a365d", fontSize: "15px" }}>+{lockedCount} problèmes détectés</p>
                      <p className="text-foreground" style={{ fontSize: "15px" }}>{lockedTitles ? `${lockedTitles}…` : "Analyse complète disponible dans le rapport payant…"}</p>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Taux de rappel estimé */}
          {(() => {
            const s = results.score;
            const rate = s >= 80 ? "~32%" : s >= 60 ? "~14%" : "~5%";
            const rateColor = s >= 80 ? "#16a34a" : s >= 60 ? "#ea580c" : "#dc2626";
            const rateMsg = s >= 80
              ? "Votre CV passe la majorité des filtres ATS. Vous êtes bien positionné pour décrocher des entretiens."
              : s >= 60
              ? "Votre CV passe certains filtres mais se retrouve en bas de pile face aux profils mieux optimisés. Vous êtes visible, mais rarement prioritaire."
              : "Votre CV est filtré par la plupart des logiciels de recrutement avant d'être lu.";
            return (
              <div className="bg-card p-8 shadow-soft flex items-center gap-5" style={{ borderRadius: "16px" }}>
                <div className="flex-shrink-0 text-center">
                  <p className="font-medium text-foreground mb-1" style={{ fontSize: "15px" }}>Taux de rappel estimé</p>
                  <p className="text-3xl font-bold" style={{ color: rateColor }}>{rate}</p>
                </div>
                <div className="flex-shrink-0" style={{ width: "1px", height: "44px", background: "#e8edff" }} />
                <div className="flex-1 min-w-0">
                  <p className="text-foreground" style={{ fontSize: "15px" }}>{rateMsg}</p>
                  <p className="text-foreground mt-1" style={{ fontSize: "15px" }}>
                    Les profils avec un score supérieur à 80 atteignent en moyenne{" "}
                    <span className="font-bold" style={{ color: "#16a34a" }}>~35% de taux de rappel</span>.
                  </p>
                </div>
              </div>
            );
          })()}

          {/* Missing keywords - max 5 */}
          {freeKeywords.length > 0 && (
            <div className="bg-card p-8 rounded-3xl shadow-soft">
              <h3 className="text-xl font-bold mb-4 text-foreground flex items-center gap-2">
                ❌ Mots-clés manquants
              </h3>
              <div className="flex flex-wrap gap-2">
                {freeKeywords.map((kw, i) => (
                  <span key={i} className={`px-3 py-1.5 rounded-full font-bold ${kw.importance === "haute" ? "bg-destructive/10 text-destructive" : "bg-amber-50 text-amber-700"}`} style={{ fontSize: "15px" }}>
                    {kw.mot}
                  </span>
                ))}
                {results.keywordsMissing.length > 5 && (
                  <span className="px-3 py-1.5 rounded-full font-bold bg-secondary text-foreground" style={{ fontSize: "15px" }}>
                    +{results.keywordsMissing.length - 5} autres
                  </span>
                )}
              </div>
              {/* Le saviez-vous */}
              <div style={{ marginTop: "16px", background: "#FFFBE6", border: "1px solid #FDE68A", borderRadius: "10px", padding: "14px 18px" }}>
                <p className="text-foreground" style={{ fontSize: "15px" }}>
                  <strong>💡 Le saviez-vous ?</strong> Les mots-clés manquants sont la première cause de rejet par les logiciels ATS, responsables de 75% des éliminations automatiques. Seul 1 CV sur 4 passe ces filtres.
                </p>
              </div>
            </div>
          )}


        </div>
      )}

      {/* PAID CONTENT */}
      {isPaid && (
        <div className="space-y-12">
          {results.sectionScores && results.sectionScores.length > 0 && (
            <SectionScores sections={results.sectionScores} />
          )}

          {/* Suggestions — 2 categories */}
          <div className="space-y-6">
            {/* Manual: things user must do — hide if empty after filtering */}
            {(() => {
              const validEmails = ["gmail", "icloud"];
              const unprofEmails = ["hotmail", "wanadoo", "orange", "laposte", "yahoo", "free", "sfr", "msn", "live"];
              const filteredManual = fallbackManual.filter(s => {
                const txt = (s.title + " " + s.text).toLowerCase();
                // If it's about email, only keep if truly unprofessional
                if (/email|e-mail|adresse mail/i.test(txt)) {
                  const hasUnprof = unprofEmails.some(e => txt.includes(e));
                  const hasProf = validEmails.some(e => txt.includes(e) && !txt.includes(`remplacer par ${e}`) && !txt.includes(`créer.*${e}`));
                  if (!hasUnprof) return false;
                  if (hasProf) return false;
                }
                return true;
              });
              if (filteredManual.length === 0) return null;
              return (
                <div className="p-6 rounded-3xl" style={{ background: "hsl(30 100% 97%)", border: "1px solid hsl(30 80% 85%)" }}>
                  <h3 className="text-lg font-bold mb-4 text-foreground flex items-center gap-2">
                    ⚡ À faire vous-même
                  </h3>
                  <div className="space-y-2">
                    {filteredManual.map((s, i) => (
                      <div key={i} className="flex items-start gap-3 py-2">
                        <span className="text-amber-600 mt-0.5">⚡</span>
                        <p className="text-sm text-foreground"><span className="font-bold">{s.title}</span> — {s.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Auto: corrected in rewritten CV */}
            {fallbackAuto.length > 0 && (
              <div className="p-6 rounded-3xl" style={{ background: "hsl(210 100% 97%)", border: "1px solid hsl(210 80% 85%)" }}>
                <h3 className="text-lg font-bold mb-4 text-foreground flex items-center gap-2">
                  📈 Corrigé automatiquement dans votre CV réécrit
                </h3>
                <div className="space-y-2">
                  {fallbackAuto.map((s, i) => (
                    <div key={i} className="flex items-start gap-3 py-2">
                      <span className="text-blue-600 mt-0.5">📈</span>
                      <p className="text-sm text-foreground"><span className="font-bold">{s.title}</span> — {s.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Checklist */}
          <div className="bg-card p-8 rounded-3xl shadow-soft">
            <h3 className="text-xl font-bold mb-6 text-foreground">Checklist de conformité</h3>
            <div className="space-y-4">
              {results.checklist.map((item, i) => (
                <div key={i} className={`p-5 rounded-xl ${statusColors[item.status]}`}>
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 text-lg">{statusIcons[item.status]}</span>
                    <div className="flex-1">
                      <div className="text-sm font-bold">{item.label}</div>
                      <div className="text-xs mt-1 opacity-80">{item.detail}</div>
                      {item.correction && item.status !== "ok" && (
                        <div className="mt-2 text-xs bg-white/50 rounded-lg p-3 border border-current/10">
                          <strong>💡 Correction :</strong> {item.correction}
                        </div>
                      )}
                      {item.impact && item.status !== "ok" && (
                        <div className="mt-1 text-xs font-bold opacity-70">📈 Impact estimé : {item.impact}</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Keywords — only missing + suggested */}
          <div className="bg-card p-8 rounded-3xl shadow-soft">
            <h3 className="text-xl font-bold mb-4 text-foreground">Mots-clés</h3>
            {results.keywordsMissing.length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm font-bold text-destructive mb-3 flex items-center gap-2">❌ Manquants</h4>
                <div className="flex flex-wrap gap-2">
                  {results.keywordsMissing.slice(0, 8).map((kw, i) => (
                    <span key={i} className="px-3 py-1.5 rounded-full text-xs font-bold bg-destructive/10 text-destructive">{kw}</span>
                  ))}
                </div>
              </div>
            )}
            {results.keywordsSuggested.length > 0 && (
              <div>
                <h4 className="text-sm font-bold text-amber-700 mb-3 flex items-center gap-2">💡 Conseillés</h4>
                <div className="flex flex-wrap gap-2">
                  {results.keywordsSuggested.slice(0, 6).map((kw, i) => (
                    <span key={i} className="px-3 py-1.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700">{kw}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Rewritten CV */}
          <div className="bg-card p-8 rounded-3xl shadow-soft">
            <h3 className="text-xl font-bold mb-6 text-foreground">Optimisation IA</h3>
            {loadingRewrite ? (
              <div className="flex items-center justify-center gap-3 py-12 text-primary">
                <Sparkles className="w-5 h-5 animate-pulse" />
                <span className="font-bold">✨ Génération de votre CV optimisé en cours…</span>
              </div>
            ) : rewrittenCV ? (
              <CVPreview cvText={rewrittenCV} onChange={(text) => { setRewrittenCV(text); onRewrittenCVChange?.(text); }} />
            ) : (
              <div className="space-y-6">
                {/* Indicateur de chargement (même style que la génération du rapport gratuit) */}
                {questionsLoading && (
                  <div className="p-8 rounded-2xl bg-amber-50/50 border border-amber-200 text-center space-y-4">
                    <Loader2 className="w-10 h-10 mx-auto animate-spin text-primary" />
                    <p className="text-primary font-medium text-sm">
                      Personnalisation des questions en cours...
                    </p>
                    {questionsLoadingLong && (
                      <p className="text-xs text-muted-foreground">
                        <button
                          type="button"
                          onClick={scrollToGenerateButton}
                          className="underline hover:text-primary transition-colors"
                        >
                          Vous pouvez générer le CV directement sans questions.
                        </button>
                      </p>
                    )}
                  </div>
                )}

                {/* Questions contextuelles générées par l'IA */}
                {!questionsLoading && contextualQuestions.length > 0 && (
                  <div className="p-6 rounded-2xl bg-amber-50/50 border border-amber-200">
                    <h4 className="text-base font-bold text-foreground mb-1">✏️ Quelques précisions pour personnaliser votre CV</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      Répondez à ces questions pour un CV plus pertinent. Vous pouvez laisser vide.
                    </p>
                    <div className="space-y-4">
                      {contextualQuestions.map((q) => (
                        <div key={q.id}>
                          <label className="block text-sm font-semibold text-foreground mb-1.5">{q.question}</label>
                          {q.type === "select" && q.options ? (
                            <select
                              value={inlineAnswers[q.id] || ""}
                              onChange={(e) => setInlineAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                              className="w-full p-3 bg-white rounded-xl text-sm text-foreground focus:ring-2 focus:ring-primary focus:outline-none border border-border"
                            >
                              <option value="">Sélectionnez une option</option>
                              {q.options.map((opt, i) => (
                                <option key={i} value={opt}>{opt}</option>
                              ))}
                            </select>
                          ) : q.type === "textarea" ? (
                            <textarea
                              value={inlineAnswers[q.id] || ""}
                              onChange={(e) => setInlineAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                              placeholder={q.placeholder}
                              rows={3}
                              className="w-full p-3 bg-white rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:outline-none border border-border resize-none"
                            />
                          ) : (
                            <input
                              type="text"
                              value={inlineAnswers[q.id] || ""}
                              onChange={(e) => setInlineAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                              placeholder={q.placeholder}
                              className="w-full p-3 bg-white rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:outline-none border border-border"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Bouton Générer CV - apparaît après chargement des questions */}
                {!questionsLoading && (
                  <button onClick={handleGenerateCV} disabled={loadingRewrite}
                    className="w-full font-bold hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-white"
                    style={{ padding: "1.2rem 2rem", fontSize: "1.1rem", borderRadius: "8px", background: "#1a365d" }}>
                    ✨ Générer mon CV optimisé
                  </button>
                )}
              </div>
            )}
          </div>


          {/* Cover Letter */}
          <div className="bg-card p-8 rounded-3xl shadow-soft">
            <h3 className="text-xl font-bold mb-6 text-foreground">Lettre de motivation</h3>
            {coverLetter ? (
              <CoverLetterPreview letter={coverLetter} onChange={(text) => { setCoverLetter(text); onCoverLetterChange?.(text); }} />
            ) : (
              <button onClick={handleGenerateLetter} disabled={loadingLetter}
                className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:opacity-90 transition-all disabled:opacity-50">
                {loadingLetter ? "Génération en cours..." : "Générer ma lettre"}
              </button>
            )}
          </div>

          {/* Share Report */}
          <div className="bg-card p-8 rounded-3xl shadow-soft">
            <h3 className="text-xl font-bold mb-4 text-foreground flex items-center gap-2">
              <Share2 className="w-5 h-5 text-primary" /> Partager le rapport
            </h3>
            {shareUrl ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Lien valide 30 jours :</p>
                <div className="flex gap-2">
                  <input readOnly value={shareUrl} className="flex-1 p-3 bg-secondary rounded-xl text-sm text-foreground" onClick={(e) => (e.target as HTMLInputElement).select()} />
                  <button onClick={() => { navigator.clipboard.writeText(shareUrl); toast.success("Lien copié !"); }}
                    className="px-4 py-3 bg-primary text-primary-foreground rounded-xl font-bold text-sm">Copier</button>
                </div>
                <div className="flex gap-2 items-center">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <input type="email" value={shareEmail} onChange={(e) => setShareEmail(e.target.value)} placeholder="Envoyer par email..."
                    className="flex-1 p-3 bg-secondary rounded-xl text-sm text-foreground placeholder:text-muted-foreground" />
                  <button onClick={() => { if (shareEmail) { window.open(`mailto:${shareEmail}?subject=Mon rapport ScoreCV&body=Consultez mon rapport : ${encodeURIComponent(shareUrl)}`); toast.success("Ouverture du client email..."); } }}
                    disabled={!shareEmail} className="px-4 py-3 bg-foreground text-background rounded-xl font-bold text-sm disabled:opacity-50">Envoyer</button>
                </div>
              </div>
            ) : (
              <button onClick={async () => {
                setShareLoading(true);
                try {
                  const { data, error } = await supabase.from("shared_reports").insert({
                    target_job: targetJob, score: results.score, match_score: results.matchScore || null,
                    results: results as any, rewritten_cv: rewrittenCV || null, cover_letter: coverLetter || null,
                  }).select("id").single();
                  if (error) throw error;
                  setShareUrl(`${window.location.origin}/rapport/${data.id}`);
                  toast.success("Lien de partage créé !");
                } catch (err) { console.error(err); toast.error("Erreur lors de la création du lien."); } finally { setShareLoading(false); }
              }} disabled={shareLoading}
                className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:opacity-90 transition-all disabled:opacity-50 flex items-center gap-2">
                {shareLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
                {shareLoading ? "Création..." : "Créer un lien de partage"}
              </button>
            )}
          </div>

          {/* Human Review */}
          <div className="bg-secondary p-8 rounded-3xl shadow-soft">
            <h3 className="text-xl font-bold mb-2 text-foreground">Relecture par un expert humain</h3>
            <p className="text-muted-foreground text-sm mb-6">
              CV + lettre relus par un expert. Rapport PDF personnalisé sous 24h ouvrées. {prices.human}{currency}.
            </p>
            {reviewDone ? (
              <div className="p-4 bg-emerald-50 rounded-xl text-emerald-800 font-bold text-sm text-center">
                ✓ Relecture commandée — réponse sous 24h ouvrées
              </div>
            ) : (
              <button onClick={handleReviewCheckout} disabled={reviewLoading}
                className="w-full py-3 bg-foreground text-background rounded-xl font-bold hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {reviewLoading ? (<><Loader2 className="w-4 h-4 animate-spin" /> Ouverture...</>) : `Commander — ${prices.human}${currency}`}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ResultsPanel;
