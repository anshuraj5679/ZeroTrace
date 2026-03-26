# ZZZZZ   TTTTT
#    ZZ     T
#   ZZ      T
#  ZZ       T
# ZZZZZ     T

# ZeroTrace

Trade Without a Trail

![Solidity 0.8.20](https://img.shields.io/badge/Solidity-0.8.20-1a1a1a?style=for-the-badge)
![Node.js](https://img.shields.io/badge/Node.js-Backend-00f5ff?style=for-the-badge)
![Next.js 14](https://img.shields.io/badge/Next.js-14-e0e0e0?style=for-the-badge)
![Sepolia Testnet](https://img.shields.io/badge/Sepolia-Testnet-00ff88?style=for-the-badge)

## Table of Contents

- [What is ZeroTrace](#what-is-zerotrace)
- [Architecture](#architecture)
- [CoFHE Flow](#cofhe-flow)
- [Quick Start](#quick-start)
- [API Reference](#api-reference)
- [Reward Tiers](#reward-tiers)
- [Contributing](#contributing)
- [License](#license)

## What is ZeroTrace

ZeroTrace is a private trading terminal for encrypted order flow on EVM testnets. Traders mint or wrap private balances, approve encrypted spend, and submit CoFHE-encrypted orders directly from their wallets so price and size never hit the public orderbook in plaintext. The backend indexes authenticated order metadata, runs the matching engine off public orderbook rails, and the operator settles encrypted matches on-chain.

## Architecture

```text
Frontend (Next.js + RainbowKit + cofhejs)
        |
        v
Direct Wallet CoFHE Submission + API Index
        |
        v
Matching Engine + Rewards + Webhooks
        |
        v
Smart Contract (ZeroTrace + private MockERC20 on Sepolia)
```

## CoFHE Flow

- The wallet encrypts `baseAmount` and `limitPrice` client-side with `cofhejs`, then submits them directly to `ZeroTrace.sol`.
- The backend stores only authenticated order metadata and plaintext matching hints in AES-encrypted Redis records; encrypted contract state stays private on-chain.
- The operator calls `executeMatch` on candidate pairs, and the contract settles against encrypted balances while keeping order fields and fill state in CoFHE ciphertexts.

## Quick Start

1. Clone the repo and install dependencies:

   ```bash
   npm install
   npm --workspace backend install
   npm --workspace frontend install
   ```

2. Copy the environment templates:

   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.local.example frontend/.env.local
   ```

3. Start PostgreSQL and Redis locally.

4. Deploy the contracts:

   ```bash
   npx hardhat compile
   npx hardhat test
   npx hardhat run scripts/deploy.js --network eth-sepolia
   ```

5. Update `backend/.env` and `frontend/.env.local` with the deployed contract and token addresses.

6. Start the backend:

   ```bash
   npm --workspace backend run dev
   ```

7. Start the frontend:

   ```bash
   npm --workspace frontend run dev
   ```

## API Reference

| Method | Route | Description |
| --- | --- | --- |
| `POST` | `/api/v1/order/submit` | Register an already-submitted on-chain CoFHE order |
| `GET` | `/api/v1/order/status/:orderId` | Fetch a sanitized order status |
| `POST` | `/api/v1/order/cancel` | Sync a wallet-submitted on-chain cancel into the API |
| `GET` | `/api/v1/order/my-orders?wallet=0x...` | List all tracked orders for a wallet |
| `GET` | `/api/v1/trades/history` | Return anonymized trade history |
| `GET` | `/api/v1/market/stats` | Return live market metrics |
| `GET` | `/api/v1/rewards/leaderboard` | Return the top reward accounts |
| `POST` | `/api/v1/status/webhooks/register` | Register execution webhooks |

## Reward Tiers

| Tier | Points Needed | Perks |
| --- | --- | --- |
| Bronze | 0 | Base routing access |
| Silver | 500 | Priority event access |
| Gold | 2000 | Execution fee rebates |
| Platinum | 10000 | Operator desk access |

## Contributing

1. Open an issue or draft a design note before changing settlement flow or order auth.
2. Keep API responses in the `{ success, data, error? }` envelope.
3. Do not log ciphertexts, limit prices, or raw private payloads anywhere in the stack.

## License

MIT
