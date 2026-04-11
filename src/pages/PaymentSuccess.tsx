import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { sendPaymentConfirmEmail, sendReviewRequestEmail, sendProWelcomeEmail } from "@/lib/emailService";

const PaymentSuccess = () => {
  const { user, loading: authLoading } = useAuth();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<"loading" | "done">("loading");
  const hasRun = useRef(false);

  const productType = searchParams.get("product") || "report";
  const analysisIdFromUrl = searchParams.get("analysis_id");

  useEffect(() => {
    if (authLoading) return;
    if (hasRun.current) return;
    hasRun.current = true;

    const markPaid = async () => {
      let analysisIdToMark = analysisIdFromUrl;

      // Fallback: récupérer depuis sessionStorage si pas dans l'URL
      if (!analysisIdToMark) {
        analysisIdToMark = sessionStorage.getItem("scorecv_pending_analysis_id");
      }

      if (user) {
        try {
          if (productType === "report" && analysisIdToMark) {
            // Marquer l'analyse SPÉCIFIQUE comme payée
            const { error } = await supabase
              .from("user_analyses")
              .update({ is_paid: true })
              .eq("id", analysisIdToMark)
              .eq("user_id", user.id);

            if (error) {
              console.error("[PaymentSuccess] Error marking analysis as paid:", error);
            } else {
              console.log("[PaymentSuccess] Analysis marked as paid:", analysisIdToMark);
            }
          } else if (productType === "report" && !analysisIdToMark) {
            // Fallback: marquer la dernière analyse non payée (cas legacy)
            console.warn("[PaymentSuccess] No analysis_id found, falling back to latest unpaid");
            const { data: analyses } = await supabase
              .from("user_analyses")
              .select("id")
              .eq("user_id", user.id)
              .eq("is_paid", false)
              .order("created_at", { ascending: false })
              .limit(1);

            if (analyses && analyses.length > 0) {
              analysisIdToMark = analyses[0].id;
              await supabase
                .from("user_analyses")
                .update({ is_paid: true })
                .eq("id", analyses[0].id);
            }
          }

          // Send appropriate email
          if (user.email) {
            const name = user.user_metadata?.full_name || user.email.split("@")[0];
            if (productType === "report") {
              sendPaymentConfirmEmail(name, user.email);
            } else if (productType === "pro") {
              sendProWelcomeEmail(name, user.email);
            } else if (productType === "review") {
              sendReviewRequestEmail(name, user.email);
            }
          }
        } catch (err) {
          console.error("[PaymentSuccess] Error in markPaid:", err);
        }
      }

      // Stocker les flags pour CVAnalyzer
      localStorage.setItem("scorecv_paid", "true");
      if (analysisIdToMark) {
        localStorage.setItem("scorecv_analysis_id", analysisIdToMark);
      }

      // Clear subscription cache so Account page fetches fresh data
      if (productType === "pro") {
        sessionStorage.removeItem("scorecv_sub_cache");
      }

      // Nettoyer sessionStorage
      sessionStorage.removeItem("scorecv_pending_analysis_id");

      setStatus("done");

      // Délai puis redirect
      setTimeout(() => {
        if (window.opener) {
          // Nouvel onglet ouvert par window.open — fermer et laisser l'onglet parent détecter le paiement
          window.close();
        } else {
          // Même onglet — hard redirect (pas React Router) pour forcer le remontage
          window.location.href = "/#optimiser";
        }
      }, 2000);
    };

    markPaid();
  }, [user, authLoading, productType, analysisIdFromUrl]);

  const messages: Record<string, { title: string; subtitle: string }> = {
    report: {
      title: "Paiement confirmé !",
      subtitle: "Retournez sur l'onglet ScoreCV pour voir votre rapport complet.",
    },
    pro: {
      title: "Abonnement Pro activé !",
      subtitle: "Vous avez maintenant accès à toutes les fonctionnalités illimitées.",
    },
    review: {
      title: "Demande de relecture envoyée !",
      subtitle: "Un expert vous enverra votre rapport personnalisé sous 24h ouvrées.",
    },
  };

  const msg = messages[productType] || messages.report;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="max-w-md w-full bg-card p-10 rounded-3xl shadow-soft text-center space-y-6">
        <div className="text-5xl">✅</div>
        <h1 className="text-2xl font-bold text-foreground">{msg.title}</h1>
        <p className="text-muted-foreground">
          {status === "loading" ? "Vérification en cours..." : msg.subtitle}
        </p>
        <button
          onClick={() => {
            if (window.opener) {
              window.close();
            } else {
              window.location.href = "/#optimiser";
            }
          }}
          className="w-full py-4 bg-primary text-primary-foreground rounded-xl font-bold text-lg hover:opacity-90 transition-all"
        >
          Retourner sur mon rapport →
        </button>
        <p className="text-xs text-muted-foreground">
          Si l'onglet ne se ferme pas, retournez manuellement sur l'onglet ScoreCV.
        </p>
      </div>
    </div>
  );
};

export default PaymentSuccess;
