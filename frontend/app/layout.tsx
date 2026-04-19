import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { Inter, JetBrains_Mono } from "next/font/google";

import "@/app/globals.css";
import { Navbar } from "@/components/Navbar";

const AppProviders = dynamic(
  () => import("@/components/AppProviders").then((module) => module.AppProviders),
  { ssr: false }
);

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["300", "400", "500", "600", "700"]
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "700"]
});

export const metadata: Metadata = {
  title: "ZeroTrace — Trade Without a Trail",
  description: "MEV-resistant private order matching powered by fully homomorphic encryption. Your trades stay invisible until executed."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-[var(--font-body)] bg-background text-text antialiased`}
      >
        <AppProviders>
          <div className="noise-overlay" aria-hidden="true" />
          <div className="flex min-h-screen flex-col">
            <Navbar />
            <main className="flex-1">{children}</main>
          </div>
        </AppProviders>
      </body>
    </html>
  );
}
