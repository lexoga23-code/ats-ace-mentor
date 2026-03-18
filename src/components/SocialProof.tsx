import { Shield, Star, Zap, Users } from "lucide-react";

const TESTIMONIALS = [
  {
    name: "Marie L.",
    role: "Chef de projet, Paris",
    text: "Mon CV passait à la trappe depuis des mois. Après ScoreCV, j'ai décroché 3 entretiens en 2 semaines.",
    rating: 5,
  },
  {
    name: "Marie T.",
    role: "Responsable comptable, Lyon",
    text: "Grâce à ScoreCV j'ai compris pourquoi mon CV était ignoré par les recruteurs. En 20 minutes j'avais un CV entièrement optimisé pour les ATS. J'ai décroché 3 entretiens la semaine suivante.",
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
  { icon: Users, label: "Utilisé par +5 000 candidats" },
];

const SocialProof = () => {
  return (
    <section className="py-16 px-6 bg-secondary/30">
      <div className="max-w-6xl mx-auto">
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
