import { CheckCircle2, FileSearch, ShieldAlert } from "lucide-react";

const verifiedFacts = [
  ["Address", "432 E 11th St #1W"],
  ["Neighborhood", "East Village"],
  ["Contact", "Official NY name match"],
];

const factors = [
  ["Rent context", "+18"],
  ["Message pressure", "Clear"],
  ["Address match", "Clear"],
];

export function ReportPreview() {
  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-white/88 shadow-soft backdrop-blur">
      <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-r from-primary/12 via-emerald-500/8 to-amber-400/12" />
      <div className="relative grid gap-0 lg:grid-cols-[220px_1fr]">
        <div className="bg-primary px-6 py-7 text-primary-foreground">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary-foreground/70">
            Scam Risk Score
          </p>
          <p className="mt-4 text-6xl font-semibold leading-none">18</p>
          <p className="mt-4 text-sm leading-6 text-primary-foreground/80">Low risk result with one rent-context note.</p>
          <div className="mt-8 grid grid-cols-3 gap-1 text-center text-[10px] font-semibold uppercase tracking-[0.16em]">
            <span className="rounded-full bg-emerald-400 py-1 text-primary">Low</span>
            <span className="rounded-full bg-amber-300 py-1 text-primary">Med</span>
            <span className="rounded-full bg-red-400 py-1 text-white">High</span>
          </div>
        </div>

        <div className="space-y-5 px-6 py-7">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-900">
                Low Risk
              </span>
              <h2 className="mt-4 text-2xl font-semibold text-foreground">Report preview</h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                RentalShield turns messy rental evidence into a clear score, facts, and next steps.
              </p>
            </div>
            <FileSearch className="hidden h-8 w-8 text-primary sm:block" />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-border bg-secondary/35 p-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Verified facts
                </p>
              </div>
              <div className="mt-4 space-y-3">
                {verifiedFacts.map(([label, value]) => (
                  <div className="flex items-center justify-between gap-4 text-sm" key={label}>
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-semibold text-foreground">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-secondary/35 p-4">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-amber-700" />
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Ranked signals
                </p>
              </div>
              <div className="mt-4 space-y-3">
                {factors.map(([label, value]) => (
                  <div className="flex items-center justify-between gap-4 text-sm" key={label}>
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-semibold text-foreground">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 text-sm leading-6 text-emerald-950">
            Suggested next step: proceed with the showing, verify terms in writing, and wait to send money until the details line up.
          </div>
        </div>
      </div>
    </div>
  );
}
