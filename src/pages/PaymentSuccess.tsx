import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const PaymentSuccess = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "done">("loading");

  useEffect(() => {
    // Always set localStorage flag for cross-tab fallback
    localStorage.setItem("scorecv_paid", "true");

    const markPaid = async () => {
      if (user) {
        // Mark user's latest analysis as paid
        const { data: analyses } = await supabase
          .from("user_analyses")
          .select("id")
          .eq("user_id", user.id)
          .eq("is_paid", false)
          .order("created_at", { ascending: false })
          .limit(1);

        if (analyses && analyses.length > 0) {
          await supabase
            .from("user_analyses")
            .update({ is_paid: true })
            .eq("id", analyses[0].id);
        }
      }
      setStatus("done");

      // Auto-redirect after 2 seconds
      setTimeout(() => {
        navigate("/");
      }, 2000);
    };

    markPaid();
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="max-w-md w-full bg-card p-10 rounded-3xl shadow-soft text-center space-y-6">
        <div className="text-5xl">✅</div>
        <h1 className="text-2xl font-bold text-foreground">Paiement confirmé !</h1>
        <p className="text-muted-foreground">
          {status === "loading"
            ? "Vérification en cours..."
            : "Vous allez être redirigé vers votre rapport complet."}
        </p>
        <button
          onClick={() => navigate("/")}
          className="w-full py-4 bg-primary text-primary-foreground rounded-xl font-bold text-lg hover:opacity-90 transition-all"
        >
          Voir mon rapport →
        </button>
        <p className="text-xs text-muted-foreground">
          Si vous n'êtes pas redirigé, cliquez sur le bouton ci-dessus.
        </p>
      </div>
    </div>
  );
};

export default PaymentSuccess;
