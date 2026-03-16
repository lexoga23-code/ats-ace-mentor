import { useRegion } from "@/contexts/RegionContext";

const Navbar = () => {
  const { region, toggleRegion, flag } = useRegion();

  const smoothTo = (id: string) => {
    document.querySelector(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <nav className="fixed top-0 w-full z-50 glass-nav border-b border-border/50">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <span className="text-xl font-bold tracking-tighter text-primary">ScoreCV</span>
          <div className="hidden md:flex gap-6 text-sm font-medium text-muted-foreground">
            <button onClick={() => smoothTo("#optimiser")} className="hover:text-primary transition-colors">Optimiser</button>
            <button onClick={() => smoothTo("#ats")} className="hover:text-primary transition-colors">{"C'est quoi l'ATS ?"}</button>
            <button onClick={() => smoothTo("#tarifs")} className="hover:text-primary transition-colors">Tarifs</button>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={toggleRegion}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary text-sm font-medium hover:bg-secondary/80 transition-all"
          >
            <span>{flag}</span>
            <span>{region}</span>
          </button>
          <button
            onClick={() => smoothTo("#optimiser")}
            className="bg-primary text-primary-foreground px-5 py-2 rounded-full text-sm font-semibold hover:opacity-90 transition-all shadow-lg shadow-primary/20"
          >
            COMMENCER
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
