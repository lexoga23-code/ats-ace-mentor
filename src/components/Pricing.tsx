import { Check, Loader2 } from "lucide-react";
import { useRegion } from "@/contexts/RegionContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const Pricing = () => {
  const { currency, prices, region } = useRegion();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loadingProduct, setLoadingProduct] = useState<string | null>(null);

  const handleCheckout = async (productType: "report" | "pro" | "review") => {
    if (!user) {
      toast.info("Créez un compte pour continuer");
      navigate("/auth");
      return;
    }

    setLoadingProduct(productType);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: {
          productType,
          region,
          successUrl: `${window.location.origin}/payment-success?product=${productType}`,
          cancelUrl: `${window.location.origin}/#tarifs`,
        },
      });

      if (error || !data?.url) throw new Error("Impossible de créer la session");
      window.open(data.url, "_blank");
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la redirection vers le paiement.");
    } finally {
      setLoadingProduct(null);
    }
  };

  const plans = [
    {
      name: "Gratuit",
      price: "0",
      period: "",
      features: ["Score ATS Global", "3 problèmes prioritaires", "5 mots-clés manquants"],
      cta: "Actif",
      productType: null as null,
      featured: false,
      style: "bg-card",
    },
    {
      name: "Rapport Complet",
      price: String(prices.single),
      period: "",
      features: ["Réécriture IA complète", "Checklist 10 critères", "Lettre de motivation", "Export PDF & DOCX"],
      cta: "Obtenir le rapport complet",
      productType: "report" as const,
      featured: true,
      style: "bg-card border-2 border-primary",
    },
    {
      name: "Pro",
      price: String(prices.pro),
      period: "/mois",
      features: ["Analyses illimitées", "Tous les designs", "Support prioritaire"],
      cta: "S'abonner au Pro",
      productType: "pro" as const,
      featured: false,
      style: "bg-card",
    },
    {
      name: "Expert Humain",
      price: String(prices.human),
      period: "",
      features: ["Relecture CV + Lettre", "Rapport personnalisé", "Retour sous 24h"],
      cta: "Demander une relecture",
      productType: "review" as const,
      featured: false,
      style: "bg-secondary",
    },
  ];

  return (
    <section id="tarifs" className="py-20 px-6">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-16 text-foreground">Choisissez votre plan</h2>
        <div className="grid md:grid-cols-4 gap-6">
          {plans.map((plan) => (
            <div key={plan.name} className={`p-8 rounded-3xl shadow-soft flex flex-col relative ${plan.style}`}>
              {plan.featured && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest whitespace-nowrap">
                  Le plus populaire
                </span>
              )}
              <h3 className="font-bold text-lg mb-2 text-foreground">{plan.name}</h3>
              <div className="text-3xl font-bold mb-6 text-foreground">
                {plan.price}
                <span className="text-lg">{currency}</span>
                {plan.period && <span className="text-sm text-muted-foreground font-normal">{plan.period}</span>}
              </div>
              <ul className="space-y-4 text-sm text-muted-foreground mb-8 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-primary flex-shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              {plan.productType ? (
                <button
                  onClick={() => handleCheckout(plan.productType!)}
                  disabled={loadingProduct === plan.productType}
                  className={`w-full py-3 rounded-xl font-bold text-center transition-all disabled:opacity-50 flex items-center justify-center gap-2 ${
                    plan.featured
                      ? "bg-primary text-primary-foreground hover:opacity-90"
                      : "bg-foreground text-background hover:opacity-90"
                  }`}
                >
                  {loadingProduct === plan.productType ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Ouverture...</>
                  ) : (
                    plan.cta
                  )}
                </button>
              ) : (
                <button className="w-full py-3 rounded-xl font-bold border border-border text-foreground" disabled>
                  {plan.cta}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Pricing;
