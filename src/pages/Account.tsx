import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, LogOut, FileText, Clock } from "lucide-react";
import { toast } from "sonner";

interface AnalysisEntry {
  id: string;
  target_job: string;
  score: number;
  match_score: number | null;
  is_paid: boolean;
  created_at: string;
}

const Account = () => {
  const { user, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [analyses, setAnalyses] = useState<AnalysisEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    const fetchAnalyses = async () => {
      const { data } = await supabase
        .from("user_analyses")
        .select("id, target_job, score, match_score, is_paid, created_at")
        .order("created_at", { ascending: false })
        .limit(20);
      setAnalyses((data as AnalysisEntry[]) || []);
      setLoading(false);
    };
    fetchAnalyses();
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    toast.success("Déconnexion réussie");
    navigate("/");
  };

  if (authLoading || !user) return null;

  return (
    <div className="min-h-screen bg-background px-6 py-12">
      <div className="max-w-3xl mx-auto space-y-8">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Retour
        </button>

        <div className="bg-card p-8 rounded-3xl shadow-soft">
          <h1 className="text-2xl font-bold text-foreground mb-2">Mon compte</h1>
          <p className="text-muted-foreground text-sm">{user.email}</p>
          <div className="mt-4 flex gap-3">
            <span className="inline-flex items-center px-3 py-1 bg-primary/10 rounded-full text-sm font-medium text-primary">
              {analyses.some((a) => a.is_paid) ? "Premium" : "Gratuit"}
            </span>
          </div>
        </div>

        <div className="bg-card p-8 rounded-3xl shadow-soft">
          <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" /> Historique des analyses
          </h2>
          {loading ? (
            <p className="text-muted-foreground text-sm">Chargement...</p>
          ) : analyses.length === 0 ? (
            <p className="text-muted-foreground text-sm">Aucune analyse pour le moment.</p>
          ) : (
            <div className="space-y-3">
              {analyses.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between p-4 rounded-xl bg-secondary"
                >
                  <div>
                    <p className="font-medium text-foreground text-sm">{a.target_job}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(a.created_at).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-foreground">{a.score}/100</span>
                    {a.is_paid && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                        Complet
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 text-sm text-destructive hover:underline"
        >
          <LogOut className="w-4 h-4" /> Se déconnecter
        </button>
      </div>
    </div>
  );
};

export default Account;
