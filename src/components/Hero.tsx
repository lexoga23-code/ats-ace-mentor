const Hero = () => {
  const smoothTo = (id: string) => {
    document.querySelector(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="pt-32 pb-20 px-6">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6 text-balance text-foreground">
          Votre CV mérite d'être lu.
        </h1>
        <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto text-pretty">
          75% des CV sont éliminés par les logiciels ATS avant même d'atteindre un recruteur. Reprenez le contrôle.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {[
            { value: "94%", label: "Passage ATS" },
            { value: "3x", label: "Plus d'entretiens" },
            { value: "5000+", label: "CVs analysés" },
          ].map((stat) => (
            <div key={stat.label} className="p-6 bg-card rounded-2xl shadow-soft">
              <div className="text-3xl font-bold text-primary mb-1">{stat.value}</div>
              <div className="text-sm text-muted-foreground font-medium uppercase tracking-wide">{stat.label}</div>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap justify-center gap-4">
          <button
            onClick={() => smoothTo("#optimiser")}
            className="px-8 py-4 bg-foreground text-background rounded-xl font-bold hover:opacity-90 transition-all"
          >
            Analyser mon CV
          </button>
          <button
            onClick={() => smoothTo("#ats")}
            className="px-8 py-4 bg-card text-foreground rounded-xl font-bold shadow-soft hover:bg-secondary transition-all"
          >
            {"C'est quoi l'ATS ?"}
          </button>
        </div>
      </div>
    </section>
  );
};

export default Hero;
