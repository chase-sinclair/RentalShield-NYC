import type { ScamRiskLabel } from "@/types";

export function formatCurrency(value?: number) {
  if (typeof value !== "number") {
    return "Unavailable";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatRiskLabel(label: ScamRiskLabel) {
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function formatPercent(value: number) {
  return `${Math.round(value)}%`;
}
