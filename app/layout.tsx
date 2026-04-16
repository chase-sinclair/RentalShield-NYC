import type { Metadata } from "next";

import "@/app/globals.css";

import { SiteHeader } from "@/components/site-header";
import { publicEnv } from "@/lib/config/env";

export const metadata: Metadata = {
  title: `${publicEnv.appName} | Manhattan Rental Scam Screening`,
  description:
    "RentalShield NYC is a trust-oriented Manhattan MVP that helps renters assess listing scam risk using structured evidence.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <SiteHeader />
        <main>{children}</main>
      </body>
    </html>
  );
}
