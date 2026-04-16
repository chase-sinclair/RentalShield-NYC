"use client";

import { ImagePlus, X } from "lucide-react";
import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

interface UploadDropzoneProps {
  maxFiles?: number;
  onFilesChange?: (files: File[]) => void;
}

export function UploadDropzone({ maxFiles = 5, onFilesChange }: UploadDropzoneProps) {
  const inputId = useId();
  const [files, setFiles] = useState<File[]>([]);

  function updateFiles(nextFiles: File[]) {
    const bounded = nextFiles.slice(0, maxFiles);
    setFiles(bounded);
    onFilesChange?.(bounded);
  }

  return (
    <div className="space-y-4">
      <label
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-[1.5rem] border border-dashed border-border bg-secondary/50 px-6 py-10 text-center transition hover:border-primary hover:bg-secondary",
        )}
        htmlFor={inputId}
      >
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-primary shadow-sm">
          <ImagePlus className="h-6 w-6" />
        </span>
        <div className="space-y-1">
          <p className="font-medium">Upload screenshots of texts, emails, or listing details</p>
          <p className="text-sm text-muted-foreground">
            Mobile-friendly image picker. PNG, JPG, HEIC-friendly server validation can be added later.
          </p>
        </div>
        <input
          className="sr-only"
          id={inputId}
          multiple
          accept="image/*"
          type="file"
          onChange={(event) => updateFiles(Array.from(event.target.files ?? []))}
        />
      </label>

      {files.length ? (
        <div className="space-y-2">
          {files.map((file, index) => (
            <div
              className="flex items-center justify-between rounded-2xl border border-border bg-white px-4 py-3 text-sm"
              key={`${file.name}-${index}`}
            >
              <div>
                <p className="font-medium">{file.name}</p>
                <p className="text-muted-foreground">{Math.round(file.size / 1024)} KB</p>
              </div>
              <Button
                size="sm"
                type="button"
                variant="ghost"
                onClick={() => updateFiles(files.filter((candidate) => candidate !== file))}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
