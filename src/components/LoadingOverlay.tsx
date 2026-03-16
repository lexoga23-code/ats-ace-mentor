import { useState, useEffect } from "react";

const STEPS = [
  { label: "Extraction du contenu…", duration: 2000 },
  { label: "Analyse du format ATS…", duration: 3000 },
  { label: "Vérification des mots-clés…", duration: 3000 },
  { label: "Évaluation de la lisibilité…", duration: 2500 },
  { label: "Génération du rapport…", duration: 2000 },
];

const LoadingOverlay = () => {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    let elapsed = 0;
    STEPS.forEach((s, i) => {
      if (i > 0) {
        elapsed += STEPS[i - 1].duration;
        timers.push(setTimeout(() => setStep(i), elapsed));
      }
    });
    return () => timers.forEach(clearTimeout);
  }, []);

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60">
      <div className="bg-card p-10 rounded-3xl shadow-soft max-w-md w-full mx-4 text-center space-y-6">
        <div className="relative w-24 h-24 mx-auto">
          <svg className="w-24 h-24 animate-spin-slow" viewBox="0 0 96 96">
            <circle cx="48" cy="48" r="42" strokeWidth="6" fill="transparent" className="stroke-secondary" />
            <circle
              cx="48" cy="48" r="42" strokeWidth="6" fill="transparent"
              strokeDasharray="264"
              strokeDashoffset={264 - (264 * progress) / 100}
              className="stroke-primary transition-all duration-700 ease-out"
              strokeLinecap="round"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-foreground">
            {Math.round(progress)}%
          </span>
        </div>

        <div>
          <h3 className="text-xl font-bold text-foreground mb-2">Analyse en cours</h3>
          <p className="text-primary font-medium text-sm">{STEPS[step].label}</p>
        </div>

        <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-700 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        <p className="text-xs text-muted-foreground">
          Ne quittez pas cette page — votre rapport arrive dans quelques secondes.
        </p>
      </div>
    </div>
  );
};

export default LoadingOverlay;
