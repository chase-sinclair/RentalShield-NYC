import Link from "next/link";
import { ShieldCheck } from "lucide-react";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/analyze", label: "Analyze" },
  { href: "/disclaimer", label: "Disclaimer" },
] as const;

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/70 bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link className="flex items-center gap-3" href="/">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <span>
            <span className="block text-sm font-semibold tracking-[0.22em] text-muted-foreground">
              MANHATTAN MVP
            </span>
            <span className="block text-lg font-semibold">RentalShield NYC</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          {navItems.map((item) => (
            <Link className="transition hover:text-foreground" href={item.href} key={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>

        <nav className="flex items-center gap-3 text-sm text-muted-foreground md:hidden">
          <Link className="rounded-full px-3 py-2 transition hover:bg-secondary hover:text-foreground" href="/">
            Home
          </Link>
          <Link
            className="rounded-full px-3 py-2 transition hover:bg-secondary hover:text-foreground"
            href="/analyze"
          >
            Analyze
          </Link>
        </nav>

        <Link
          className="hidden rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 md:inline-flex"
          href="/analyze"
        >
          Start Analysis
        </Link>
      </div>
    </header>
  );
}
