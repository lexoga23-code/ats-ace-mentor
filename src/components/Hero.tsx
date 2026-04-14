import { ArrowRight, Play, TrendingDown, AlertTriangle, CheckCircle2 } from "lucide-react";

const Hero = () => {
  return (
    <section className="pt-28 pb-20 px-6 bg-background">
      <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
        {/* Left — Copy */}
        <div>
          <h1 className="text-4xl sm:text-5xl lg:text-[3.4rem] font-extrabold leading-[1.12] tracking-tight text-foreground mb-6">
            Passe les filtres ATS et décroche{" "}
            <span className="text-primary">plus d'entretiens</span>
          </h1>
          <p className="text-lg text-foreground/80 mb-8 max-w-xl leading-relaxed">
            Analyse ton CV gratuitement, découvre pourquoi il est rejeté et améliore-le avec l'IA.
          </p>

          <div className="flex flex-wrap gap-4 mb-8">
            <a
              href="#optimiser"
              className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-primary-foreground rounded-xl text-lg font-bold hover:opacity-90 transition-all shadow-lg shadow-primary/25"
            >
              Analyser mon CV gratuitement
              <ArrowRight className="w-5 h-5" />
            </a>
            <a
              href="#produit"
              className="inline-flex items-center gap-2 px-6 py-4 bg-card text-foreground rounded-xl font-semibold shadow-soft hover:bg-secondary transition-all"
            >
              <Play className="w-4 h-4 text-primary" />
              Voir un exemple
            </a>
          </div>

          {/* Social proof */}
          <div className="flex flex-wrap items-center gap-6 text-sm text-foreground/70">
            <span className="font-semibold">+1 000 CV analysés</span>
            <span className="w-px h-4 bg-border" />
            <span className="font-semibold">87% améliorent leur score</span>
          </div>
        </div>

        {/* Right — Product visual mockup */}
        <div className="relative hidden lg:block">
          <div className="bg-card rounded-3xl shadow-elevated p-8 border border-border">
            {/* Score ring */}
            <div className="flex items-center gap-6 mb-6">
              <div className="relative w-28 h-28 flex-shrink-0">
                <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                  <circle cx="60" cy="60" r="52" fill="none" stroke="hsl(var(--border))" strokeWidth="10" />
                  <circle
                    cx="60"
                    cy="60"
                    r="52"
                    fill="none"
                    stroke="hsl(var(--primary))"
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={`${62 * 3.27} ${100 * 3.27}`}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-extrabold text-foreground">62</span>
                  <span className="text-xs text-muted-foreground font-medium">/100</span>
                </div>
              </div>
              <div>
                <p className="text-sm font-bold text-foreground mb-1">Score ATS</p>
                <p className="text-sm text-destructive font-semibold flex items-center gap-1">
                  <TrendingDown className="w-4 h-4" /> 38 points perdus
                </p>
              </div>
            </div>

            {/* Loss breakdown */}
            <div className="space-y-3">
              {[
                { label: "Mots-clés manquants", loss: -12, severity: "high" },
                { label: "Format non compatible", loss: -8, severity: "high" },
                { label: "Structure des sections", loss: -6, severity: "medium" },
                { label: "Expérience mal formulée", loss: -5, severity: "medium" },
                { label: "Compétences non catégorisées", loss: -4, severity: "low" },
                { label: "Orthographe & cohérence", loss: -3, severity: "low" },
              ].map((item, i) => (
                <div
                  key={item.label}
                  className={`flex items-center justify-between p-3 rounded-xl text-sm ${
                    i >= 3 ? "opacity-40 blur-[2px]" : ""
                  } ${
                    item.severity === "high"
                      ? "bg-destructive/8 border border-destructive/20"
                      : item.severity === "medium"
                      ? "bg-amber-50 border border-amber-200"
                      : "bg-secondary border border-border"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {item.severity === "high" ? (
                      <AlertTriangle className="w-4 h-4 text-destructive" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
                    )}
                    <span className="font-medium text-foreground">{item.label}</span>
                  </div>
                  <span className="font-bold text-destructive">{item.loss} pts</span>
                </div>
              ))}
            </div>

            {/* Blur overlay for premium tease */}
            <div className="mt-4 text-center">
              <span className="text-xs font-semibold text-primary">🔒 Débloquer l'analyse complète</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
