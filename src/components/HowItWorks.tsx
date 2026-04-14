import { Upload, BarChart3, Sparkles, ArrowRight } from "lucide-react";

const STEPS = [
  { icon: Upload, title: "Upload ton CV", desc: "Glisse ton fichier PDF ou Word" },
  { icon: BarChart3, title: "Obtiens ton score ATS", desc: "Analyse instantanée et détaillée" },
  { icon: Sparkles, title: "Améliore-le avec l'IA", desc: "Recommandations et réécriture auto" },
];

const HowItWorks = () => (
  <section className="py-20 px-6 bg-secondary/40">
    <div className="max-w-4xl mx-auto text-center">
      <h2 className="text-3xl md:text-4xl font-extrabold text-foreground mb-12">
        Comment ça marche
      </h2>

      <div className="grid md:grid-cols-3 gap-8 mb-12">
        {STEPS.map((s, i) => (
          <div key={s.title} className="flex flex-col items-center">
            <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-4">
              <s.icon className="w-7 h-7" />
            </div>
            <span className="text-xs font-bold text-primary mb-2">ÉTAPE {i + 1}</span>
            <h3 className="text-lg font-bold text-foreground mb-1">{s.title}</h3>
            <p className="text-sm text-foreground/70">{s.desc}</p>
          </div>
        ))}
      </div>

      <a
        href="#optimiser"
        className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-primary-foreground rounded-xl text-lg font-bold hover:opacity-90 transition-all shadow-lg shadow-primary/25"
      >
        Analyser mon CV gratuitement
        <ArrowRight className="w-5 h-5" />
      </a>
    </div>
  </section>
);

export default HowItWorks;
