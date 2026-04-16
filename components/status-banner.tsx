import { AlertCircle, CheckCircle2, Info } from "lucide-react";

import { cn } from "@/lib/utils/cn";

interface StatusBannerProps {
  tone?: "info" | "success" | "error";
  message: string;
}

const toneStyles = {
  info: {
    wrapper: "border-sky-200 bg-sky-50/85 text-sky-950",
    icon: Info,
    iconClass: "text-sky-700",
  },
  success: {
    wrapper: "border-emerald-200 bg-emerald-50/85 text-emerald-950",
    icon: CheckCircle2,
    iconClass: "text-emerald-700",
  },
  error: {
    wrapper: "border-red-200 bg-red-50/85 text-red-950",
    icon: AlertCircle,
    iconClass: "text-red-700",
  },
} as const;

export function StatusBanner({ tone = "info", message }: StatusBannerProps) {
  const toneStyle = toneStyles[tone];
  const Icon = toneStyle.icon;

  return (
    <div
      aria-live="polite"
      className={cn("flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm", toneStyle.wrapper)}
      role="status"
    >
      <Icon className={cn("mt-0.5 h-5 w-5", toneStyle.iconClass)} />
      <p className="leading-6">{message}</p>
    </div>
  );
}
