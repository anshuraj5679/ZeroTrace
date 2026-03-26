import Link from "next/link";

const sections = [
  {
    id: "submit",
    method: "POST",
    route: "/api/v1/order/submit",
    description: "Register a wallet-submitted CoFHE order after the on-chain transaction confirms.",
    request: `{
  "walletAddress": "0x...",
  "orderId": "0x...",
  "txHash": "0x...",
  "tokenBase": "0x...",
  "tokenQuote": "0x...",
  "baseAmount": "100000000000000000",
  "limitPrice": "2400000000",
  "isBuy": true,
  "signature": "0x...",
  "nonce": "8f1d...",
  "timestamp": 1720000000000
}`,
    response: `{
  "success": true,
  "data": {
    "orderId": "0x...",
    "txHash": "0x...",
    "status": "pending",
    "timestamp": "2026-03-24T10:00:00.000Z"
  }
}`,
    curl: `curl -X POST http://localhost:4000/api/v1/order/submit \\
  -H "Content-Type: application/json" \\
  -d '{"walletAddress":"0x...","orderId":"0x...","txHash":"0x...","tokenBase":"0x...","tokenQuote":"0x...","baseAmount":"100000000000000000","limitPrice":"2400000000","isBuy":true,"signature":"0x...","nonce":"n-1","timestamp":1720000000000}'`
  },
  {
    id: "status",
    method: "GET",
    route: "/api/v1/order/status/:orderId",
    description: "Fetch a sanitized order status without exposing encrypted price or ciphertext data.",
    request: "{}",
    response: `{
  "success": true,
  "data": {
    "orderId": "0x...",
    "status": "pending",
    "pair": "ZETH/ZUSDC",
    "amount": 250,
    "isBuy": true,
    "timestamp": "2026-03-24T10:00:00.000Z"
  }
}`,
    curl: "curl http://localhost:4000/api/v1/order/status/0x..."
  },
  {
    id: "cancel",
    method: "POST",
    route: "/api/v1/order/cancel",
    description: "Sync a user-submitted on-chain cancel transaction into the ZeroTrace API index.",
    request: `{
  "walletAddress": "0x...",
  "orderId": "0x...",
  "txHash": "0x...",
  "signature": "0x...",
  "nonce": "n-2",
  "timestamp": 1720000000000
}`,
    response: `{
  "success": true,
  "data": {
    "success": true,
    "txHash": "0x..."
  }
}`,
    curl: `curl -X POST http://localhost:4000/api/v1/order/cancel \\
  -H "Content-Type: application/json" \\
  -d '{"walletAddress":"0x...","orderId":"0x...","txHash":"0x...","signature":"0x...","nonce":"n-2","timestamp":1720000000000}'`
  },
  {
    id: "my-orders",
    method: "GET",
    route: "/api/v1/order/my-orders?wallet=0x...",
    description: "List all tracked orders for a wallet.",
    request: "{}",
    response: `{
  "success": true,
  "data": []
}`,
    curl: "curl 'http://localhost:4000/api/v1/order/my-orders?wallet=0x...'"
  },
  {
    id: "history",
    method: "GET",
    route: "/api/v1/trades/history",
    description: "Return anonymized trade history without counterparty addresses.",
    request: "{}",
    response: `{
  "success": true,
  "data": [
    {
      "tradeId": "uuid",
      "pair": "ZETH/ZUSDC",
      "amount": 0.1,
      "settlementPrice": 3125,
      "timestamp": "2026-03-24T10:10:00.000Z"
    }
  ]
}`,
    curl: "curl http://localhost:4000/api/v1/trades/history"
  },
  {
    id: "stats",
    method: "GET",
    route: "/api/v1/market/stats",
    description: "Fetch live platform metrics from PostgreSQL and Redis.",
    request: "{}",
    response: `{
  "success": true,
  "data": {
    "totalVolume24h": 120000,
    "totalTrades24h": 84,
    "activeOrders": 19
  }
}`,
    curl: "curl http://localhost:4000/api/v1/market/stats"
  },
  {
    id: "leaderboard",
    method: "GET",
    route: "/api/v1/rewards/leaderboard",
    description: "List the top 20 anonymized reward accounts.",
    request: "{}",
    response: `{
  "success": true,
  "data": [
    { "rank": 1, "wallet": "0x1234...abcd", "points": 1000, "volume": 50000, "tier": "Gold" }
  ]
}`,
    curl: "curl http://localhost:4000/api/v1/rewards/leaderboard"
  },
  {
    id: "webhook-register",
    method: "POST",
    route: "/api/v1/status/webhooks/register",
    description: "Register a webhook endpoint for execution events.",
    request: `{
  "url": "https://example.com/webhooks/zerotrace",
  "events": ["trade.executed"]
}`,
    response: `{
  "success": true,
  "data": {
    "id": "uuid",
    "url": "https://example.com/webhooks/zerotrace",
    "events": ["trade.executed"]
  }
}`,
    curl: `curl -X POST http://localhost:4000/api/v1/status/webhooks/register \\
  -H "Content-Type: application/json" \\
  -d '{"url":"https://example.com/webhooks/zerotrace","events":["trade.executed"]}'`
  }
];

