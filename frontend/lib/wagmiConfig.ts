import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http } from "viem";
import { arbitrumSepolia, sepolia } from "wagmi/chains";

const walletConnectProjectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "zerotrace-demo-project-id";

const supportedChains = {
  [sepolia.id]: sepolia,
  [arbitrumSepolia.id]: arbitrumSepolia
} as const;

export function getActiveChain() {
  const configuredChainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID || sepolia.id);
  return supportedChains[configuredChainId as keyof typeof supportedChains] || sepolia;
}

export function createWagmiConfig() {
  const activeChain = getActiveChain();
  const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL;

  return getDefaultConfig({
    appName: "ZeroTrace",
    projectId: walletConnectProjectId,
    chains: [activeChain],
    ssr: false,
    transports: {
      [activeChain.id]: http(rpcUrl)
    }
  });
}
