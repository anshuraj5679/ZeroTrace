"use client";

import dynamic from "next/dynamic";

const ConnectButton = dynamic(
  () => import("@rainbow-me/rainbowkit").then((module) => module.ConnectButton),
  { ssr: false }
);

export function ConnectWallet() {
  return (
    <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-2 py-1 backdrop-blur-sm transition hover:border-cyan/30 hover:shadow-glow">
      <ConnectButton />
    </div>
  );
}
