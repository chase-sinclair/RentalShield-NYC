import Link from "next/link";
import { Shield } from "lucide-react";

export function SiteHeader({ appName }: { appName: string }) {
  return (
    <header className="apt-header">
      <div className="apt-shell apt-header-inner">
        <Link className="apt-brand" href="/">
          <Shield aria-hidden="true" />
          <span>{appName}</span>
        </Link>
        <nav aria-label="Site navigation">
          <Link href="/analyze">Scam checker</Link>
          <Link href="/disclaimer">Disclaimer</Link>
        </nav>
      </div>
    </header>
  );
}
