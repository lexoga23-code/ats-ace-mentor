import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { RegionProvider, useRegion } from "@/contexts/RegionContext";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, LogOut, FileText, Clock, Plus, Eye, Loader2, CreditCard, ChevronRight, Trash2 } from "lucide-react";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";

interface AnalysisEntry {
  id: string;
  target_job: string;
  score: number;
  match_score: number | null;
  is_paid: boolean;
  created_at: string;
}

const AccountInner = () => {
  const { user, signOut, loading: authLoading } = useAuth();
  const { region, currency, prices } = useRegion();
  const navigate = useNavigate();
  const [analyses, setAnalyses] = useState<AnalysisEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPro, setIsPro] = useState(false);
  const [reviewRequested, setReviewRequested] = useState(false);
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [subLoading, setSubLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      const { data } = await supabase
        .from("user_analyses")
        .select("id, target_job, score, match_score, is_paid, created_at")
        .order("created_at", { ascending: false })
        .limit(20);
      setAnalyses((data as AnalysisEntry[]) || []);
      setLoading(false);
    };

    // Read subscription status directly from DB first for immediate display
    const checkSubscription = async () => {
      try {
        // First, read directly from user_subscriptions table for immediate display
        const { data: dbData } = await supabase
          .from("user_subscriptions")
          .select("is_pro, subscription_end, review_requested")
          .eq("user_id", user.id)
          .maybeSingle();

        if (dbData) {
          setIsPro(dbData.is_pro || false);
          setSubscriptionEnd(dbData.subscription_end || null);
          setReviewRequested(dbData.review_requested || false);
        }
        setSubLoading(false);

        // Then validate with Stripe in background (updates DB if needed)
        const { data } = await supabase.functions.invoke("check-subscription");
        if (data) {
          setIsPro(data.isPro || false);
          setSubscriptionEnd(data.subscriptionEnd || null);
          setReviewRequested(data.reviewRequested || false);
          setCancelAtPeriodEnd(data.cancelAtPeriodEnd || false);
        }
      } catch (err) {
        console.error("Failed to check subscription:", err);
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

  const handleSubscribePro = async () => {
    setCheckoutLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: {
          productType: "pro",
          region,
          successUrl: `${window.location.origin}/payment-success?product=pro`,
          cancelUrl: `${window.location.origin}/compte`,
        },
      });
      if (error || !data?.url) throw new Error("Erreur");
      window.open(data.url, "_blank");
    } catch (err) {
      toast.error("Impossible de lancer le paiement.");
    } finally {
      setCheckoutLoading(false);
    }
  };


  const handleNewAnalysis = () => {
    localStorage.setItem("scorecv_reset", "true");
    navigate("/");
  };

  const handleViewLastReport = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("user_analyses")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1);

    if (!data || data.length === 0) {
      toast.info("Vous n'avez pas encore effectué d'analyse — lancez votre première analyse.");
      return;
    }

    localStorage.setItem("scorecv_restore_analysis", JSON.stringify({
      id: data[0].id,
      cvText: data[0].cv_text,
      targetJob: data[0].target_job,
      jobDescription: data[0].job_description || "",
      industry: data[0].industry || "",
      results: data[0].results,
      isPaid: data[0].is_paid,
      rewrittenCV: data[0].rewritten_cv || "",
      coverLetter: data[0].cover_letter || "",
      score: data[0].score,
    }));
    navigate("/#optimiser");
  };

  const handleViewAnalysis = (analysisId: string) => {
    navigate(`/analyse/${analysisId}`);
  };

  const handleDeleteAnalysis = async (e: React.MouseEvent, analysisId: string) => {
    e.stopPropagation();
    if (!confirm("Supprimer cette analyse ?")) return;
    const { error } = await supabase.from("user_analyses").delete().eq("id", analysisId);
    if (error) {
      toast.error("Erreur lors de la suppression.");
    } else {
      setAnalyses((prev) => prev.filter((a) => a.id !== analysisId));
      toast.success("Analyse supprimée.");
    }
  };

  if (authLoading || !user) return null;

  const hasPaidReport = analyses.some((a) => a.is_paid);

  const getScoreColor = (score: number) => {
    if (score >= 75) return "text-emerald-600";
    if (score >= 50) return "text-amber-600";
    return "text-destructive";
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Bug #24: Navbar with region toggle */}
      <Navbar />
      <div className="px-6 py-12 pt-24">
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
              {/* Bug #13: Show review status */}
              {reviewRequested && (
                <span className="inline-flex items-center px-3 py-1 bg-emerald-100 rounded-full text-sm font-medium text-emerald-800">
                  ✓ Relecture commandée — réponse sous 24h ouvrées
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
                  {cancelAtPeriodEnd && subscriptionEnd ? (
                    <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
                      <p className="font-bold text-amber-800">Votre abonnement Pro a été annulé.</p>
                      <p className="text-sm text-amber-700 mt-1">
                        Il reste actif jusqu'au {new Date(subscriptionEnd).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                      </p>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                      <p className="font-bold text-foreground">Plan Pro — actif</p>
                      {subscriptionEnd && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Prochain renouvellement : {new Date(subscriptionEnd).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                        </p>
                      )}
                    </div>
                  )}
                  <button
                    onClick={handleManageSubscription}
                    disabled={portalLoading}
                    className="w-full py-3 bg-foreground text-background rounded-xl font-bold hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {portalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Gérer
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Vous n'avez pas d'abonnement Pro actif.
                  </p>
                  <button
                    onClick={handleSubscribePro}
                    disabled={checkoutLoading}
                    className="py-3 px-6 bg-primary text-primary-foreground rounded-xl font-bold hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {checkoutLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Abonnement Pro — {prices.pro}{currency}/mois
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
              onClick={handleNewAnalysis}
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
                  <button
                    key={a.id}
                    onClick={() => handleViewAnalysis(a.id)}
                    className="w-full flex items-center justify-between p-4 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors text-left group"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground text-sm truncate">{a.target_job}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <Clock className="w-3 h-3" />
                        {new Date(a.created_at).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-lg font-bold ${getScoreColor(a.score)}`}>{a.score}/100</span>
                      {a.is_paid && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                          Complet
                        </span>
                      )}
                      <span className="text-xs text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                        Revoir <ChevronRight className="w-3 h-3" />
                      </span>
                      <button
                        onClick={(e) => handleDeleteAnalysis(e, a.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive p-1"
                        title="Supprimer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </button>
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
    </div>
  );
};

const Account = () => (
  <RegionProvider>
    <AccountInner />
  </RegionProvider>
);

export default Account;
