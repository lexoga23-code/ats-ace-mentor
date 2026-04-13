import { useState } from "react";

const OPTIONS = [
  "LinkedIn",
  "Reddit",
  "Par un ami",
  "Google",
  "Twitter / X",
  "TikTok",
  "YouTube",
  "Autre",
];

export function DiscoveryQuestion() {
  const [selected, setSelected] = useState<string | null>(null);

  const handleSelect = (option: string) => {
    setSelected(option);
    localStorage.setItem("scorecv_discovery_source", option);
  };

  return (
    <div className="flex flex-col items-center gap-4 mt-6 w-full max-w-md mx-auto">
      <p className="text-sm font-medium text-center text-muted-foreground">
        Comment avez-vous découvert ScoreCV ?
      </p>
      <div className="flex flex-wrap gap-2 justify-center">
        {OPTIONS.map((option) => (
          <button
            key={option}
            onClick={() => handleSelect(option)}
            className={`px-4 py-2 rounded-full text-sm border transition-all duration-150
              ${
                selected === option
                  ? "bg-primary/10 border-primary text-primary font-medium"
                  : "bg-card border-border text-muted-foreground hover:border-primary hover:text-primary"
              }
            `}
          >
            {option}
          </button>
        ))}
      </div>
      {selected && (
        <p className="text-xs text-muted-foreground transition-opacity duration-300">
          Merci ! Ça nous aide beaucoup 🙏
        </p>
      )}
    </div>
  );
}
