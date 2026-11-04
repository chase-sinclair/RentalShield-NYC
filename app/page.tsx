import Link from "next/link";
import { ArrowRight, Building2, MapPinned, ShieldCheck, Sparkles } from "lucide-react";

import { ReportPreview } from "@/components/report-preview";
import { Card } from "@/components/ui/card";

const featureCards = [
  {
    icon: ShieldCheck,
    title: "Explainable scam scoring",
    description: "Risk output is organized into ranked factors, verified facts, and next steps.",
  },
  {
    icon: MapPinned,
    title: "Manhattan-first verification",
    description: "The MVP is optimized around Manhattan addresses and rental context checks.",
  },
  {
    icon: Building2,
    title: "Listing, text, and screenshot evidence",
    description: "Users can combine listing URLs, pasted messages, and screenshots in one flow.",
  },
];

export default function HomePage() {
  return (
    <div className="pb-16">
      <section className="mx-auto grid max-w-6xl gap-10 px-4 pb-10 pt-10 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8 lg:pt-16">
        <div className="space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/70 px-4 py-2 text-sm font-medium text-muted-foreground shadow-sm">
            <Sparkles className="h-4 w-4 text-primary" />
            Trust-oriented Manhattan rental screening MVP
          </div>
          <div className="space-y-5">
            <h1 className="max-w-3xl text-balance text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
              Check whether a Manhattan rental listing feels credible before you send money.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-muted-foreground">
              RentalShield NYC combines listing details, message signals, screenshot evidence, and
              structured tool outputs into an explainable scam-risk estimate built for mobile-first
              renter workflows.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              className="inline-flex h-12 items-center justify-center rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
              href="/analyze"
            >
              Start Analysis
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <Link
              className="inline-flex h-12 items-center justify-center rounded-full border border-border bg-white/80 px-6 text-sm font-semibold text-foreground transition hover:bg-secondary"
              href="/results/mock-manhattan-demo"
            >
              View Sample Result
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {featureCards.map((card) => (
              <Card className="p-5" key={card.title}>
                <card.icon className="h-5 w-5 text-primary" />
                <h2 className="mt-4 font-semibold">{card.title}</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{card.description}</p>
              </Card>
            ))}
          </div>
        </div>

        <ReportPreview />
      </section>
    </div>
  );
}
