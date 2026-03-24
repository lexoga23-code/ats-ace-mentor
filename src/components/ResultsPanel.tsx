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

interface ResultsPanelProps {
  results: AnalysisResult;
  isPaid: boolean;
  rewrittenCV: string;
  cvText: string;
  targetJob: string;
  region: string;
  analysisId?: string | null;
  jobDescription?: string;
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

/** Verify payment status server-side — checks both isPaid and Pro subscription */
const verifyPaidStatus = async (userId: string): Promise<boolean> => {
  const { data } = await supabase
    .from("user_analyses")
    .select("is_paid")
    .eq("user_id", userId)
    .eq("is_paid", true)
    .order("created_at", { ascending: false })
    .limit(1);
  if (data && data.length > 0) return true;

  try {
    const { data: subData } = await supabase.functions.invoke("check-subscription");
    if (subData?.isPro) return true;
  } catch { /* ignore */ }

  return false;
};

const ResultsPanel = ({ results, isPaid, rewrittenCV: initialRewrite, cvText, targetJob, region, analysisId, jobDescription }: ResultsPanelProps) => {
  const { currency, prices } = useRegion();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rewrittenCV, setRewrittenCV] = useState(initialRewrite);
  const [coverLetter, setCoverLetter] = useState("");
  const [loadingRewrite, setLoadingRewrite] = useState(false);
  const [loadingLetter, setLoadingLetter] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [shareEmail, setShareEmail] = useState("");
  const [showPaymentOptions, setShowPaymentOptions] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewDone, setReviewDone] = useState(false);

  useEffect(() => {
    setRewrittenCV(initialRewrite);
  }, [initialRewrite]);

  // Auto-generate CV when paid and no rewritten CV yet
  useEffect(() => {
    if (isPaid && !rewrittenCV && !loadingRewrite && cvText && targetJob) {
      const autoGenerate = async () => {
        if (!user) return;
        const serverPaid = await verifyPaidStatus(user.id);
        if (!serverPaid) return;
        setLoadingRewrite(true);
        try {
          const text = await rewriteCV(cvText, targetJob, region, results.keywordsMissing);
          setRewrittenCV(text);
        } catch { /* ignore */ }
        setLoadingRewrite(false);
      };
      autoGenerate();
    }
  }, [isPaid]);

  const handleGenerateCV = async () => {
    if (!user) { toast.error("Connectez-vous pour accéder à cette fonctionnalité."); return; }
    const serverPaid = await verifyPaidStatus(user.id);
    if (!serverPaid) {
      toast.error("Veuillez débloquer le rapport complet pour générer votre CV optimisé.");
      return;
    }
    setLoadingRewrite(true);
    try {
      const text = await rewriteCV(cvText, targetJob, region, results.keywordsMissing);
      setRewrittenCV(text);
    } catch { alert("Erreur. Réessayez."); }
    setLoadingRewrite(false);
  };

  const handleGenerateLetter = async () => {
    if (!user) { toast.error("Connectez-vous pour accéder à cette fonctionnalité."); return; }
    const serverPaid = await verifyPaidStatus(user.id);
    if (!serverPaid) {
      toast.error("Veuillez débloquer le rapport complet pour générer votre lettre.");
      return;
    }
    setLoadingLetter(true);
    try {
      const text = await generateCoverLetter(cvText, targetJob, region, jobDescription);
      setCoverLetter(text);
    } catch { alert("Erreur. Réessayez."); }
    setLoadingLetter(false);
  };

  const handleCheckout = async (productType: "report" | "pro") => {
    if (!user) {
      localStorage.setItem("scorecv_data", JSON.stringify({ cvText, targetJob, jobDescription: "", industry: "", results }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ cvText, targetJob, jobDescription: "", industry: "", results }));
      localStorage.setItem("scorecv_pending_checkout", "true");
      toast.info("Créez un compte pour obtenir votre rapport complet");
      navigate("/auth");
      return;
    }

    setCheckoutLoading(productType);
    try {
      localStorage.setItem("scorecv_data", JSON.stringify({ cvText, targetJob, jobDescription: "", industry: "", results }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ cvText, targetJob, jobDescription: "", industry: "", results }));

      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: {
          productType,
          region: region,
          successUrl: `${window.location.origin}/payment-success?product=${productType}`,
          cancelUrl: `${window.location.origin}/#optimiser`,
        },
      });

      if (error || !data?.url) {
        throw new Error("Impossible de créer la session de paiement");
      }

      window.open(data.url, '_blank');
      setCheckoutLoading(null);
    } catch (err) {
      console.error("[Checkout] Error:", err);
      alert("Erreur lors de la redirection vers le paiement.");
      setCheckoutLoading(null);
    }
  };

  const handleReviewCheckout = async () => {
    if (!user) {
      toast.info("Créez un compte pour commander une relecture");
      navigate("/auth");
      return;
    }

    setReviewLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: {
          productType: "review",
          region: region,
          successUrl: `${window.location.origin}/payment-success?product=review`,
          cancelUrl: `${window.location.origin}/#optimiser`,
        },
      });

      if (error || !data?.url) throw new Error("Impossible de créer la session");
      window.open(data.url, '_blank');
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la redirection vers le paiement.");
    } finally {
      setReviewLoading(false);
    }
  };

  const statusColors = {
    ok: "bg-emerald-50 text-emerald-900",
    fail: "bg-destructive/10 text-destructive",
    warn: "bg-amber-50 text-amber-900",
  };
  const statusIcons = { ok: "✅", fail: "❌", warn: "⚠️" };

  const totalPossibleGain = 100 - results.score;
  const matchPct = results.matchScore ?? Math.round(results.score * 0.85);

  // Split suggestions into ATS technical vs human recruiter tips
  const atsProblems = results.suggestions.filter((_, i) => i < 3);
  const humanTips = results.suggestions.filter((_, i) => i >= 3).slice(0, 3);
  // If not enough suggestions for human tips, use the same but with different framing
  const displayHumanTips = humanTips.length > 0 ? humanTips : atsProblems.slice(0, 3);

  return (
    <div className="mt-12 space-y-8">
      {/* Score Overview — only shown for paid users */}
      {isPaid && (
        <div className="grid md:grid-cols-3 gap-8 items-center bg-card p-8 rounded-3xl shadow-soft">
          <div className="space-y-4">
            <ScoreCircle score={results.score} />
            {results.matchScore !== undefined && results.matchScore > 0 && (
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
      )}

      {/* Free: Score + Paywall between score and keywords */}
      {!isPaid && (
        <div className="space-y-6">
          {/* Personalized AI summary */}
          <p className="text-lg font-bold" style={{ color: "#1a365d" }}>
            🎯 Votre profil correspond à {matchPct}% de l'offre — {totalPossibleGain} points peuvent être gagnés en corrigeant les problèmes détectés
          </p>

          {/* Score circle + bars */}
          <div className="bg-card p-8 rounded-3xl shadow-soft space-y-4">
            <div className="grid md:grid-cols-3 gap-8 items-center">
              <div className="space-y-4">
                <ScoreCircle score={results.score} />
                {results.matchScore !== undefined && results.matchScore > 0 && (
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

          {/* CTA — Unlock button (between score and keywords) */}
          {!showPaymentOptions ? (
            <button
              onClick={() => setShowPaymentOptions(true)}
              className="w-full font-bold hover:opacity-90 transition-all flex items-center justify-center gap-2 bg-primary text-primary-foreground"
              style={{ padding: "1.4rem 2rem", fontSize: "1.15rem", borderRadius: "12px" }}
            >
              🔓 Débloquer le rapport complet
            </button>
          ) : (
            <div className="p-6 rounded-3xl border-2 border-primary/30 bg-card">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Option 1 — Single report */}
                <div className="p-6 rounded-2xl border border-border bg-background space-y-3">
                  <h4 className="font-bold text-lg text-foreground">Accès unique</h4>
                  <div className="text-3xl font-bold text-foreground">
                    {prices.single}<span className="text-lg">{currency}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    CV réécrit · Checklist · Lettre · Export PDF & Word
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

                {/* Option 2 — Pro subscription */}
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
                    Analyses illimitées · Tout débloqué · Designs premium
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

          {/* Missing keywords compact box */}
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
            </div>
          )}

          {/* Two columns: ATS problems vs Human tips */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Left: ATS technical problems */}
            <div className="bg-card p-8 rounded-3xl shadow-soft">
              <h3 className="text-lg font-bold mb-4 text-destructive flex items-center gap-2">
                ⚠️ Problèmes techniques ATS
              </h3>
              <p className="text-xs text-muted-foreground mb-3">Ce qui empêche votre CV d'être lu par les logiciels de recrutement</p>
              <div className="space-y-3">
                {atsProblems.map((s, i) => {
                  const impactNum = s.impact?.match(/\d+/)?.[0] || "5";
                  return (
                    <div key={i} className="p-4 rounded-2xl bg-destructive/5 border border-destructive/20">
                      <div className="flex items-start justify-between gap-3 mb-1">
                        <h4 className="font-bold text-destructive text-sm">🔴 {s.title}</h4>
                        <span className="text-destructive font-bold text-sm whitespace-nowrap">−{impactNum} pts</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{s.text}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: Human recruiter tips */}
            <div className="p-8 rounded-3xl" style={{ background: "#F0F7FF", border: "1px solid #2d6a8f" }}>
              <h3 className="text-lg font-bold mb-4 text-foreground flex items-center gap-2">
                💡 Conseils pour convaincre le recruteur
              </h3>
              <p className="text-xs text-muted-foreground mb-3">Ce qui empêche votre CV de convaincre un humain</p>
              <div className="space-y-3">
                {displayHumanTips.map((s, i) => (
                  <div key={i} className="p-4 rounded-2xl bg-white/60">
                    <h4 className="font-bold text-sm text-foreground mb-1">💡 {s.title}</h4>
                    <p className="text-xs text-muted-foreground">{s.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* CV vs Job observations */}
          {results.matchScore !== undefined && results.matchScore > 0 && (
            <div className="bg-card p-8 rounded-3xl shadow-soft">
              <h3 className="text-lg font-bold mb-4 text-foreground">🎯 Votre CV face à cette offre</h3>
              <div className="space-y-3">
                {results.keywordsMissing.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    ⚠️ Il manque {results.keywordsMissing.length} mot{results.keywordsMissing.length > 1 ? "s" : ""}-clé{results.keywordsMissing.length > 1 ? "s" : ""} attendu{results.keywordsMissing.length > 1 ? "s" : ""} par l'offre. Le rapport complet identifie ces mots-clés et les intègre automatiquement dans votre CV réécrit.
                  </p>
                )}
                <p className="text-sm text-muted-foreground">
                  📊 Score de compatibilité : {results.matchScore}% — {results.matchScore >= 70 ? "bon potentiel, mais des ajustements sont possibles" : "des optimisations ciblées peuvent significativement améliorer votre candidature"}.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Paid Content */}
      {isPaid && (
        <div className="space-y-12">
          {/* Section Scores */}
          {results.sectionScores && results.sectionScores.length > 0 && (
            <SectionScores sections={results.sectionScores} />
          )}

          {/* Checklist with detailed corrections */}
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
                <h4 className="text-sm font-bold text-destructive mb-3 flex items-center gap-2">❌ Mots-clés manquants</h4>
                <div className="flex flex-wrap gap-2">
                  {results.keywordsMissing.map((kw, i) => (
                    <span key={i} className="px-3 py-1.5 rounded-full text-xs font-bold bg-destructive/10 text-destructive">{kw}</span>
                  ))}
                </div>
              </div>
            )}
            {results.keywordsSuggested.length > 0 && (
              <div>
                <h4 className="text-sm font-bold text-amber-700 mb-3 flex items-center gap-2">💡 Mots-clés conseillés</h4>
                <div className="flex flex-wrap gap-2">
                  {results.keywordsSuggested.map((kw, i) => (
                    <span key={i} className="px-3 py-1.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700">{kw}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Suggestions */}
          <div className="bg-card p-8 rounded-3xl shadow-soft">
            <h3 className="text-xl font-bold mb-6 text-foreground">Améliorations suggérées</h3>
            <div className="space-y-4">
              {results.suggestions.map((s, i) => {
                const prioColors = {
                  high: "border-l-destructive bg-destructive/5",
                  medium: "border-l-amber-500 bg-amber-50",
                  low: "border-l-primary bg-primary/5",
                };
                return (
                  <div key={i} className={`p-4 rounded-xl border-l-4 ${prioColors[s.priority]}`}>
                    <div className="text-sm font-bold text-foreground">{s.title}</div>
                    <div className="text-xs text-muted-foreground mt-1">{s.text}</div>
                    {s.impact && <div className="text-xs font-bold text-primary mt-1">📈 {s.impact}</div>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Rewritten CV — auto-generated */}
          <div className="bg-card p-8 rounded-3xl shadow-soft">
            <h3 className="text-xl font-bold mb-6 text-foreground">Optimisation IA</h3>
            {loadingRewrite ? (
              <div className="flex items-center justify-center gap-3 py-12 text-primary">
                <Sparkles className="w-5 h-5 animate-pulse" />
                <span className="font-bold">✨ Génération de votre CV optimisé en cours…</span>
              </div>
            ) : rewrittenCV ? (
              <CVPreview cvText={rewrittenCV} onChange={setRewrittenCV} />
            ) : (
              <button
                onClick={handleGenerateCV}
                disabled={loadingRewrite}
                className="w-full font-bold hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-white"
                style={{ padding: "1.2rem 2rem", fontSize: "1.1rem", borderRadius: "8px", background: "#1a365d" }}
              >
                ✨ Générer mon CV optimisé
              </button>
            )}
          </div>

          {/* Cover Letter */}
          <div className="bg-card p-8 rounded-3xl shadow-soft">
            <h3 className="text-xl font-bold mb-6 text-foreground">Lettre de motivation</h3>
            {coverLetter ? (
              <CoverLetterPreview letter={coverLetter} onChange={setCoverLetter} />
            ) : (
              <button
                onClick={handleGenerateLetter}
                disabled={loadingLetter}
                className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:opacity-90 transition-all disabled:opacity-50"
              >
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
                  <input
                    readOnly
                    value={shareUrl}
                    className="flex-1 p-3 bg-secondary rounded-xl text-sm text-foreground"
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                  <button
                    onClick={() => { navigator.clipboard.writeText(shareUrl); toast.success("Lien copié !"); }}
                    className="px-4 py-3 bg-primary text-primary-foreground rounded-xl font-bold text-sm"
                  >
                    Copier
                  </button>
                </div>
                <div className="flex gap-2 items-center">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <input
                    type="email"
                    value={shareEmail}
                    onChange={(e) => setShareEmail(e.target.value)}
                    placeholder="Envoyer par email..."
                    className="flex-1 p-3 bg-secondary rounded-xl text-sm text-foreground placeholder:text-muted-foreground"
                  />
                  <button
                    onClick={() => {
                      if (shareEmail) {
                        window.open(`mailto:${shareEmail}?subject=Mon rapport ScoreCV&body=Consultez mon rapport : ${encodeURIComponent(shareUrl)}`);
                        toast.success("Ouverture du client email...");
                      }
                    }}
                    disabled={!shareEmail}
                    className="px-4 py-3 bg-foreground text-background rounded-xl font-bold text-sm disabled:opacity-50"
                  >
                    Envoyer
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={async () => {
                  setShareLoading(true);
                  try {
                    const { data, error } = await supabase.from("shared_reports").insert({
                      target_job: targetJob,
                      score: results.score,
                      match_score: results.matchScore || null,
                      results: results as any,
                      rewritten_cv: rewrittenCV || null,
                      cover_letter: coverLetter || null,
                    }).select("id").single();
                    if (error) throw error;
                    const url = `${window.location.origin}/rapport/${data.id}`;
                    setShareUrl(url);
                    toast.success("Lien de partage créé !");
                  } catch (err) {
                    console.error(err);
                    toast.error("Erreur lors de la création du lien.");
                  } finally {
                    setShareLoading(false);
                  }
                }}
                disabled={shareLoading}
                className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:opacity-90 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {shareLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
                {shareLoading ? "Création..." : "Créer un lien de partage"}
              </button>
            )}
          </div>

          {/* Human Review — Stripe checkout */}
          <div className="bg-secondary p-8 rounded-3xl shadow-soft">
            <h3 className="text-xl font-bold mb-2 text-foreground">Relecture par un expert humain</h3>
            <p className="text-muted-foreground text-sm mb-6">
              CV + lettre relus par un expert. Rapport PDF personnalisé sous 24h ouvrées. {prices.human}{currency}.
            </p>
            {reviewDone ? (
              <div className="p-4 bg-emerald-50 rounded-xl text-emerald-800 font-bold text-sm text-center">
                ✓ Demande de relecture confirmée — vous recevrez votre rapport sous 24h ouvrées.
              </div>
            ) : (
              <button
                onClick={handleReviewCheckout}
                disabled={reviewLoading}
                className="w-full py-3 bg-foreground text-background rounded-xl font-bold hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {reviewLoading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Ouverture...</>
                ) : (
                  `Commander — ${prices.human}${currency}`
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ResultsPanel;
