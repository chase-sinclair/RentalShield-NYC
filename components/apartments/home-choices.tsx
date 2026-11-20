import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Building2, Scale } from "lucide-react";

const choices = [
  { href: "/?tab=research", icon: Building2, title: "Research an Address", detail: "See housing and block records for one apartment." },
  { href: "/?tab=compare", icon: Scale, title: "Compare Apartments", detail: "Weigh two listings, rent, and travel side by side." },
] as const;

export function HomeChoices() {
  return (
    <div className="apartment-app">
      <section className="apt-shell apt-home" aria-labelledby="homepage-title">
        <div className="apt-home-copy">
          <h1 className="apt-heading" id="homepage-title">Know the block<br className="apt-hero-break" /> before you sign.</h1>
          <p className="apt-home-deck">Look up NYC building records, compare asking rents, and see how each apartment fits your everyday commute.</p>
          <div className="apt-home-choices">
            {choices.map(({ href, icon: Icon, title, detail }) => (
              <Link className="apt-home-choice" href={href} key={href}>
                <Icon className="apt-choice-icon" aria-hidden="true" />
                <h2>{title}</h2>
                <p>{detail}</p>
                <ArrowRight className="apt-choice-arrow" aria-hidden="true" />
              </Link>
            ))}
          </div>
          <Link className="apt-link apt-home-sample" href="/?demo=1&tab=compare">
            Try a sample comparison
          </Link>
        </div>
        <div className="apt-home-image">
          <Image src="/nyc-streetscape.webp" alt="Illustrative New York brownstone street lined with trees and stoops"
            fill priority sizes="(max-width: 799px) 92vw, 44vw" />
        </div>
      </section>
    </div>
  );
}
