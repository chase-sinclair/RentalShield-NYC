"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { DisclaimerBanner } from "@/components/disclaimer-banner";
import { LoadingAnalysis } from "@/components/loading-analysis";
import { UploadDropzone } from "@/components/upload-dropzone";
import { saveAnalysisResult } from "@/lib/utils/analysis-storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { AnalysisResponse, UploadResponse } from "@/types";

interface AnalysisFormProps {
  compact?: boolean;
}

export function AnalysisForm({ compact = false }: AnalysisFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [listingUrl, setListingUrl] = useState("");
  const [messageText, setMessageText] = useState("");
  const [manualRent, setManualRent] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submissionStage, setSubmissionStage] = useState<string | null>(null);

  const canSubmit = Boolean(listingUrl || messageText || files.length);

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
    setSubmitting(true);
    setSubmissionStage(files.length ? "Validating and uploading screenshot evidence..." : "Preparing analysis request...");

    try {
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
          messageText: messageText.trim() || undefined,
          manualRent: normalizedRent,
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
      <div className={`grid gap-4 ${compact ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-2"}`}>
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground" htmlFor="listing-url">
            Listing URL
          </label>
          <Input
            id="listing-url"
            disabled={submitting}
            placeholder="https://streeteasy.com/building/example-listing"
            value={listingUrl}
            onChange={(event) => setListingUrl(event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground" htmlFor="manual-rent">
            Optional quoted rent
          </label>
          <Input
            id="manual-rent"
            disabled={submitting}
            inputMode="numeric"
            placeholder="$3,250"
            value={manualRent}
            onChange={(event) => setManualRent(event.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground" htmlFor="message-text">
          Email or text message content
        </label>
        <Textarea
          id="message-text"
          disabled={submitting}
          placeholder="Paste anything the broker or landlord sent, especially pricing, urgency, deposit requests, or touring details."
          value={messageText}
          onChange={(event) => setMessageText(event.target.value)}
        />
      </div>

      <UploadDropzone
        disabled={submitting}
        helperText="Upload screenshots from your phone or desktop. We validate file count, type, and size on the server before analysis."
        onFilesChange={setFiles}
      />

      {submitting && submissionStage ? (
        <LoadingAnalysis summary={submissionStage} />
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button className="w-full sm:w-auto" disabled={pending || submitting} size="lg" type="submit">
          {pending || submitting ? "Analyzing Listing..." : "Analyze Listing"}
        </Button>
        <Link
          className="inline-flex h-12 w-full items-center justify-center rounded-full border border-border bg-white/80 px-6 text-sm font-semibold text-foreground transition hover:bg-secondary sm:w-auto"
          href="/analyze"
        >
          Open Full Analysis Page
        </Link>
      </div>

      <DisclaimerBanner compact />
    </form>
  );
}
