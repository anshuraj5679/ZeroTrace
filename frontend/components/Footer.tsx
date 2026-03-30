export function Footer() {
  return (
    <footer className="relative border-t border-white/[0.04] bg-[rgba(3,7,18,0.6)] backdrop-blur-sm">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan/20 to-transparent" />
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
        <p className="font-[var(--font-mono)] text-[10px] uppercase tracking-[0.3em] text-muted">
          ZeroTrace © 2025 — Trade Without a Trail
        </p>
        <div className="hidden items-center gap-4 sm:flex">
          <span className="font-[var(--font-mono)] text-[10px] uppercase tracking-[0.2em] text-muted/60">
            Built on Fhenix CoFHE
          </span>
        </div>
      </div>
    </footer>
  );
}
