import { Shield, Star, Zap, Users } from "lucide-react";
import { useState, useEffect, useRef } from "react";

const AnimatedCounter = ({ target, suffix = "" }: { target: number; suffix?: string }) => {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const duration = 2000;
          const steps = 60;
          const increment = target / steps;
          let current = 0;
          const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
              setCount(target);
              clearInterval(timer);
            } else {
              setCount(Math.floor(current));
            }
          }, duration / steps);
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);

  return (
    <div ref={ref} className="text-3xl font-bold text-primary">
      {count.toLocaleString("fr-FR")}{suffix}
    </div>
  );
};

const TESTIMONIALS = [
  {
    name: "Marie L.",
    role: "Chef de projet, Paris",
    text: "Mon CV passait à la trappe depuis des mois. Après ScoreCV, j'ai décroché 3 entretiens en 2 semaines.",
    rating: 5,
  },
  {
    name: "Thomas K.",
    role: "Développeur, Lausanne",
    text: "L'analyse des mots-clés m'a ouvert les yeux. Mon score est passé de 42 à 87 en une seule réécriture.",
    rating: 5,
  },
  {
    name: "Sophie R.",
    role: "RH, Lyon",
    text: "En tant que recruteuse, je recommande ScoreCV à tous les candidats. L'outil est bluffant de précision.",
    rating: 5,
  },
];

const TRUST_BADGES = [
  { icon: Shield, label: "Données chiffrées SSL" },
  { icon: Zap, label: "Analyse en 30 secondes" },
  { icon: Users, label: "Utilisé par +2 000 candidats" },
];

const SocialProof = () => {
  return (
    <section className="py-16 px-6 bg-secondary/30">
      <div className="max-w-6xl mx-auto">
        {/* Counters */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16">
          {[
            { target: 2847, suffix: "+", label: "CV analysés" },
            { target: 94, suffix: "%", label: "Taux de satisfaction" },
            { target: 67, suffix: "%", label: "Score moyen amélioré" },
            { target: 3, suffix: "x", label: "Plus d'entretiens" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <AnimatedCounter target={stat.target} suffix={stat.suffix} />
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mt-1">
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        {/* Testimonials */}
        <h2 className="text-2xl font-bold text-center mb-8 text-foreground">
          Ce que disent nos utilisateurs
        </h2>
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {TESTIMONIALS.map((t) => (
            <div key={t.name} className="bg-card p-6 rounded-2xl shadow-soft">
              <div className="flex gap-0.5 mb-3">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-sm text-muted-foreground mb-4 italic">"{t.text}"</p>
              <div>
                <p className="text-sm font-bold text-foreground">{t.name}</p>
                <p className="text-xs text-muted-foreground">{t.role}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Trust badges */}
        <div className="flex flex-wrap justify-center gap-6">
          {TRUST_BADGES.map((badge) => (
            <div key={badge.label} className="flex items-center gap-2 px-4 py-2 bg-card rounded-full shadow-soft">
              <badge.icon className="w-4 h-4 text-primary" />
              <span className="text-xs font-medium text-muted-foreground">{badge.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SocialProof;
