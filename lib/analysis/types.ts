export interface ServiceHealth {
  name: string;
  status: "ready" | "mock" | "unconfigured";
  detail: string;
}

export interface ExtractionSignalSet {
  brokerName?: string;
  company?: string;
  paymentMethod?: string;
  urgencySignals: string[];
  tourLimitations: string[];
  confidence: number;
  notes: string[];
  modelIdUsed: string;
}

export interface ScreenshotExtractionResult {
  text: string;
  confidence: number;
  fileCount: number;
  notes: string[];
  modelIdUsed: string;
}

export interface RiskScoringResult {
  score: number;
  label: "low" | "medium" | "high";
  rankedFactors: {
    title: string;
    severity: "low" | "medium" | "high";
    contribution: number;
    explanation: string;
    evidenceSource: "url" | "message" | "screenshot" | "tool";
  }[];
  summary: string;
  recommendedNextSteps: string[];
  notes: string[];
  modelIdUsed: string;
}