function methodColor(method: string) {
  if (method === "POST") {
    return "border-buy/40 bg-buy/10 text-buy";
  }

  return "border-cyan/40 bg-cyan/10 text-cyan";
}

export default function DocsPage() {
  return (
    <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[240px,1fr]">
      <aside className="terminal-card sticky top-28 h-fit rounded-sharp p-5">
        <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-muted">Sections</p>
        <div className="mt-4 grid gap-3">
          {sections.map((section) => (
            <Link
              key={section.id}
              href={`#${section.id}`}
              className="font-mono text-xs uppercase tracking-[0.24em] text-muted transition hover:text-cyan"
            >
              {section.route}
            </Link>
          ))}
        </div>
      </aside>

      <div className="grid gap-6">
        {sections.map((section) => (
          <section key={section.id} id={section.id} className="terminal-card rounded-sharp p-6">
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={`rounded-sharp border px-2 py-1 font-mono text-[11px] uppercase tracking-[0.2em] ${methodColor(
                  section.method
                )}`}
              >
                {section.method}
              </span>
              <code className="font-mono text-sm text-text">{section.route}</code>
            </div>
            <p className="mt-4 leading-7 text-muted">{section.description}</p>

            <div className="mt-6 grid gap-5">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-muted">Request</p>
                <pre className="mt-3 overflow-x-auto rounded-sharp border border-border bg-black p-4 text-sm text-cyan">
                  <code>{section.request}</code>
                </pre>
              </div>

              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-muted">Response</p>
                <pre className="mt-3 overflow-x-auto rounded-sharp border border-border bg-black p-4 text-sm text-cyan">
                  <code>{section.response}</code>
                </pre>
              </div>

              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-muted">cURL</p>
                <pre className="mt-3 overflow-x-auto rounded-sharp border border-border bg-black p-4 text-sm text-cyan">
                  <code>{section.curl}</code>
                </pre>
              </div>
            </div>
          </section>
        ))}

        <section className="terminal-card rounded-sharp p-6">
          <h2 className="font-[var(--font-heading)] text-3xl text-text">Authentication</h2>
          <p className="mt-4 leading-7 text-muted">
            ZeroTrace requires a wallet signature for API indexing and cancel synchronization. CoFHE order submission
            itself happens directly on-chain from the trader wallet. The API signature message format is:
            <span className="block rounded-sharp border border-border bg-black p-4 font-mono text-cyan mt-4">
              ZeroTrace Order Request{"\n"}Nonce: {"{nonce}"}{"\n"}Timestamp: {"{timestamp}"}
            </span>
          </p>
        </section>

        <section className="terminal-card rounded-sharp p-6">
          <h2 className="font-[var(--font-heading)] text-3xl text-text">Rate Limits</h2>
          <p className="mt-4 leading-7 text-muted">
            `POST /api/v1/order/submit` is limited to 10 requests per minute per IP. Read endpoints are
            currently unthrottled in this prototype and should be fronted by edge controls in production.
          </p>
        </section>
      </div>
    </div>
  );
}
