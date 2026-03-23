import { useState, useEffect } from "react";
import { Target, Share2, Mail, Loader2 } from "lucide-react";
import { type AnalysisResult, generateCoverLetter, rewriteCV } from "@/lib/analysis";
import CVPreview from "./CVPreview";
import CoverLetterPreview from "./CoverLetterPreview";
import SectionScores from "./SectionScores";

import { useRegion } from "@/contexts/RegionContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { sendReviewRequestEmail } from "@/lib/emailService";

interface ResultsPanelProps {
  results: AnalysisResult;
  isPaid: boolean;
  rewrittenCV: string;
  cvText: string;
  targetJob: string;
  region: string;
  analysisId?: string | null;
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

/** Verify payment status server-side before generating premium content */
const verifyPaidStatus = async (userId: string): Promise<boolean> => {
  const { data } = await supabase
    .from("user_analyses")
    .select("is_paid")
    .eq("user_id", userId)
    .eq("is_paid", true)
    .order("created_at", { ascending: false })
    .limit(1);
  return !!(data && data.length > 0);
};

const ResultsPanel = ({ results, isPaid, rewrittenCV: initialRewrite, cvText, targetJob, region, analysisId }: ResultsPanelProps) => {
  const { currency, prices } = useRegion();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rewrittenCV, setRewrittenCV] = useState(initialRewrite);
  const [coverLetter, setCoverLetter] = useState("");
  const [loadingRewrite, setLoadingRewrite] = useState(false);
  const [loadingLetter, setLoadingLetter] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [shareEmail, setShareEmail] = useState("");

  useEffect(() => {
    setRewrittenCV(initialRewrite);
  }, [initialRewrite]);

  const handleGenerateCV = async () => {
    // Server-side payment check
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
    // Server-side payment check
    if (!user) { toast.error("Connectez-vous pour accéder à cette fonctionnalité."); return; }
    const serverPaid = await verifyPaidStatus(user.id);
    if (!serverPaid) {
      toast.error("Veuillez débloquer le rapport complet pour générer votre lettre.");
      return;
    }
    setLoadingLetter(true);
    try {
      const text = await generateCoverLetter(cvText, targetJob, region);
      setCoverLetter(text);
    } catch { alert("Erreur. Réessayez."); }
    setLoadingLetter(false);
  };

  const handleCheckout = async () => {
    if (!user) {
      localStorage.setItem("scorecv_data", JSON.stringify({ cvText, targetJob, jobDescription: "", industry: "", results }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ cvText, targetJob, jobDescription: "", industry: "", results }));
      localStorage.setItem("scorecv_pending_checkout", "true");
      toast.info("Créez un compte pour obtenir votre rapport complet");
      navigate("/auth");
      return;
    }

