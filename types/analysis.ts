export type ScamRiskLabel = "low" | "medium" | "high";
export type Severity = "low" | "medium" | "high";
export type EvidenceSource = "url" | "message" | "screenshot" | "tool";
export type ContactRole = "broker_agent" | "owner" | "property_manager" | "leasing_office" | "unknown";

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
  contactRole?: ContactRole;
  brokerName?: string;
  company?: string;
  contactEmail?: string;
  contactPhone?: string;
  licenseNumber?: string;
  paymentMethod?: string;
  urgencySignals: string[];
  tourLimitations: string[];
}

export interface AnalysisInput {
  listingUrl?: string;
  manualAddress?: string;
  messageText?: string;
  manualRent?: number;
  contactRole?: ContactRole;
  contactName?: string;
  contactCompany?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactLicenseNumber?: string;
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
  extractedContactRole?: ContactRole;
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

export interface StagedUploadAsset extends UploadAsset {
  base64Data: string;
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

export interface AddressPreflightResponse {
  ok: boolean;
  addressFound: boolean;
  candidateAddress?: string;
  source?: "message" | "manual" | "metadata" | "url";
  needsManualAddress: boolean;
  notes: string[];
}
