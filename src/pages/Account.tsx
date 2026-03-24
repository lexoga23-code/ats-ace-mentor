import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, LogOut, FileText, Clock, Plus, Eye, Loader2, CreditCard } from "lucide-react";
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
  const [isPro, setIsPro] = useState(false);
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [subLoading, setSubLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      // Fetch analyses
      const { data } = await supabase
        .from("user_analyses")
        .select("id, target_job, score, match_score, is_paid, created_at")
        .order("created_at", { ascending: false })
        .limit(20);
      setAnalyses((data as AnalysisEntry[]) || []);
      setLoading(false);
    };

    const checkSubscription = async () => {
      try {
        const { data } = await supabase.functions.invoke("check-subscription");
        if (data) {
          setIsPro(data.isPro || false);
          setSubscriptionEnd(data.subscriptionEnd || null);
        }
      } catch (err) {
        console.error("Failed to check subscription:", err);
      } finally {
        setSubLoading(false);
      }
    };

    fetchData();
    checkSubscription();
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    toast.success("Déconnexion réussie");
    navigate("/");
  };

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error || !data?.url) throw new Error("Erreur");
      window.open(data.url, "_blank");
    } catch (err) {
      toast.error("Impossible d'ouvrir le portail de gestion.");
    } finally {
      setPortalLoading(false);
    }
  };

  const handleViewLastReport = () => {
    localStorage.setItem("scorecv_restore_report", "true");
    navigate("/");
  };

  if (authLoading || !user) return null;

  const hasPaidReport = analyses.some((a) => a.is_paid);

  return (
    <div className="min-h-screen bg-background px-6 py-12">
      <div className="max-w-3xl mx-auto space-y-8">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Retour
        </button>

        {/* Profile Card */}
        <div className="bg-card p-8 rounded-3xl shadow-soft">
          <h1 className="text-2xl font-bold text-foreground mb-2">Mon compte</h1>
          <p className="text-muted-foreground text-sm">{user.email}</p>
          <div className="mt-4 flex gap-3 flex-wrap">
            {isPro && (
              <span className="inline-flex items-center px-3 py-1 bg-primary/10 rounded-full text-sm font-medium text-primary">
                ⭐ Abonnement Pro actif
              </span>
            )}
            {hasPaidReport && !isPro && (
              <span className="inline-flex items-center px-3 py-1 bg-primary/10 rounded-full text-sm font-medium text-primary">
                ✓ Rapport acheté
              </span>
            )}
            {!hasPaidReport && !isPro && (
              <span className="inline-flex items-center px-3 py-1 bg-secondary rounded-full text-sm font-medium text-muted-foreground">
                Gratuit
              </span>
            )}
          </div>
        </div>

        {/* Subscription Management */}
        {!subLoading && (
          <div className="bg-card p-8 rounded-3xl shadow-soft">
            <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" /> Abonnement
            </h2>
            {isPro ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                  <p className="font-bold text-foreground">Plan Pro — actif</p>
                  {subscriptionEnd && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Prochain renouvellement : {new Date(subscriptionEnd).toLocaleDateString("fr-FR")}
                    </p>
                  )}
                </div>
                <button
                  onClick={handleManageSubscription}
                  disabled={portalLoading}
                  className="w-full py-3 bg-foreground text-background rounded-xl font-bold hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {portalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Gérer mon abonnement
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Vous n'avez pas d'abonnement Pro actif.
                </p>
                <button
                  onClick={() => navigate("/#tarifs")}
                  className="py-3 px-6 bg-primary text-primary-foreground rounded-xl font-bold hover:opacity-90 transition-all"
                >
                  Voir les offres Pro
                </button>
              </div>
            )}
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={handleViewLastReport}
            className="flex items-center justify-center gap-2 p-4 bg-card rounded-2xl shadow-soft text-sm font-bold text-foreground hover:bg-secondary transition-all"
          >
            <Eye className="w-4 h-4 text-primary" /> Revoir mon rapport
          </button>
          <button
            onClick={() => navigate("/")}
            className="flex items-center justify-center gap-2 p-4 bg-primary text-primary-foreground rounded-2xl text-sm font-bold hover:opacity-90 transition-all"
          >
            <Plus className="w-4 h-4" /> Nouvelle analyse
          </button>
        </div>

        {/* Analysis History */}
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
                <div key={a.id} className="flex items-center justify-between p-4 rounded-xl bg-secondary">
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

        {/* Sign Out */}
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
