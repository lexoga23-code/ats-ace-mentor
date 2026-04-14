import { XCircle } from "lucide-react";

const PROBLEMS = [
  "Mauvais mots-clés utilisés",
  "Format non compatible avec les ATS",
  "Manque d'optimisation des sections",
];

const ProblemSection = () => (
  <section className="py-20 px-6 bg-secondary/40">
    <div className="max-w-3xl mx-auto text-center">
      <h2 className="text-3xl md:text-4xl font-extrabold text-foreground mb-6 leading-tight">
        Pourquoi ton CV est rejeté<br />
        <span className="text-destructive">sans que tu le saches</span>
      </h2>
      <p className="text-lg text-foreground/80 mb-10 max-w-2xl mx-auto">
        <span className="font-bold">75% des CV</span> sont filtrés automatiquement par des logiciels ATS avant même qu'un recruteur ne les voie.
      </p>

      <div className="space-y-4 max-w-md mx-auto mb-10">
        {PROBLEMS.map((p) => (
          <div key={p} className="flex items-center gap-3 bg-card p-4 rounded-xl shadow-soft text-left">
            <XCircle className="w-5 h-5 text-destructive flex-shrink-0" />
            <span className="font-medium text-foreground">{p}</span>
          </div>
        ))}
      </div>

      <p className="text-xl font-bold text-foreground italic">
        « Et tu ne sais même pas pourquoi. »
      </p>
    </div>
  </section>
);

export default ProblemSection;
