"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ConnectWallet } from "@/components/ConnectWallet";

const links = [
  { href: "/trade", label: "Trade" },
  { href: "/docs", label: "Docs" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/rewards", label: "Rewards" }
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border bg-black/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="font-mono text-xl text-cyan glow-text">
          ZeroTrace
        </Link>

        <nav className="hidden items-center gap-5 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`font-mono text-sm uppercase tracking-[0.24em] transition ${
                pathname === link.href ? "text-cyan" : "text-muted hover:text-text"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <ConnectWallet />
      </div>
    </header>
  );
}

