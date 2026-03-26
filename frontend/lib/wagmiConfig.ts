import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http } from "viem";
import { sepolia } from "wagmi/chains";

const walletConnectProjectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "zerotrace-demo-project-id";

export const wagmiConfig = getDefaultConfig({
  appName: "ZeroTrace",
  projectId: walletConnectProjectId,
  chains: [sepolia],
  ssr: false,
  transports: {
    [sepolia.id]: http()
  }
});
