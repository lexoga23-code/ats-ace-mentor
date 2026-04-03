import { useState, useEffect } from "react";
import { Target, Share2, Mail, Loader2, Sparkles } from "lucide-react";
import { type AnalysisResult, generateCoverLetter, rewriteCV } from "@/lib/analysis";
import RewriteQuestionsModal from "./RewriteQuestionsModal";
import CVPreview from "./CVPreview";
import CoverLetterPreview from "./CoverLetterPreview";
import SectionScores from "./SectionScores";

import { useRegion } from "@/contexts/RegionContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

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
    <div className="flex justify-between text-xs font-bold mb-1 text-foreground">
      <span>{label}</span>
      <span>{value}/{max}</span>
    </div>
    <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
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

  // Vérifier aussi le statut Pro
  try {
    const { data: subData } = await supabase.functions.invoke("check-subscription");
    if (subData?.isPro) return true;
  } catch { /* ignore */ }
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
  const [showRewriteQuestions, setShowRewriteQuestions] = useState(false);
  const [savedUserAnswers, setSavedUserAnswers] = useState<Record<string, string>>({});

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

  // Réinitialiser reviewDone à chaque nouvelle analyse
  useEffect(() => {
    setReviewDone(false);
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

  // Quand isPaid devient true sans CV généré, afficher la modale de questions
  useEffect(() => {
    if (isPaid && !rewrittenCV && !loadingRewrite && cvText && targetJob && !showRewriteQuestions) {
      // Afficher automatiquement la modale de questions contextuelles
      setShowRewriteQuestions(true);
    }
  }, [isPaid, rewrittenCV, loadingRewrite, cvText, targetJob, showRewriteQuestions]);

  const handleGenerateCV = async (userAnswers?: Record<string, string>) => {
    if (!user) { toast.error("Connectez-vous pour accéder à cette fonctionnalité."); return; }
    const serverPaid = await verifyPaidStatus(user.id, analysisId);
    if (!serverPaid) { toast.error("Veuillez débloquer le rapport complet pour générer votre CV optimisé."); return; }
    if (userAnswers) setSavedUserAnswers(userAnswers);
    setShowRewriteQuestions(false);
    setLoadingRewrite(true);
    console.log('CV utilisé pour réécriture — longueur:', cvText.length);
    try {
      const text = await rewriteCV(cvText, targetJob, region, results.keywordsMissing, userAnswers);
      setRewrittenCV(text);
      onRewrittenCVChange?.(text);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erreur lors de la génération du CV";
      toast.error(errorMessage);
    }
    setLoadingRewrite(false);
  };

  const handleStartGenerateCV = () => {
    setShowRewriteQuestions(true);
  };

  const handleGenerateLetter = async () => {
    if (!user) { toast.error("Connectez-vous pour accéder à cette fonctionnalité."); return; }
    const serverPaid = await verifyPaidStatus(user.id, analysisId);
    if (!serverPaid) { toast.error("Veuillez débloquer le rapport complet pour générer votre lettre."); return; }
    setLoadingLetter(true);
    try {
      const text = await generateCoverLetter(cvText, targetJob, region, jobDescription, savedUserAnswers);
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
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { productType, region, successUrl: `${window.location.origin}/payment-success?product=${productType}`, cancelUrl: `${window.location.origin}/#optimiser` },
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
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { productType: "review", region, successUrl: `${window.location.origin}/payment-success?product=review`, cancelUrl: `${window.location.origin}/#optimiser` },
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

  // Sort problems by priority for free mode - top 3
  const topProblems = results.checklist
    .filter(c => c.status === "fail" || c.status === "warn")
    .sort((a, b) => {
      if (a.status === "fail" && b.status !== "fail") return -1;
      if (a.status !== "fail" && b.status === "fail") return 1;
      return 0;
    })
    .slice(0, 3);

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
            <p className="text-lg font-bold" style={{ color: "#1a365d" }}>
              🎯 Votre profil correspond à {matchPct}% de l'offre — {totalPossibleGain} points peuvent être gagnés
            </p>
          ) : (
            <p className="text-lg font-bold" style={{ color: "#1a365d" }}>
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
            <p className="text-lg font-bold" style={{ color: "#1a365d" }}>
              🎯 Votre profil correspond à {matchPct}% de l'offre — {totalPossibleGain} points peuvent être gagnés
            </p>
          ) : (
            <p className="text-lg font-bold" style={{ color: "#1a365d" }}>
              📊 Votre CV obtient {results.score}/100 — voici comment progresser vers 80+
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

          {/* CTA — Unlock button — immediately after score */}
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
            <div className="bg-card p-6 rounded-3xl shadow-soft">
              <h3 className="text-base font-bold mb-3 text-foreground">🔍 Problèmes prioritaires détectés</h3>
              <div className="space-y-2">
                {topProblems.map((item, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <span className="mt-0.5">{item.status === "fail" ? "🔴" : "🟠"}</span>
                    <span className="text-foreground font-medium">{item.label}</span>
                    <span className="text-muted-foreground">— {item.detail}</span>
                  </div>
                ))}
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
                      <p className="font-bold" style={{ fontSize: "13px", color: "#1a365d" }}>+{lockedCount} problèmes détectés</p>
                      <p style={{ fontSize: "12px", color: "#8899AA" }}>{lockedTitles ? `${lockedTitles}…` : "Analyse complète disponible dans le rapport payant…"}</p>
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
              <div className="bg-card p-5 shadow-soft flex items-center gap-4" style={{ borderRadius: "12px" }}>
                <div className="flex-shrink-0 text-center">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Taux de rappel estimé</p>
                  <p className="text-3xl font-bold" style={{ color: rateColor }}>{rate}</p>
                </div>
                <div className="flex-shrink-0" style={{ width: "1px", height: "44px", background: "#e8edff" }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-muted-foreground">{rateMsg}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Les profils avec un score supérieur à 80 atteignent en moyenne{" "}
                    <span className="font-bold" style={{ color: "#16a34a" }}>~35% de taux de rappel</span>.
                  </p>
                </div>
              </div>
            );
          })()}

          {/* Missing keywords - max 5 */}
          {results.keywordsMissing.length > 0 && (
            <div className="bg-card p-6 rounded-3xl shadow-soft">
              <h3 className="text-base font-bold mb-3 text-foreground flex items-center gap-2">
                ❌ Mots-clés manquants
              </h3>
              <div className="flex flex-wrap gap-2">
                {results.keywordsMissing.slice(0, 5).map((kw, i) => (
                  <span key={i} className="px-3 py-1 rounded-full text-xs font-bold bg-destructive/10 text-destructive">
                    {kw}
                  </span>
                ))}
                {results.keywordsMissing.length > 5 && (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-secondary text-muted-foreground">
                    +{results.keywordsMissing.length - 5} autres
                  </span>
                )}
              </div>
              {/* Le saviez-vous */}
              <div style={{ marginTop: "14px", background: "#FFFBE6", border: "1px solid #FDE68A", borderRadius: "8px", padding: "10px 14px" }}>
                <p style={{ fontSize: "12px", color: "#555" }}>
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
            {/* Manual: things user must do */}
            {fallbackManual.length > 0 && (
              <div className="p-6 rounded-3xl" style={{ background: "hsl(30 100% 97%)", border: "1px solid hsl(30 80% 85%)" }}>
                <h3 className="text-lg font-bold mb-4 text-foreground flex items-center gap-2">
                  ⚡ À faire vous-même
                </h3>
                <div className="space-y-2">
                  {fallbackManual.map((s, i) => (
                    <div key={i} className="flex items-start gap-3 py-2">
                      <span className="text-amber-600 mt-0.5">⚡</span>
                      <p className="text-sm text-foreground"><span className="font-bold">{s.title}</span> — {s.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
              <button onClick={handleStartGenerateCV} disabled={loadingRewrite}
                className="w-full font-bold hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-white"
                style={{ padding: "1.2rem 2rem", fontSize: "1.1rem", borderRadius: "8px", background: "#1a365d" }}>
                ✨ Générer mon CV optimisé
              </button>
            )}
          </div>

          {showRewriteQuestions && (
            <RewriteQuestionsModal
              analysisResult={results}
              cvText={cvText}
              onSubmit={(answers) => handleGenerateCV(answers)}
              onCancel={() => setShowRewriteQuestions(false)}
            />
          )}

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
