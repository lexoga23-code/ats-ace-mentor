import { XCircle, CheckCircle2 } from "lucide-react";

const BEFORE = ["CV ignoré par les ATS", "Pas de réponses aux candidatures", "Frustration et doute"];
const AFTER = ["CV optimisé et compatible ATS", "Plus de réponses des recruteurs", "Plus d'entretiens décrochés"];

const BeforeAfter = () => (
  <section className="py-20 px-6 bg-secondary/40">
    <div className="max-w-4xl mx-auto">
      <h2 className="text-3xl md:text-4xl font-extrabold text-foreground text-center mb-12">
        Avant / Après ScoreCV
      </h2>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Before */}
        <div className="bg-card rounded-2xl p-8 shadow-soft border border-destructive/20">
          <span className="text-xs font-bold uppercase tracking-widest text-destructive mb-4 block">Avant</span>
          <ul className="space-y-4">
            {BEFORE.map((b) => (
              <li key={b} className="flex items-center gap-3 text-foreground/80 font-medium">
                <XCircle className="w-5 h-5 text-destructive flex-shrink-0" /> {b}
              </li>
            ))}
          </ul>
        </div>

        {/* After */}
        <div className="bg-card rounded-2xl p-8 shadow-soft border border-primary/20">
          <span className="text-xs font-bold uppercase tracking-widest text-primary mb-4 block">Après</span>
          <ul className="space-y-4">
            {AFTER.map((a) => (
              <li key={a} className="flex items-center gap-3 text-foreground font-medium">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" /> {a}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  </section>
);

export default BeforeAfter;
