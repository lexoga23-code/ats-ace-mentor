export type AnalysisMode = "targeted" | "general";

export const DEFAULT_ANALYSIS_MODE: AnalysisMode = "targeted";
export const GENERAL_ANALYSIS_TARGET_JOB = "Analyse générale du CV";
export const TARGETED_UNSPECIFIED_TARGET_JOB = "Poste non précisé";

export const getAnalysisMode = (targetJob: string, jobDescription: string): AnalysisMode =>
  targetJob.trim() || jobDescription.trim() ? "targeted" : "general";

export const normalizeAnalysisMode = (value: unknown): AnalysisMode =>
  value === "general" ? "general" : DEFAULT_ANALYSIS_MODE;

export const getStoredTargetJob = (
  targetJob: string,
  analysisMode: AnalysisMode,
  untitledTargetedIndex = 1
): string => {
  const trimmedTargetJob = targetJob.trim();

  if (trimmedTargetJob) return trimmedTargetJob;
  if (analysisMode === "general") return GENERAL_ANALYSIS_TARGET_JOB;

  return untitledTargetedIndex > 1
    ? `${TARGETED_UNSPECIFIED_TARGET_JOB} #${untitledTargetedIndex}`
    : TARGETED_UNSPECIFIED_TARGET_JOB;
};
