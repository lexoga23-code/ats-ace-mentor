import { Target, AlertTriangle, Search, Lightbulb, Zap } from "lucide-react";

const BENEFITS = [
  { icon: Target, text: "Score ATS précis sur 100" },
  { icon: AlertTriangle, text: "Identification des erreurs bloquantes" },
  { icon: Search, text: "Mots-clés manquants détectés" },
  { icon: Lightbulb, text: "Recommandations concrètes et actionnables" },
];

const SolutionSection = () => (
  <section className="py-20 px-6 bg-background">
    <div className="max-w-3xl mx-auto text-center">
      <h2 className="text-3xl md:text-4xl font-extrabold text-foreground mb-4 leading-tight">
        ScoreCV analyse ton CV<br />
        <span className="text-primary">comme un recruteur (et un ATS)</span>
      </h2>

      <div className="grid sm:grid-cols-2 gap-4 mt-10 mb-10 text-left">
        {BENEFITS.map((b) => (
          <div key={b.text} className="flex items-start gap-3 bg-card p-5 rounded-xl shadow-soft">
            <b.icon className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
            <span className="font-medium text-foreground">{b.text}</span>
          </div>
        ))}
      </div>

      <p className="inline-flex items-center gap-2 text-lg font-bold text-primary">
        <Zap className="w-5 h-5" /> Résultat en moins de 30 secondes
      </p>
    </div>
  </section>
);

export default SolutionSection;
