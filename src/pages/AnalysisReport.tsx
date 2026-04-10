import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { RegionProvider } from "@/contexts/RegionContext";
import { supabase } from "@/integrations/supabase/client";
import { type AnalysisResult } from "@/lib/analysis";
import ResultsPanel from "@/components/ResultsPanel";
import Navbar from "@/components/Navbar";
import { ArrowLeft } from "lucide-react";

interface AnalysisData {
  id: string;
  cv_text: string;
  target_job: string;
  job_description: string | null;
  industry: string | null;
  results: AnalysisResult;
  is_paid: boolean;
  rewritten_cv: string | null;
  cover_letter: string | null;
  score: number;
  match_score: number | null;
  created_at: string;
}

const AnalysisReportInner = () => {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth", { replace: true });
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user || !id) return;

    const fetchAnalysis = async () => {
      const { data, error: err } = await supabase
        .from("user_analyses")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();

      if (err || !data) {
        setError("Rapport non trouvé.");
      } else {
        setAnalysis(data as unknown as AnalysisData);
      }
      setLoading(false);
    };

    fetchAnalysis();
  }, [user, id]);

  if (authLoading || (!user && !error)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center px-6 pt-32">
          <div className="text-center space-y-4">
            <p className="text-xl font-bold text-foreground">😔 {error}</p>
            <button onClick={() => navigate("/compte")} className="text-primary font-bold hover:underline">
              ← Retour à mon compte
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading || !analysis) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-4xl mx-auto px-6 py-12 pt-24">
        <button
          onClick={() => navigate("/compte")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Retour à mon compte
        </button>

        <h1 className="text-2xl font-bold text-foreground mb-2">{analysis.target_job}</h1>
        <p className="text-sm text-muted-foreground mb-8">
          Analysé le{" "}
          {new Date(analysis.created_at).toLocaleDateString("fr-FR", {
            day: "numeric",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>

        <ResultsPanel
          results={analysis.results}
          isPaid={analysis.is_paid}
          rewrittenCV={analysis.rewritten_cv || ""}
          coverLetter={analysis.cover_letter || undefined}
          cvText={analysis.cv_text}
          targetJob={analysis.target_job}
          region="FR"
          analysisId={analysis.id}
          jobDescription={analysis.job_description || undefined}
        />
      </div>
    </div>
  );
};

const AnalysisReport = () => (
  <RegionProvider>
    <AnalysisReportInner />
  </RegionProvider>
);

export default AnalysisReport;
