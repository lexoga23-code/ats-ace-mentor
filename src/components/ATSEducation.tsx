import { FileSearch, Filter, CheckCircle } from "lucide-react";

const ATSEducation = () => {
  const steps = [
    {
      icon: <FileSearch className="w-8 h-8" />,
      title: "1. Votre CV est scanné",
      description: "Les logiciels ATS (Applicant Tracking System) analysent automatiquement chaque CV reçu. Ils extraient le texte et cherchent des mots-clés correspondant au poste.",
    },
    {
      icon: <Filter className="w-8 h-8" />,
      title: "2. Un score est attribué",
      description: "Le CV est noté selon sa compatibilité avec l'offre d'emploi. Format, mots-clés, structure — tout est évalué. Un score trop bas = élimination automatique.",
    },
    {
      icon: <CheckCircle className="w-8 h-8" />,
      title: "3. Seuls les meilleurs passent",
      description: "Seuls les CV ayant un score suffisant arrivent sur le bureau du recruteur. 75% des candidatures sont éliminées avant toute lecture humaine.",
    },
  ];

  return (
    <section id="ats" className="py-20 px-6 bg-surface-warm">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-4 text-foreground">{"C'est quoi un ATS ?"}</h2>
        <p className="text-center text-muted-foreground mb-16 max-w-2xl mx-auto">
          Comprendre le système qui décide si votre CV sera lu ou ignoré.
        </p>
        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step) => (
            <div key={step.title} className="bg-card p-8 rounded-2xl shadow-soft text-center">
              <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-6">
                {step.icon}
              </div>
              <h3 className="text-lg font-bold mb-3 text-foreground">{step.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ATSEducation;
