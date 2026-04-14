import { Check, Lock, ArrowRight } from "lucide-react";

const FREE_FEATURES = ["Score ATS sur 100", "3 problèmes critiques", "5 mots-clés manquants"];
const PAID_FEATURES = ["CV réécrit par l'IA", "Lettre de motivation générée", "Checklist complète (10 critères)", "Export PDF & Word"];

const FreemiumSection = () => (
  <section className="py-20 px-6 bg-background">
    <div className="max-w-4xl mx-auto text-center">
      <h2 className="text-3xl md:text-4xl font-extrabold text-foreground mb-4 leading-tight">
        Ton score est gratuit.<br />
        <span className="text-primary">Le reste débloque ton potentiel.</span>
      </h2>

      <div className="grid md:grid-cols-2 gap-6 mt-12 mb-10">
        {/* Free */}
        <div className="bg-card rounded-2xl p-8 shadow-soft border border-border text-left">
          <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Gratuit</span>
          <div className="text-3xl font-extrabold text-foreground mt-2 mb-6">0€</div>
          <ul className="space-y-3">
            {FREE_FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-2 text-foreground font-medium">
                <Check className="w-4 h-4 text-primary" /> {f}
              </li>
            ))}
          </ul>
        </div>

        {/* Paid */}
        <div className="bg-card rounded-2xl p-8 shadow-soft border-2 border-primary text-left relative">
          <span className="absolute -top-3 left-6 bg-primary text-primary-foreground text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">
            Recommandé
          </span>
          <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Rapport complet</span>
          <div className="text-3xl font-extrabold text-foreground mt-2 mb-6">
            4<span className="text-lg">€</span>
          </div>
          <ul className="space-y-3">
            {PAID_FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-2 text-foreground font-medium">
                <Lock className="w-4 h-4 text-primary" /> {f}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <a
        href="#tarifs"
        className="inline-flex items-center gap-2 px-8 py-4 bg-foreground text-background rounded-xl text-lg font-bold hover:opacity-90 transition-all"
      >
        Débloquer mon CV
        <ArrowRight className="w-5 h-5" />
      </a>
    </div>
  </section>
);

export default FreemiumSection;
