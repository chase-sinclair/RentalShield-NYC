import Link from "next/link";
import { AlertCircle } from "lucide-react";

import { Card } from "@/components/ui/card";

interface ErrorStateProps {
  title: string;
  description: string;
  actionHref?: "/" | "/analyze" | "/disclaimer";
  actionLabel?: string;
}

export function ErrorState({
  title,
  description,
  actionHref = "/analyze",
  actionLabel = "Back to Analysis",
}: ErrorStateProps) {
  return (
    <Card className="space-y-4 border-red-200 bg-red-50/85" role="alert">
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5 text-red-700" />
        <div>
          <h2 className="text-lg font-semibold text-red-950">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-red-900">{description}</p>
        </div>
      </div>
      <Link
        className="inline-flex h-11 items-center justify-center rounded-full border border-border bg-white px-5 text-sm font-semibold text-foreground transition hover:bg-secondary"
        href={actionHref}
      >
        {actionLabel}
      </Link>
    </Card>
  );
}
