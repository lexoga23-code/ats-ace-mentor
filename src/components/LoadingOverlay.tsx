const LoadingOverlay = () => (
  <div className="mt-12 text-center py-12">
    <h3 className="text-2xl font-bold mb-4 text-foreground">⏳ Analyse en cours…</h3>
    <p className="text-muted-foreground mb-6">
      Votre CV est analysé par notre IA. Ne quittez pas cette page — le résultat apparaît ici dans quelques secondes.
    </p>
    <div className="flex justify-center gap-2">
      <div className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce-dot" />
      <div className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce-dot animate-bounce-dot-delay-1" />
      <div className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce-dot animate-bounce-dot-delay-2" />
    </div>
  </div>
);

export default LoadingOverlay;
