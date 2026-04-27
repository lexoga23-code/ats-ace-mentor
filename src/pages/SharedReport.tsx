import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { type AnalysisResult } from "@/lib/analysis";
import { DEFAULT_ANALYSIS_MODE, GENERAL_ANALYSIS_TARGET_JOB, type AnalysisMode } from "@/lib/analysisTypes";
import { CheckCircle, AlertTriangle, XCircle, Target, ArrowLeft } from "lucide-react";

interface SharedReport {
  id: string;
  created_at: string;
  expires_at: string;
  target_job: string;
  analysis_mode: AnalysisMode;
  score: number;
  match_score: number | null;
  results: AnalysisResult;
  rewritten_cv: string | null;
  cover_letter: string | null;
}

const ScoreCircle = ({ score }: { score: number }) => {
  return (
    <div className="text-center">
      <div className="relative inline-flex items-center justify-center">
        <svg className="w-28 h-28 transform -rotate-90">
          <circle cx="56" cy="56" r="50" strokeWidth="7" fill="transparent" className="stroke-secondary" />
          <circle cx="56" cy="56" r="50" strokeWidth="7" fill="transparent" strokeDasharray="314" strokeDashoffset={314 - (314 * score) / 100} className="stroke-primary" strokeLinecap="round" />
        </svg>
        <span className="absolute text-2xl font-bold text-foreground">{score}</span>
      </div>
    </div>
  );
};

const statusConfig = {
  ok: { icon: CheckCircle, color: "text-emerald-500", bg: "bg-emerald-50" },
  warn: { icon: AlertTriangle, color: "text-amber-500", bg: "bg-amber-50" },
  fail: { icon: XCircle, color: "text-destructive", bg: "bg-destructive/10" },
};

const SharedReportPage = () => {
  const { id } = useParams<{ id: string }>();
  const [report, setReport] = useState<SharedReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchReport = async () => {
      if (!id) { setError("Lien invalide."); setLoading(false); return; }
      const { data, error: err } = await supabase
        .from("shared_reports")
        .select("*")
        .eq("id", id)
        .single();
      if (err || !data) {
        setError("Ce rapport n'existe pas ou a expiré.");
      } else {
        setReport(data as unknown as SharedReport);
      }
      setLoading(false);
    };
    fetchReport();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="text-center space-y-4">
          <p className="text-xl font-bold text-foreground">😔 {error}</p>
          <Link to="/" className="text-primary font-bold hover:underline">← Retour à ScoreCV</Link>
        </div>
      </div>
    );
  }

  const results = report.results;
  const expiresDate = new Date(report.expires_at).toLocaleDateString("fr-FR", {
    day: "numeric", month: "long", year: "numeric",
  });
  const analysisMode = report.analysis_mode ?? DEFAULT_ANALYSIS_MODE;
  const isTargetedMode = analysisMode === "targeted";
  const reportTitle = analysisMode === "general" ? GENERAL_ANALYSIS_TARGET_JOB : report.target_job;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-6 py-12 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /> ScoreCV
          </Link>
          <p className="text-xs text-muted-foreground">Expire le {expiresDate}</p>
        </div>

        <h1 className="text-3xl font-bold text-foreground">
          Rapport — {reportTitle}
        </h1>

        {/* Score overview */}
        <div className="grid md:grid-cols-3 gap-8 items-center bg-card p-8 rounded-3xl shadow-soft">
          <div className="space-y-3">
            <ScoreCircle score={report.score} />
            {isTargetedMode && report.match_score && (
              <div className="text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-full">
                  <Target className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs font-bold text-primary">Match : {report.match_score}%</span>
                </div>
              </div>
            )}
          </div>
          <div className="md:col-span-2 space-y-3">
            <div className="p-4 bg-primary/10 rounded-xl text-primary font-medium text-sm space-y-1">
              {results.verdict.split("\n").filter(Boolean).map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
          </div>
        </div>

        {/* Section Scores */}
        {results.sectionScores && results.sectionScores.length > 0 && (
          <div className="bg-card p-8 rounded-3xl shadow-soft">
            <h2 className="text-xl font-bold mb-6 text-foreground">Score par section</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {results.sectionScores.map((section) => {
                const config = statusConfig[section.status];
                const Icon = config.icon;
                return (
                  <div key={section.name} className={`p-4 rounded-xl ${config.bg}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Icon className={`w-4 h-4 ${config.color}`} />
                        <span className="text-sm font-bold text-foreground">{section.name}</span>
                      </div>
                      <span className="text-sm font-bold">{section.score}/{section.maxScore}</span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${(section.score / section.maxScore) * 100}%` }} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">{section.feedback}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Checklist */}
        <div className="bg-card p-8 rounded-3xl shadow-soft">
          <h2 className="text-xl font-bold mb-6 text-foreground">Checklist</h2>
          <div className="space-y-3">
            {results.checklist.map((item, i) => (
              <div key={i} className={`p-4 rounded-xl ${item.status === "ok" ? "bg-emerald-50" : item.status === "warn" ? "bg-amber-50" : "bg-destructive/10"}`}>
                <div className="flex items-start gap-3">
                  <span className="text-lg">{item.status === "ok" ? "✅" : item.status === "warn" ? "⚠️" : "❌"}</span>
                  <div>
                    <div className="text-sm font-bold">{item.label}</div>
                    <div className="text-xs mt-1 opacity-80">{item.detail}</div>
                    {item.correction && item.status !== "ok" && (
                      <div className="mt-2 text-xs bg-white/50 rounded-lg p-2">💡 {item.correction}</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Keywords */}
        <div className="bg-card p-8 rounded-3xl shadow-soft">
          <h2 className="text-xl font-bold mb-4 text-foreground">Mots-clés</h2>
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {results.keywordsFound.map((k, i) => (
                <span key={i} className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold">{k}</span>
              ))}
              {results.keywordsMissing.map((k, i) => (
                <span key={i} className="px-3 py-1 bg-destructive/10 text-destructive rounded-full text-xs font-bold">{k}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Rewritten CV */}
        {report.rewritten_cv && (
          <div className="bg-card p-8 rounded-3xl shadow-soft">
            <h2 className="text-xl font-bold mb-4 text-foreground">CV Optimisé</h2>
            <pre className="whitespace-pre-wrap text-sm text-foreground font-sans">{report.rewritten_cv}</pre>
          </div>
        )}

        {/* Cover Letter */}
        {report.cover_letter && (
          <div className="bg-card p-8 rounded-3xl shadow-soft">
            <h2 className="text-xl font-bold mb-4 text-foreground">Lettre de motivation</h2>
            <pre className="whitespace-pre-wrap text-sm text-foreground font-sans">{report.cover_letter}</pre>
          </div>
        )}

        {/* CTA */}
        <div className="text-center py-8">
          <Link
            to="/"
            className="px-8 py-4 bg-primary text-primary-foreground rounded-xl font-bold hover:opacity-90 transition-all inline-block"
          >
            Analyser mon CV →
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SharedReportPage;
