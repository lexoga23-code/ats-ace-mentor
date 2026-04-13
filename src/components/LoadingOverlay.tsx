interface LoadingOverlayProps {
  progress?: number; // 0-100, real progress from parent
  stepLabel?: string;
}

import { DiscoveryQuestion } from "./DiscoveryQuestion";

interface LoadingOverlayProps {
  progress?: number;
  stepLabel?: string;
}

const LoadingOverlay = ({ progress = 0, stepLabel }: LoadingOverlayProps) => {
  const displayProgress = Math.min(Math.round(progress), 100);

  const defaultLabel =
    progress < 30
      ? "Analyse du CV en cours…"
      : progress < 60
        ? "Calcul du score ATS…"
        : progress < 85
          ? "Génération du rapport…"
          : "Finalisation…";

  const label = stepLabel || defaultLabel;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60">
      <div className="bg-card p-10 rounded-3xl shadow-soft max-w-md w-full mx-4 text-center space-y-6">
        <div className="relative w-24 h-24 mx-auto">
          <svg className="w-24 h-24 animate-spin-slow" viewBox="0 0 96 96">
            <circle cx="48" cy="48" r="42" strokeWidth="6" fill="transparent" className="stroke-secondary" />
            <circle
              cx="48" cy="48" r="42" strokeWidth="6" fill="transparent"
              strokeDasharray="264"
              strokeDashoffset={264 - (264 * displayProgress) / 100}
              className="stroke-primary transition-all duration-700 ease-out"
              strokeLinecap="round"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-foreground">
            {displayProgress}%
          </span>
        </div>

        <div>
          <h3 className="text-xl font-bold text-foreground mb-2">Analyse en cours</h3>
          <p className="text-primary font-medium text-sm">{label}</p>
        </div>

        <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-700 ease-out"
            style={{ width: `${displayProgress}%` }}
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