    setCheckoutLoading(true);
    try {
      localStorage.setItem("scorecv_data", JSON.stringify({ cvText, targetJob, jobDescription: "", industry: "", results }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ cvText, targetJob, jobDescription: "", industry: "", results }));

      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: {
          email: user.email,
          successUrl: `${window.location.origin}/payment-success`,
          cancelUrl: `${window.location.origin}/#optimiser`,
        },
      });

      if (error || !data?.url) {
        throw new Error("Impossible de créer la session de paiement");
      }

      window.open(data.url, '_blank');
      setCheckoutLoading(false);
    } catch (err) {
      console.error("[Checkout] Error:", err);
      alert("Erreur lors de la redirection vers le paiement.");
      setCheckoutLoading(false);
    }
  };

  const statusColors = {
    ok: "bg-emerald-50 text-emerald-900",
    fail: "bg-destructive/10 text-destructive",
    warn: "bg-amber-50 text-amber-900",
  };
  const statusIcons = { ok: "✅", fail: "❌", warn: "⚠️" };

  // Compute personalized AI summary for free report
  const totalPossibleGain = 100 - results.score;
  const matchPct = results.matchScore ?? Math.round(results.score * 0.85);

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

      {/* Free: Score + Problems side by side + Paywall */}
      {!isPaid && (
        <div className="space-y-6">
          {/* Personalized AI summary */}
          <p className="text-lg font-bold" style={{ color: "#1a365d" }}>
            🎯 Votre profil correspond à {matchPct}% de l'offre — {totalPossibleGain} points peuvent être gagnés en corrigeant les problèmes détectés
          </p>

          {/* Top row: 2 columns */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Left: Score circle + bars */}
            <div className="bg-card p-8 rounded-3xl shadow-soft space-y-4">
              <ScoreCircle score={results.score} />
              {results.matchScore !== undefined && results.matchScore > 0 && (
                <div className="text-center">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full">
                    <Target className="w-4 h-4 text-primary" />
                    <span className="text-sm font-bold text-primary">Match Offre : {results.matchScore}%</span>
                  </div>
                </div>
              )}
              <div className="space-y-3 pt-2">
                <ScoreBar label="FORMAT" value={results.scoreDetails.format} max={20} />
                <ScoreBar label="MOTS-CLÉS" value={results.scoreDetails.keywords} max={35} />
                <ScoreBar label="CONTENU" value={results.scoreDetails.experience} max={25} />
                <ScoreBar label="LISIBILITÉ" value={results.scoreDetails.readability} max={20} />
              </div>
            </div>

            {/* Right: 3 problems */}
            <div className="bg-card p-8 rounded-3xl shadow-soft">
              <h3 className="text-lg font-bold mb-4 text-destructive flex items-center gap-2">
                ⚠️ Votre CV perd des points sur ces {Math.min(results.suggestions.length, 3)} problèmes
              </h3>
              <div className="space-y-3">
                {results.suggestions.slice(0, 3).map((s, i) => {
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
          </div>

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

          {/* Quick AI suggestions box */}
          {results.suggestions.length > 0 && (
            <div className="p-6 rounded-3xl" style={{ background: "#F0F7FF", border: "1px solid #2d6a8f" }}>
              <h3 className="text-base font-bold mb-3 text-foreground flex items-center gap-2">
                💡 Suggestions d'amélioration rapides
              </h3>
              <div className="space-y-2">
                {results.suggestions.slice(0, 3).map((s, i) => (
                  <p key={i} className="text-sm text-foreground">
                    ➤ {s.text}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* CTA block — bigger button */}
          <div className="p-8 rounded-3xl border-2 border-primary/30 bg-primary/5">
            <p className="text-center text-foreground font-bold text-lg mb-1">
              Réécrivez votre CV et obtenez le rapport complet
            </p>
            <p className="text-center text-muted-foreground text-sm mb-6">
              CV réécrit par l'IA · Checklist détaillée · Lettre de motivation · Export PDF & Word
            </p>
            <button
              onClick={handleCheckout}
              disabled={checkoutLoading}
              className="w-full font-bold hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 bg-primary text-primary-foreground"
              style={{ padding: "1.2rem 2rem", fontSize: "1.1rem", borderRadius: "8px" }}
            >
              {checkoutLoading ? "Ouverture..." : `🔓 Débloquer le rapport complet — ${prices.single}${currency}`}
            </button>
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
            {!rewrittenCV && (
              <button
                onClick={handleGenerateCV}
                disabled={loadingRewrite}
                className="mt-6 w-full font-bold hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-white"
                style={{ padding: "1.2rem 2rem", fontSize: "1.1rem", borderRadius: "8px", background: "#1a365d" }}
              >
                {loadingRewrite ? "Génération en cours..." : "✨ Générer mon CV optimisé"}
              </button>
            )}
          </div>

          {/* Rewritten CV */}
          {rewrittenCV && (
            <div className="bg-card p-8 rounded-3xl shadow-soft">
              <h3 className="text-xl font-bold mb-6 text-foreground">Optimisation IA</h3>
              <CVPreview cvText={rewrittenCV} onChange={setRewrittenCV} />
            </div>
          )}

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

          {/* Human Review Upsell */}
          <div className="bg-surface-warm p-8 rounded-3xl shadow-soft">
            <h3 className="text-xl font-bold mb-2 text-foreground">Relecture par un expert humain</h3>
            <p className="text-muted-foreground text-sm mb-6">
              CV + lettre relus par un expert. Rapport PDF personnalisé sous 24h ouvrées. {prices.human}{currency}.
            </p>
            <form className="space-y-4" onSubmit={(e) => {
              e.preventDefault();
              const form = e.target as HTMLFormElement;
              const nameInput = form.elements[0] as HTMLInputElement;
              const emailInput = form.elements[1] as HTMLInputElement;
              sendReviewRequestEmail(nameInput.value, emailInput.value);
              toast.success("Demande envoyée ! Vous recevrez un email de confirmation.");
              form.reset();
            }}>
              <input placeholder="Prénom" className="w-full p-3 bg-card rounded-xl shadow-soft border-none focus:ring-2 focus:ring-primary focus:outline-none text-foreground placeholder:text-muted-foreground" required />
              <input type="email" placeholder="Email" className="w-full p-3 bg-card rounded-xl shadow-soft border-none focus:ring-2 focus:ring-primary focus:outline-none text-foreground placeholder:text-muted-foreground" required />
              <textarea placeholder="Message (optionnel)" className="w-full h-24 p-3 bg-card rounded-xl shadow-soft border-none focus:ring-2 focus:ring-primary focus:outline-none text-foreground placeholder:text-muted-foreground resize-none" />
              <button type="submit" className="w-full py-3 bg-foreground text-background rounded-xl font-bold hover:opacity-90 transition-all">
                Commander — {prices.human}{currency}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResultsPanel;
