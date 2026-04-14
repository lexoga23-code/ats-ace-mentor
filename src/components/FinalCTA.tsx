import { ArrowRight } from "lucide-react";

const FinalCTA = () => (
  <section className="py-20 px-6 bg-primary/5">
    <div className="max-w-2xl mx-auto text-center">
      <h2 className="text-3xl md:text-4xl font-extrabold text-foreground mb-4 leading-tight">
        Découvre ton score et améliore ton CV dès maintenant
      </h2>
      <p className="text-lg text-foreground/70 mb-8">
        Gratuit, sans inscription, en moins de 30 secondes.
      </p>
      <a
        href="#optimiser"
        className="inline-flex items-center gap-2 px-10 py-5 bg-primary text-primary-foreground rounded-xl text-xl font-bold hover:opacity-90 transition-all shadow-lg shadow-primary/25"
      >
        Analyser mon CV gratuitement
        <ArrowRight className="w-6 h-6" />
      </a>
    </div>
  </section>
);

export default FinalCTA;
