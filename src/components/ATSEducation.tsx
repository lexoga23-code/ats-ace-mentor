import { Eye, EyeOff, TrendingDown, AlertTriangle, ShieldAlert, Skull } from "lucide-react";

const ATSEducation = () => {
  return (
    <section id="ats" className="py-24 px-6 bg-surface-warm relative overflow-hidden">
      <div className="max-w-5xl mx-auto">
        {/* Headline choc */}
        <div className="text-center mb-6">
          <span className="inline-block px-4 py-1.5 bg-destructive/10 text-destructive text-sm font-bold rounded-full mb-4">
            ⚠️ CE QUE LES RECRUTEURS NE VOUS DIRONT JAMAIS
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-foreground leading-tight">
            {"Votre CV est probablement"}<br />
            <span className="text-destructive">{"éliminé avant d'être lu."}</span>
          </h2>
        </div>

        <p className="text-center text-muted-foreground mb-16 max-w-2xl mx-auto text-lg">
          Un logiciel robot — {"l'ATS"} — juge votre candidature en quelques secondes.
          <span className="font-bold text-foreground"> Aucun recruteur ne verra jamais votre CV</span> {"s'il ne passe pas ce filtre."}
        </p>

        {/* Stat choc */}
        <div className="bg-destructive/5 border-2 border-destructive/20 rounded-3xl p-8 md:p-12 mb-16 text-center">
          <div className="text-7xl md:text-8xl font-bold text-destructive mb-4">75%</div>
          <p className="text-xl md:text-2xl font-bold text-foreground mb-2">
            des CV sont éliminés automatiquement
          </p>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Avant même {"qu'un"} être humain ne les regarde. Votre expérience, vos compétences, votre motivation — <span className="font-bold text-destructive">tout ça ne compte pas</span> si votre CV {"n'est"} pas optimisé pour {"l'ATS"}.
          </p>
        </div>

        {/* 3 étapes effrayantes */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          <div className="bg-card border border-border p-8 rounded-2xl shadow-soft">
            <div className="w-14 h-14 bg-destructive/10 text-destructive rounded-2xl flex items-center justify-center mb-5">
              <Eye className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold mb-3 text-foreground">{"1. Le robot scanne votre CV"}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {"Dès que vous postulez, un logiciel ATS analyse votre CV en quelques secondes. Il ne lit pas — il scanne. Pas de pitié, pas de seconde chance."}
            </p>
          </div>

          <div className="bg-card border border-border p-8 rounded-2xl shadow-soft">
            <div className="w-14 h-14 bg-destructive/10 text-destructive rounded-2xl flex items-center justify-center mb-5">
              <TrendingDown className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold mb-3 text-foreground">{"2. Un score décide de votre sort"}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {"Mots-clés absents ? Mauvais format ? Score trop bas → votre CV est rejeté. Vous ne recevez même pas de refus. Juste... le silence."}
            </p>
          </div>

          <div className="bg-card border border-border p-8 rounded-2xl shadow-soft">
            <div className="w-14 h-14 bg-destructive/10 text-destructive rounded-2xl flex items-center justify-center mb-5">
              <EyeOff className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold mb-3 text-foreground">{"3. Personne ne verra jamais votre CV"}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {"Le recruteur ne sait même pas que vous existez. Votre CV dort dans une base de données. Vos semaines de recherche — pour rien."}
            </p>
          </div>
        </div>

        {/* Signes que votre CV est rejeté */}
        <div className="bg-card border-2 border-destructive/30 rounded-3xl p-8 md:p-10 mb-16 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-destructive/5 rounded-full -mr-16 -mt-16" />
          
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-destructive/10 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </div>
            <h3 className="text-xl font-bold text-foreground">{"Vous reconnaissez-vous ?"}</h3>
          </div>
          
          <div className="grid md:grid-cols-2 gap-4">
            {[
              "Vous postulez et ne recevez jamais de réponse",
              "Votre CV a été fait sur Canva ou avec un template graphique",
              "Vous n'adaptez pas votre CV à chaque offre",
              "Vous ne savez pas ce qu'est un score ATS",
              "Vous utilisez des tableaux, colonnes ou icônes dans votre CV",
              "Vous avez un trou dans votre parcours non expliqué",
            ].map((item) => (
              <div key={item} className="flex items-start gap-3 p-4 bg-destructive/5 rounded-xl border border-destructive/10">
                <ShieldAlert className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                <span className="text-sm text-foreground font-medium">{item}</span>
              </div>
            ))}
          </div>
          
          <div className="mt-6 flex items-center gap-3 p-4 bg-destructive/10 rounded-xl border border-destructive/20">
            <Skull className="w-6 h-6 text-destructive" />
            <p className="text-sm text-foreground">
              Si vous avez coché <span className="font-bold text-destructive">ne serait-ce qu'un seul point</span>, votre CV est probablement filtré par les ATS.
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <p className="text-lg text-muted-foreground mb-6">
            <span className="font-bold text-foreground">La bonne nouvelle ?</span> {"Il suffit d'optimiser votre CV pour battre l'ATS."}
          </p>
          <button
            onClick={() => document.querySelector("#optimiser")?.scrollIntoView({ behavior: "smooth" })}
            className="bg-destructive text-destructive-foreground px-8 py-4 rounded-full text-lg font-bold hover:opacity-90 transition-all shadow-lg shadow-destructive/20"
          >
            {"Vérifier mon CV maintenant — c'est gratuit"}
          </button>
          <p className="mt-3 text-sm text-muted-foreground">Analyse en 30 secondes · Aucune inscription</p>
        </div>
      </div>
    </section>
  );
};

export default ATSEducation;
