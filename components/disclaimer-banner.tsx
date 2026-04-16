import { AlertTriangle } from "lucide-react";

import { Card } from "@/components/ui/card";

interface DisclaimerBannerProps {
  compact?: boolean;
}

export function DisclaimerBanner({ compact = false }: DisclaimerBannerProps) {
  return (
    <Card className={compact ? "rounded-2xl p-4" : "border-amber-200/80 bg-amber-50/80"}>
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-700" />
        <p className="text-sm leading-6 text-amber-950">
          RentalShield NYC provides an informational risk estimate based on the evidence you submit.
          It does not provide legal advice, guarantee that a listing is legitimate, or replace
          independent verification. Never send money or sensitive personal information until you
          have independently verified the property, the person, and the lease process.
        </p>
      </div>
    </Card>
  );
}
