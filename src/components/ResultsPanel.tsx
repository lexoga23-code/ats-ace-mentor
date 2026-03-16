import { useState, useEffect } from "react";
import { AlertCircle, Tag, Lock } from "lucide-react";
import { type AnalysisResult, generateCoverLetter, rewriteCV } from "@/lib/analysis";
import CVPreview from "./CVPreview";
import { useRegion } from "@/contexts/RegionContext";
import { supabase } from "@/integrations/supabase/client";

interface ResultsPanelProps {
  results: AnalysisResult;
  isPaid: boolean;
  rewrittenCV: string;
  cvText: string;
  targetJob: string;
  region: string;
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
          <circle
            cx="64" cy="64" r="58" strokeWidth="8" fill="transparent"
            strokeDasharray="364.4"
            strokeDashoffset={offset}
            className="stroke-primary transition-all duration-1000 ease-out"
            strokeLinecap="round"
          />
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
      <div
        className="h-full bg-primary transition-all duration-1000 rounded-full"
        style={{ width: `${(value / max) * 100}%` }}
      />
    </div>
  </div>
);

const ResultsPanel = ({ results, isPaid, rewrittenCV: initialRewrite, cvText, targetJob, region }: ResultsPanelProps) => {
  const { currency, prices } = useRegion();
  const [rewrittenCV, setRewrittenCV] = useState(initialRewrite);
  const [coverLetter, setCoverLetter] = useState("");
  const [loadingRewrite, setLoadingRewrite] = useState(false);
  const [loadingLetter, setLoadingLetter] = useState(false);

  useEffect(() => {
    setRewrittenCV(initialRewrite);
  }, [initialRewrite]);

  const handleGenerateCV = async () => {
    setLoadingRewrite(true);
    try {
      const text = await rewriteCV(cvText, targetJob, region, results.keywordsMissing);
      setRewrittenCV(text);
    } catch { alert("Erreur. Réessayez."); }
    setLoadingRewrite(false);
  };

  const handleGenerateLetter = async () => {
    setLoadingLetter(true);
    try {
      const text = await generateCoverLetter(cvText, targetJob, region);
      setCoverLetter(text);
    } catch { alert("Erreur. Réessayez."); }
    setLoadingLetter(false);
  };

  const statusColors = {
    ok: "bg-emerald-50 text-emerald-900",
    fail: "bg-destructive/10 text-destructive",
    warn: "bg-amber-50 text-amber-900",
  };

  const statusIcons = { ok: "✅", fail: "❌", warn: "⚠️" };

  return (
    <div className="mt-12 space-y-8">
      {/* Score Overview */}
      <div className="grid md:grid-cols-3 gap-8 items-center bg-card p-8 rounded-3xl shadow-soft">
        <ScoreCircle score={results.score} />
        <div className="md:col-span-2 space-y-4">
          <div className="p-4 bg-primary/10 rounded-xl text-primary font-medium text-sm">
            {results.verdict}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <ScoreBar label="FORMAT" value={results.scoreDetails.format} max={20} />
            <ScoreBar label="MOTS-CLÉS" value={results.scoreDetails.keywords} max={35} />
            <ScoreBar label="CONTENU" value={results.scoreDetails.experience} max={25} />
            <ScoreBar label="LISIBILITÉ" value={results.scoreDetails.readability} max={20} />
          </div>
        </div>
      </div>

      {/* Paywall CTA — between scores and problems */}
      {!isPaid && (
        <div className="p-6 rounded-2xl border border-primary/20 bg-primary/5 flex flex-col sm:flex-row items-center gap-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Lock className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h4 className="font-bold text-foreground text-sm">Débloquez votre rapport complet</h4>
            <p className="text-muted-foreground text-xs mt-1">
              Réécriture IA, checklist 10 critères, lettre de motivation et export PDF/DOCX.
            </p>
          </div>
          <a
            href={STRIPE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:opacity-90 transition-all whitespace-nowrap"
          >
            Débloquer — {prices.single}{currency}
          </a>
        </div>
      )}

      {/* Free: Problems & Keywords */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-card p-6 rounded-2xl shadow-soft">
          <h4 className="font-bold mb-4 flex items-center gap-2 text-foreground">
            <AlertCircle className="text-destructive w-5 h-5" /> Problèmes prioritaires
          </h4>
          <ul className="space-y-3 text-sm text-muted-foreground">
            {results.suggestions.slice(0, 3).map((s, i) => (
              <li key={i}>• <strong className="text-foreground">{s.title}</strong>: {s.text}</li>
            ))}
          </ul>
        </div>
        <div className="bg-card p-6 rounded-2xl shadow-soft">
          <h4 className="font-bold mb-4 flex items-center gap-2 text-foreground">
            <Tag className="text-amber-500 w-5 h-5" /> Mots-clés manquants
          </h4>
          <div className="flex flex-wrap gap-2">
            {results.keywordsMissing.slice(0, 5).map((k, i) => (
              <span key={i} className="px-3 py-1 bg-destructive/10 text-destructive rounded-full text-xs font-bold">{k}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Paid Content */}
      {isPaid && (
        <div className="space-y-12">
          {/* Checklist */}
          <div className="bg-card p-8 rounded-3xl shadow-soft">
            <h3 className="text-xl font-bold mb-6 text-foreground">Checklist de conformité</h3>
            <div className="grid md:grid-cols-2 gap-4">
              {results.checklist.map((item, i) => (
                <div key={i} className={`flex items-start gap-3 p-3 rounded-xl ${statusColors[item.status]}`}>
                  <span className="mt-0.5">{statusIcons[item.status]}</span>
                  <div>
                    <div className="text-sm font-bold">{item.label}</div>
                    <div className="text-xs opacity-70">{item.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* All Keywords */}
          <div className="bg-card p-8 rounded-3xl shadow-soft">
            <h3 className="text-xl font-bold mb-6 text-foreground">Analyse des mots-clés</h3>
            <div className="space-y-4">
              <div>
                <p className="label-ui mb-2">Présents</p>
                <div className="flex flex-wrap gap-2">
                  {results.keywordsFound.map((k, i) => (
                    <span key={i} className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold">{k}</span>
                  ))}
                </div>
              </div>
              <div>
                <p className="label-ui mb-2">Manquants</p>
                <div className="flex flex-wrap gap-2">
                  {results.keywordsMissing.map((k, i) => (
                    <span key={i} className="px-3 py-1 bg-destructive/10 text-destructive rounded-full text-xs font-bold">{k}</span>
                  ))}
                </div>
              </div>
              <div>
                <p className="label-ui mb-2">Suggérés</p>
                <div className="flex flex-wrap gap-2">
                  {results.keywordsSuggested.map((k, i) => (
                    <span key={i} className="px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-bold">{k}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Suggestions by priority */}
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
                  </div>
                );
              })}
            </div>
            {!rewrittenCV && (
              <button
                onClick={handleGenerateCV}
                disabled={loadingRewrite}
                className="mt-6 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:opacity-90 transition-all disabled:opacity-50"
              >
                {loadingRewrite ? "Génération en cours..." : "Générer mon CV optimisé →"}
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
              <textarea
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
                className="w-full h-72 p-6 bg-secondary border-none rounded-2xl text-sm leading-relaxed focus:ring-2 focus:ring-primary focus:outline-none text-foreground resize-none"
              />
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

          {/* Human Review Upsell */}
          <div className="bg-surface-warm p-8 rounded-3xl shadow-soft">
            <h3 className="text-xl font-bold mb-2 text-foreground">Relecture par un expert humain</h3>
            <p className="text-muted-foreground text-sm mb-6">
              CV + lettre relus par un expert. Rapport PDF personnalisé sous 24h ouvrées. {prices.human}{currency}.
            </p>
            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); alert("Demande envoyée à contact.scorecv@gmail.com"); }}>
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
