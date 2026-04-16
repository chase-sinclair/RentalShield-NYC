export type ScamRiskLabel = "low" | "medium" | "high";
export type Severity = "low" | "medium" | "high";
export type EvidenceSource = "url" | "message" | "screenshot" | "tool";

export interface RankedFactor {
  title: string;
  severity: Severity;
  contribution: number;
  explanation: string;
  evidenceSource: EvidenceSource;
}

export interface VerifiedFact {
  label: string;
  value: string;
  source: string;
}

export interface ExtractedFacts {
  address?: string;
  borough?: string;
  neighborhood?: string;
  claimedRent?: number;
  brokerName?: string;
  company?: string;
  paymentMethod?: string;
  urgencySignals: string[];
  tourLimitations: string[];
}

export interface AnalysisInput {
  listingUrl?: string;
  messageText?: string;
  manualRent?: number;
  screenshotAssets?: UploadAsset[];
}

export interface AnalysisResult {
  id: string;
  score: number;
  label: ScamRiskLabel;
  summary: string;
  confidenceNote: string;
  systemNotes: string[];
  rankedFactors: RankedFactor[];
  verifiedFacts: VerifiedFact[];
  unverifiedOrMissing: string[];
  recommendedNextSteps: string[];
  scopeNotes: string[];
  extractedFacts: ExtractedFacts;
  normalizedAddress?: string;
  borough?: string;
  neighborhood?: string;
  extractedRent?: number;
  extractedBrokerName?: string;
  extractedCompany?: string;
  configuredModelId: string;
  modelIdUsed: string;
  disclaimer: string;
  checksRun: string[];
  unavailableChecks: string[];
  createdAt: string;
}

export interface AnalysisResponse {
  ok: boolean;
  data: AnalysisResult;
  trace?: {
    toolName: string;
    status: "completed" | "skipped" | "failed";
    detail: string;
  }[];
  persistence?: {
    persisted: boolean;
    detail: string;
  };
}

export interface UploadAsset {
  id: string;
  name: string;
  contentType: string;
  size: number;
}

export interface UploadResponse {
  ok: boolean;
  files: UploadAsset[];
  limits: {
    maxUploadFileCount: number;
    maxUploadFileSizeMb: number;
  };
  notes?: string[];
}
