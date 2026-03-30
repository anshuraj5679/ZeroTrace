export type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  error?: string;
};

export type MarketStats = {
  totalVolume24h: number;
  totalTrades24h: number;
  activeOrders: number;
  totalVolumeAllTime: number;
  totalTradesAllTime: number;
  uniqueWallets: number;
  topPairs: Array<{ pair: string; volume: number }>;
};

export type OrderStatus = {
  orderId: string;
  status: string;
  tokenIn: string;
  tokenOut: string;
  pair: string;
  amount: string;
  isBuy: boolean;
  timestamp: string;
  txHash: string | null;
};

export type TradeHistoryItem = {
  tradeId: string;
  pair: string;
  tokenIn: string;
  tokenOut: string;
  amount: number;
  settlementPrice: number;
  timestamp: string;
};

export type LeaderboardEntry = {
  rank: number;
  wallet: string;
  points: number;
  volume: number;
  tier: string;
};

export type RewardStats = {
  points: number;
  rank: number | null;
  tier: string;
  volumeToday: number;
  tradesTotal: number;
};

export type SubmitOrderPayload = {
  walletAddress: string;
  orderId: string;
  txHash: string;
  tokenBase: string;
  tokenQuote: string;
  baseAmount: string;
  limitPrice: string;
  isBuy: boolean;
  signature: string;
  nonce: string;
  timestamp: number;
};

export type CancelOrderPayload = {
  orderId: string;
  txHash: string;
  walletAddress: string;
  signature: string;
  nonce: string;
  timestamp: number;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {})
    },
    cache: "no-store"
  });

  const payload = (await response.json()) as ApiEnvelope<T>;
  if (!response.ok || !payload.success) {
    throw new Error(payload.error || "Request failed");
  }

  return payload.data;
}

export async function submitOrder(payload: SubmitOrderPayload) {
  return request<{ orderId: string; txHash: string; status: string; timestamp: string }>(
    "/api/v1/order/submit",
    {
      method: "POST",
      body: JSON.stringify(payload)
    }
  );
}

export async function getOrderStatus(orderId: string) {
  return request<OrderStatus>(`/api/v1/order/status/${orderId}`);
}

export async function cancelOrder(payload: CancelOrderPayload) {
  return request<{ success: boolean; txHash: string }>("/api/v1/order/cancel", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function getMyOrders(wallet: string) {
  return request<OrderStatus[]>(`/api/v1/order/my-orders?wallet=${encodeURIComponent(wallet)}`);
}

export async function getTradeHistory(wallet?: string) {
  const suffix = wallet ? `?wallet=${wallet}` : "";
  return request<TradeHistoryItem[]>(`/api/v1/trades/history${suffix}`);
}

export async function getMarketStats() {
  return request<MarketStats>("/api/v1/market/stats");
}

export async function getLeaderboard() {
  return request<LeaderboardEntry[]>("/api/v1/rewards/leaderboard");
}

export async function getMyRewards(wallet: string) {
  return request<RewardStats>(`/api/v1/rewards/my-stats?wallet=${wallet}`);
}

export async function registerWebhook(payload: Record<string, unknown>) {
  return request("/api/v1/status/webhooks/register", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}
