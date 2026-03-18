import { useEffect } from "react";

const PaymentSuccess = () => {
  useEffect(() => {
    // Signal the main tab that payment is complete
    localStorage.setItem("scorecv_paid", "true");
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="max-w-md w-full bg-card p-10 rounded-3xl shadow-soft text-center space-y-6">
        <div className="text-5xl">✅</div>
        <h1 className="text-2xl font-bold text-foreground">Paiement confirmé !</h1>
        <p className="text-muted-foreground">
          Retournez sur l'onglet ScoreCV pour voir votre rapport complet.
        </p>
        <button
          onClick={() => window.close()}
          className="w-full py-4 bg-primary text-primary-foreground rounded-xl font-bold text-lg hover:opacity-90 transition-all"
        >
          Retourner sur mon rapport →
        </button>
        <p className="text-xs text-muted-foreground">
          Si la fenêtre ne se ferme pas, retournez manuellement sur l'onglet ScoreCV.
        </p>
      </div>
    </div>
  );
};

export default PaymentSuccess;
