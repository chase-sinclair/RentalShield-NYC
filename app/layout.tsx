import type { Metadata } from "next";

import "@/app/globals.css";

import { SiteHeader } from "@/components/site-header";
import { publicEnv } from "@/lib/config/env";

export const metadata: Metadata = {
  title: {
    default: `${publicEnv.appName} | NYC apartment research and comparison`,
    template: `%s | ${publicEnv.appName}`,
  },
  description:
    "Research NYC building and block records, compare asking rents, and see how apartments fit your commute.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <SiteHeader appName={publicEnv.appName} />
        <main>{children}</main>
      </body>
    </html>
  );
}
