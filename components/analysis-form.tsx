"use client";

import { AlertTriangle, Building2, MessageSquareText } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { DisclaimerBanner } from "@/components/disclaimer-banner";
import { LoadingAnalysis } from "@/components/loading-analysis";
import { StatusBanner } from "@/components/status-banner";
import { UploadDropzone } from "@/components/upload-dropzone";
import { saveAnalysisResult } from "@/lib/utils/analysis-storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { AddressPreflightResponse, AnalysisResponse, ContactRole, UploadResponse } from "@/types";

interface AnalysisFormProps {
  initialPath?: AnalysisPath;
}

type AnalysisPath = "listing" | "contact";

const pathOptions: {
  value: AnalysisPath;
  title: string;
  description: string;
  inputs: string;
}[] = [
  {
    value: "listing",
    title: "I found a listing",
    description: "Fast gut-check for a listing you want to verify before applying.",
    inputs: "URL, rent, screenshots",
  },
  {
    value: "contact",
    title: "Someone contacted me",
    description: "Deeper review of the message, person, and claims being made.",
    inputs: "Message, contact name, screenshots",
  },
];

export function AnalysisForm({ initialPath = "listing" }: AnalysisFormProps) {
  const contactRoleOptions: { value: ContactRole; label: string }[] = [
    { value: "broker_agent", label: "Broker / agent" },
    { value: "owner", label: "Owner / landlord" },
    { value: "property_manager", label: "Property manager" },
    { value: "leasing_office", label: "Leasing office" },
    { value: "unknown", label: "Unknown" },
  ];
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [analysisPath, setAnalysisPath] = useState<AnalysisPath>(initialPath);
  const [listingUrl, setListingUrl] = useState("");
  const [manualAddress, setManualAddress] = useState("");
  const [messageText, setMessageText] = useState("");
  const [manualRent, setManualRent] = useState("");
  const [contactRole, setContactRole] = useState<ContactRole | "">("");
  const [contactName, setContactName] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submissionStage, setSubmissionStage] = useState<string | null>(null);
  const [successNote, setSuccessNote] = useState<string | null>(null);
  const [needsManualAddress, setNeedsManualAddress] = useState(false);
  const [allowAddresslessAnalysis, setAllowAddresslessAnalysis] = useState(false);
  const [addressPreflightNote, setAddressPreflightNote] = useState<string | null>(null);

  const canSubmit = Boolean(listingUrl || messageText || files.length);
  const isListingPath = analysisPath === "listing";

  function normalizeManualRent(value: string) {
    const digitsOnly = value.replace(/[^0-9.]/g, "").trim();

    if (!digitsOnly) {
      return undefined;
    }

    const parsed = Number(digitsOnly);
    return Number.isFinite(parsed) ? parsed : Number.NaN;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSubmit) {
      setError("Add a listing URL, message, or screenshots to start.");
      return;
    }

    const normalizedRent = normalizeManualRent(manualRent);

    if (Number.isNaN(normalizedRent)) {
      setError("Optional rent must be a valid number, like 3250.");
      return;
    }

    setError(null);
    setSuccessNote(null);
    setAddressPreflightNote(null);
    setSubmitting(true);
    setSubmissionStage("Checking whether we can identify the rental address...");

    try {
      if (!allowAddresslessAnalysis) {
        const preflightResponse = await fetch("/api/analyze/preflight", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            listingUrl: listingUrl.trim() || undefined,
            manualAddress: manualAddress.trim() || undefined,
            messageText: messageText.trim() || undefined,
            manualRent: normalizedRent,
            contactRole: contactRole || undefined,
            contactName: contactName.trim() || undefined,
          }),
        });

        const preflightPayload = (await preflightResponse.json()) as
          | AddressPreflightResponse
          | {
              ok: false;
              errors?: {
                formErrors?: string[];
                fieldErrors?: Record<string, string[] | undefined>;
              };
            };

        if (!preflightResponse.ok || !preflightPayload.ok) {
          const formError =
            "errors" in preflightPayload
              ? preflightPayload.errors?.formErrors?.[0] ??
                Object.values(preflightPayload.errors?.fieldErrors ?? {})
                  .flat()
                  .filter(Boolean)[0]
              : null;

          setError(formError ?? "We could not preflight that submission yet. Please try again.");
          return;
        }

        if (preflightPayload.needsManualAddress) {
          setNeedsManualAddress(true);
          setAddressPreflightNote(
            "We could not identify the rental address from the listing, message, or page metadata. Add it manually to unlock stronger address, rent, and property checks.",
          );
          return;
        }

        setNeedsManualAddress(false);
        setAddressPreflightNote(
          preflightPayload.candidateAddress
            ? `Address found from ${preflightPayload.source ?? "submitted evidence"}: ${preflightPayload.candidateAddress}`
            : null,
        );
      }

      setSubmissionStage(files.length ? "Validating and uploading screenshot evidence..." : "Preparing analysis request...");
      let screenshotAssets: UploadResponse["files"] = [];

      if (files.length) {
        const uploadFormData = new FormData();
        files.forEach((file) => {
          uploadFormData.append("files", file);
        });

        const uploadResponse = await fetch("/api/upload", {
          method: "POST",
          body: uploadFormData,
        });

        const uploadPayload = (await uploadResponse.json()) as
          | UploadResponse
          | {
              ok: false;
              error?: string;
            };

        if (!uploadResponse.ok || !uploadPayload.ok) {
          setError(
            "error" in uploadPayload && uploadPayload.error
              ? uploadPayload.error
              : "Your screenshots could not be uploaded yet. Please try again.",
          );
          return;
        }

        screenshotAssets = uploadPayload.files;
      }

      setSubmissionStage("Reviewing listing, text, and screenshot evidence...");

      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          listingUrl: listingUrl.trim() || undefined,
          manualAddress: manualAddress.trim() || undefined,
          messageText: messageText.trim() || undefined,
          manualRent: normalizedRent,
          contactRole: contactRole || undefined,
          contactName: contactName.trim() || undefined,
          screenshotAssets,
        }),
      });

      const payload = (await response.json()) as
        | AnalysisResponse
        | {
            ok: false;
            errors?: {
              formErrors?: string[];
              fieldErrors?: Record<string, string[] | undefined>;
            };
          };

      if (!response.ok || !payload.ok) {
        const formError =
          "errors" in payload
            ? payload.errors?.formErrors?.[0] ??
              Object.values(payload.errors?.fieldErrors ?? {})
                .flat()
                .filter(Boolean)[0]
            : null;

        setError(formError ?? "We couldn't analyze that submission yet. Please try again.");
        return;
      }

      saveAnalysisResult(payload.data);
      setSuccessNote(
        payload.persistence?.persisted
          ? "Analysis saved to Supabase and ready to revisit by result ID."
          : payload.persistence?.detail ?? "Analysis generated for the current session.",
      );
      setSubmissionStage("Opening your results...");

      startTransition(() => {
        router.push(`/results/${payload.data.id}`);
      });
    } catch {
      setError("The analysis request failed before a response came back. Please try again.");
    } finally {
      setSubmitting(false);
      setSubmissionStage(null);
    }
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="grid gap-4 lg:grid-cols-2">
        {pathOptions.map((option) => {
          const selected = analysisPath === option.value;
          const Icon = option.value === "listing" ? Building2 : MessageSquareText;

          return (
            <button
              className={`rounded-[1.5rem] border p-5 text-left transition ${
                selected
                  ? "border-primary bg-primary text-primary-foreground shadow-soft"
                  : "border-border bg-white/75 text-foreground hover:bg-white"
              }`}
              disabled={submitting}
              key={option.value}
              onClick={() => setAnalysisPath(option.value)}
              type="button"
            >
              <Icon className={`h-5 w-5 ${selected ? "text-primary-foreground" : "text-primary"}`} />
              <span className="mt-4 block text-base font-semibold">{option.title}</span>
              <span className={`mt-2 block text-sm leading-6 ${selected ? "text-primary-foreground/78" : "text-muted-foreground"}`}>
                {option.description}
              </span>
              <span className={`mt-4 block text-xs font-semibold uppercase tracking-[0.2em] ${selected ? "text-primary-foreground/72" : "text-muted-foreground"}`}>
                {option.inputs}
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground" htmlFor="listing-url">
            Listing URL
          </label>
          <Input
            aria-describedby="listing-url-help"
            id="listing-url"
            disabled={submitting}
            placeholder="https://streeteasy.com/building/example-listing"
            value={listingUrl}
            onChange={(event) => setListingUrl(event.target.value)}
          />
          <p className="text-sm text-muted-foreground" id="listing-url-help">
            {isListingPath
              ? "Paste the public listing URL. StreetEasy, Redfin, Apartments.com, Zillow, and broker pages are best-effort supported."
              : "Optional if the conversation includes a listing link."}
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground" htmlFor="manual-rent">
            Optional quoted rent
          </label>
          <Input
            aria-describedby="manual-rent-help"
            id="manual-rent"
            disabled={submitting}
            inputMode="numeric"
            placeholder="$3,250"
            value={manualRent}
            onChange={(event) => setManualRent(event.target.value)}
          />
          <p className="text-sm text-muted-foreground" id="manual-rent-help">
            Optional fallback if the listing or message does not clearly state the rent.
          </p>
        </div>
      </div>

      <div className={`space-y-2 rounded-[1.5rem] border p-4 ${isListingPath ? "border-border bg-white/70" : "border-primary/35 bg-white"}`}>
        <label className="text-sm font-medium text-foreground" htmlFor="message-text">
          Email or text message content
        </label>
        <Textarea
          aria-describedby="message-text-help"
          id="message-text"
          disabled={submitting}
          placeholder="Paste anything the broker or landlord sent, especially pricing, urgency, deposit requests, or touring details."
          value={messageText}
          onChange={(event) => setMessageText(event.target.value)}
        />
        <p className="text-sm text-muted-foreground" id="message-text-help">
          Include pressure language, payment requests, showing details, and any claimed contact or company details.
        </p>
      </div>

      <div className={`space-y-4 rounded-[1.5rem] border p-4 ${isListingPath ? "border-border bg-white/70" : "border-primary/35 bg-white"}`}>
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-foreground">Optional contact identity details</h3>
          <p className="text-sm text-muted-foreground">
            {isListingPath
              ? "Use this if the listing or message named the contact."
              : "Use this to verify whether the contact name appears in official NY real estate license data."}
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="contact-role">
              Contact role
            </label>
            <select
              className="flex h-11 w-full rounded-2xl border border-border bg-white px-4 text-sm text-foreground shadow-sm outline-none transition placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={submitting}
              id="contact-role"
              value={contactRole}
              onChange={(event) => setContactRole(event.target.value as ContactRole | "")}
            >
              <option value="">Select if known</option>
              {contactRoleOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="contact-name">
              Contact name
            </label>
            <Input
              disabled={submitting}
              id="contact-name"
              placeholder="Jane Broker"
              value={contactName}
              onChange={(event) => setContactName(event.target.value)}
            />
          </div>
        </div>

      </div>

      {needsManualAddress || manualAddress ? (
        <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50/70 p-4">
          <div className="flex gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold text-amber-950">Rental address needed</h3>
                <p className="mt-1 text-sm leading-6 text-amber-900">
                  {addressPreflightNote ??
                    "Add the address manually if the listing source does not expose it clearly."}
                </p>
              </div>
              <Input
                disabled={submitting}
                placeholder="432 East 11th Street #1W"
                value={manualAddress}
                onChange={(event) => {
                  setManualAddress(event.target.value);
                  setAllowAddresslessAnalysis(false);
                }}
              />
              {needsManualAddress ? (
                <button
                  className="text-sm font-semibold text-amber-950 underline underline-offset-4"
                  disabled={submitting}
                  onClick={() => {
                    setAllowAddresslessAnalysis(true);
                    setNeedsManualAddress(false);
                    setAddressPreflightNote(
                      "Continuing without an address. Address, rent, and property checks may be limited.",
                    );
                  }}
                  type="button"
                >
                  Continue without an address
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {addressPreflightNote && !needsManualAddress && !submitting ? (
        <StatusBanner message={addressPreflightNote} tone="info" />
      ) : null}

      <UploadDropzone
        disabled={submitting}
        helperText="Upload screenshots from your phone or desktop. We validate file count, type, and size on the server before analysis."
        onFilesChange={setFiles}
      />

      {submitting && submissionStage ? (
        <LoadingAnalysis summary={submissionStage} />
      ) : null}

      {error ? <StatusBanner message={error} tone="error" /> : null}
      {successNote && !submitting ? <StatusBanner message={successNote} tone="success" /> : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button className="w-full sm:w-auto" disabled={pending || submitting} size="lg" type="submit">
          {pending || submitting ? "Analyzing Listing..." : "Analyze Listing"}
        </Button>
      </div>

      <DisclaimerBanner compact />
    </form>
  );
}
