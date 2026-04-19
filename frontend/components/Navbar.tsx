"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { ConnectWallet } from "@/components/ConnectWallet";
import { getActiveChain } from "@/lib/wagmiConfig";

const links = [
  { href: "/trade", label: "Trade" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/rewards", label: "Rewards" },
  { href: "/docs", label: "Docs" }
];

export function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const activeChain = getActiveChain();
  const isLanding = pathname === "/";

  useEffect(() => {
    if (!isLanding) {
      setScrolled(true);
      return;
    }

    function handleScroll() {
      setScrolled(window.scrollY > 80);
    }

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isLanding]);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 border-b transition-all duration-500 ease-out ${
        isLanding && !scrolled
          ? "navbar-transparent"
          : "navbar-visible"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-3 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="group flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan to-purple/60 transition-shadow duration-300 group-hover:shadow-glow">
            <span className="text-sm font-bold text-background">ZT</span>
          </div>
          <span className="font-[var(--font-mono)] text-lg font-bold text-text-bright glow-text">
            ZeroTrace
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`relative px-4 py-2 font-[var(--font-mono)] text-xs uppercase tracking-[0.2em] transition-colors duration-200 ${
                pathname === link.href
                  ? "text-cyan"
                  : "text-muted hover:text-text"
              }`}
            >
              {link.label}
              {pathname === link.href && (
                <span className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full bg-gradient-to-r from-cyan to-purple opacity-80" />
              )}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {/* Network Status */}
          <div
            className={`hidden items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-1.5 sm:flex transition-opacity duration-300 ${
              isLanding && !scrolled ? "opacity-0" : "opacity-100"
            }`}
          >
            <span className="network-dot" />
            <span className="font-[var(--font-mono)] text-[10px] uppercase tracking-[0.16em] text-muted">
              {activeChain.name}
            </span>
          </div>

          <ConnectWallet />

          {/* Mobile Menu Button */}
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.03] text-muted transition hover:text-text md:hidden"
            aria-label="Toggle menu"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {mobileOpen ? (
                <path d="M18 6L6 18M6 6l12 12" />
              ) : (
                <path d="M3 12h18M3 6h18M3 18h18" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      {mobileOpen && (
        <nav className="animate-slide-in border-t border-white/[0.04] bg-[rgba(3,7,18,0.95)] backdrop-blur-2xl px-4 pb-4 md:hidden">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className={`block py-3 font-[var(--font-mono)] text-xs uppercase tracking-[0.2em] transition ${
                pathname === link.href ? "text-cyan" : "text-muted"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
