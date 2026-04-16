import type { AnalysisResult } from "@/types";

const STORAGE_PREFIX = "rentalshield:analysis:";

function getStorageKey(id: string) {
  return `${STORAGE_PREFIX}${id}`;
}

export function saveAnalysisResult(result: AnalysisResult) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(getStorageKey(result.id), JSON.stringify(result));
}

export function loadAnalysisResult(id: string) {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.sessionStorage.getItem(getStorageKey(id));

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AnalysisResult;
  } catch {
    window.sessionStorage.removeItem(getStorageKey(id));
    return null;
  }
}
