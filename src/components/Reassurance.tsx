import { Shield, CreditCard, Globe, BellOff } from "lucide-react";

const BADGES = [
  { icon: Shield, label: "Données chiffrées SSL" },
  { icon: CreditCard, label: "Paiement 100% sécurisé" },
  { icon: Globe, label: "Compatible France & Suisse" },
  { icon: BellOff, label: "Aucun spam, jamais" },
];

const Reassurance = () => (
  <section className="py-16 px-6 bg-background">
    <div className="max-w-4xl mx-auto flex flex-wrap justify-center gap-6">
      {BADGES.map((b) => (
        <div key={b.label} className="flex items-center gap-2 px-5 py-3 bg-card rounded-full shadow-soft">
          <b.icon className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-foreground">{b.label}</span>
        </div>
      ))}
    </div>
  </section>
);

export default Reassurance;
