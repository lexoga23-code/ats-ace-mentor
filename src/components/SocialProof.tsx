import { Shield, Star, Zap, Users } from "lucide-react";
import marieImg from "@/assets/marie.webp";
import sophieImg from "@/assets/sophie.webp";
import marcImg from "@/assets/marc.webp";

const TESTIMONIALS = [
  {
    name: "Marie L.",
    role: "Commerciale, Paris",
    text: "Mon CV passait à la trappe depuis des mois. Après ScoreCV, j'ai décroché 3 entretiens en 2 semaines.",
    rating: 5,
    photo: marieImg,
  },
  {
    name: "Sophie M.",
    role: "Formatrice RH, Lausanne",
    text: "En tant que professionnelle RH, je recommande ScoreCV à tous mes stagiaires. L'analyse est précise et les suggestions concrètes. Un outil indispensable pour le marché suisse.",
    rating: 5,
    photo: sophieImg,
  },
  {
    name: "Marc D.",
    role: "Chef de projet, Bordeaux",
    text: "Reconverti après 15 ans dans la banque, je pensais que mon expérience parlait d'elle-même. ScoreCV m'a montré que sans les bons mots-clés, mon profil était invisible. 3 semaines après avoir optimisé mon CV, j'ai signé un CDI.",
    rating: 5,
    photo: marcImg,
  },
];

const TRUST_BADGES = [
  { icon: Shield, label: "Données chiffrées SSL" },
  { icon: Zap, label: "Analyse en moins de 2 minutes" },
  { icon: Users, label: "Utilisé par +5 000 candidats" },
];

const SocialProof = () => {
  return (
    <section className="py-16 px-6 bg-secondary/30">
      <div className="max-w-6xl mx-auto">
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
              <div className="flex items-center gap-3 mt-4">
                <img
                  src={t.photo}
                  alt={t.name}
                  className="w-12 h-12 rounded-full object-cover object-top"
                />
                <div>
                  <p className="text-sm font-bold text-foreground">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

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
