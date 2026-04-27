import { describe, expect, it } from "vitest";
import {
  GENERAL_ANALYSIS_TARGET_JOB,
  TARGETED_UNSPECIFIED_TARGET_JOB,
  getAnalysisMode,
  getStoredTargetJob,
  normalizeAnalysisMode,
} from "./analysisTypes";

describe("analysisTypes", () => {
  it("uses targeted mode when a target job is provided", () => {
    expect(getAnalysisMode("Chef de projet", "")).toBe("targeted");
  });

  it("uses targeted mode when an offer is provided without a target job", () => {
    expect(getAnalysisMode("", "Nous recherchons un chef de projet digital.")).toBe("targeted");
  });

  it("uses general mode when neither a target job nor an offer is provided", () => {
    expect(getAnalysisMode("", "")).toBe("general");
  });

  it("stores the generic target job fallback for general analyses", () => {
    expect(getStoredTargetJob("", "general")).toBe(GENERAL_ANALYSIS_TARGET_JOB);
  });

  it("keeps the entered target job when provided", () => {
    expect(getStoredTargetJob(" Chef de projet ", "targeted")).toBe("Chef de projet");
  });

  it("stores a neutral fallback for targeted analyses with an offer but no target job", () => {
    expect(getStoredTargetJob("", "targeted")).toBe(TARGETED_UNSPECIFIED_TARGET_JOB);
    expect(getStoredTargetJob("", "targeted", 2)).toBe(`${TARGETED_UNSPECIFIED_TARGET_JOB} #2`);
  });

  it("normalizes missing analysis modes as targeted for old data", () => {
    expect(normalizeAnalysisMode(undefined)).toBe("targeted");
    expect(normalizeAnalysisMode("general")).toBe("general");
  });
});
