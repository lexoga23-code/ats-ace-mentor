import { Eye, EyeOff, TrendingDown, HelpCircle } from "lucide-react";
import SocialProof from "./SocialProof";

const ATSEducation = () => {
  return (
    <section id="ats" className="py-24 px-6 bg-surface-warm relative overflow-hidden">
      <div className="max-w-5xl mx-auto">
        {/* Headline éducatif */}
        <div className="text-center mb-6">
          <span className="inline-block px-4 py-1.5 bg-primary/10 text-primary text-sm font-bold rounded-full mb-4">
            <HelpCircle className="w-4 h-4 inline mr-1" />
            COMPRENDRE L'ATS
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-foreground leading-tight">
            {"Qu'est-ce qu'un"}<br />
            <span className="text-primary">{"système ATS ?"}</span>
          </h2>
        </div>

        <p className="text-center text-muted-foreground mb-16 max-w-2xl mx-auto text-lg">
          Les systèmes ATS (Applicant Tracking Systems) sont des logiciels utilisés par les entreprises
          pour gérer et filtrer les candidatures. <span className="font-medium text-foreground">Comprendre leur fonctionnement</span> {"est essentiel pour optimiser votre CV."}
        </p>

        {/* Stat éducatif */}
        <div className="bg-primary/5 border border-primary/20 rounded-3xl p-8 md:p-12 mb-16 text-center">
          <div className="text-7xl md:text-8xl font-bold text-primary mb-4">75%</div>
          <p className="text-xl md:text-2xl font-bold text-foreground mb-2">
            des grandes entreprises utilisent un ATS
          </p>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Ces outils permettent aux recruteurs de gagner du temps en filtrant automatiquement
            les CV selon des critères précis — <span className="font-medium text-foreground">format, mots-clés, expérience</span>.
          </p>
        </div>

        {/* 3 étapes du processus */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          <div className="bg-card border border-border p-8 rounded-2xl shadow-soft">
            <div className="w-14 h-14 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-5">
              <Eye className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold mb-3 text-foreground">{"1. Analyse automatique"}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {"L'ATS scanne votre CV et extrait les informations clés : expériences, compétences, formations, coordonnées."}
            </p>
          </div>

          <div className="bg-card border border-border p-8 rounded-2xl shadow-soft">
            <div className="w-14 h-14 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-5">
              <TrendingDown className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold mb-3 text-foreground">{"2. Scoring et matching"}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {"Le système compare votre profil avec l'offre d'emploi et attribue un score de correspondance."}
            </p>
          </div>

          <div className="bg-card border border-border p-8 rounded-2xl shadow-soft">
            <div className="w-14 h-14 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-5">
              <EyeOff className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold mb-3 text-foreground">{"3. Sélection finale"}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {"Seuls les CV les mieux adaptés sont présentés aux recruteurs. Les autres restent dans la base de données."}
            </p>
          </div>
        </div>

        {/* Avis utilisateurs (moved here) */}
        <SocialProof />

        {/* CTA */}
        <div className="text-center mt-16">
          <p className="text-lg text-muted-foreground mb-6">
            <span className="font-bold text-foreground">Prêt à tester votre CV ?</span> {"Découvrez si votre CV passe les filtres ATS."}
          </p>
          <a
            href="#optimiser"
            className="inline-block bg-primary text-primary-foreground px-8 py-4 rounded-full text-lg font-bold hover:opacity-90 transition-all shadow-lg shadow-primary/20"
          >
            {"Analyser mon CV — c'est gratuit"}
          </a>
          <p className="mt-3 text-sm text-muted-foreground">Analyse en moins de 2 minutes · Aucune inscription</p>
        </div>
      </div>
    </section>
  );
};

export default ATSEducation;
