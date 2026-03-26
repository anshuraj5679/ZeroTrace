import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { Space_Mono, Syne } from "next/font/google";

import "@/app/globals.css";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";

const AppProviders = dynamic(
  () => import("@/components/AppProviders").then((module) => module.AppProviders),
  { ssr: false }
);

const spaceMono = Space_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "700"]
});

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-heading",
  weight: ["400", "700", "800"]
});

export const metadata: Metadata = {
  title: "ZeroTrace",
  description: "Trade Without a Trail"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${spaceMono.variable} ${syne.variable} bg-background font-mono text-text antialiased`}
      >
        <AppProviders>
          <div className="flex min-h-screen flex-col">
            <Navbar />
            <main className="flex-1 px-4 pb-12 pt-28 sm:px-6 lg:px-8">{children}</main>
            <Footer />
          </div>
        </AppProviders>
      </body>
    </html>
  );
}
