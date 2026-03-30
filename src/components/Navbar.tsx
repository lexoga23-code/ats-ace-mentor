import { useRegion } from "@/contexts/RegionContext";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { User } from "lucide-react";

const Navbar = () => {
  const { region, toggleRegion, flag } = useRegion();
  const { user } = useAuth();
  const navigate = useNavigate();

  const smoothTo = (id: string) => {
    navigate(`/${id}`);
  };

  const handleLogoClick = () => {
    localStorage.setItem("scorecv_reset", "true");
    localStorage.removeItem("rewrittenCV");
    localStorage.removeItem("coverLetter");
    localStorage.removeItem("scorecv_data");
    localStorage.removeItem("scorecv_paid");
    localStorage.removeItem("scorecv_analysis");
    sessionStorage.removeItem("rewrittenCV");
    sessionStorage.removeItem("coverLetter");
    navigate("/");
  };

  return (
    <nav className="fixed top-0 w-full z-50 glass-nav border-b border-border/50">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <span className="text-xl font-bold tracking-tighter text-primary cursor-pointer" onClick={handleLogoClick}>ScoreCV</span>
          <div className="hidden md:flex gap-6 text-sm font-medium text-muted-foreground">
            <button onClick={() => smoothTo("#optimiser")} className="hover:text-primary transition-colors">Optimiser</button>
            <button onClick={() => smoothTo("#ats")} className="hover:text-primary transition-colors">{"C'est quoi l'ATS ?"}</button>
            <button onClick={() => smoothTo("#tarifs")} className="hover:text-primary transition-colors">Tarifs</button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={toggleRegion}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary text-sm font-medium hover:bg-secondary/80 transition-all"
          >
            <span>{flag}</span>
            <span>{region}</span>
          </button>
          {user ? (
            <button
              onClick={() => navigate("/compte")}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary text-sm font-medium text-foreground hover:bg-secondary/80 transition-all"
            >
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">Mon compte</span>
            </button>
          ) : (
            <button
              onClick={() => navigate("/auth")}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary text-sm font-medium text-foreground hover:bg-secondary/80 transition-all"
            >
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">Connexion</span>
            </button>
          )}
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
