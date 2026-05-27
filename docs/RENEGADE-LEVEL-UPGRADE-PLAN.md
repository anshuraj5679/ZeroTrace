# Renegade-Level Upgrade Plan

This plan upgrades Obsidian from a Fhenix testnet dark-pool prototype into a production-grade confidential trading venue. Renegade is used only as an architecture reference; do not copy Renegade source code or import it as a dependency.

## Target Architecture

Obsidian should evolve toward a relayer-style backend:

```text
Frontend / Agent API
        |
API Server
        |
Durable Task Driver
        |
State Store + Event Indexer
        |
Matching Engine + Proof/Audit Manager
        |
Chain Settlement Contracts
```

Borrow these concepts:

- Coordinator process that validates config, starts workers, and reports failures.
- Durable task lifecycle for setup, order submit, cancel, match, settle, and audit verification.
- Central state store for indexed orders, batches, matches, tasks, audit proofs, and worker errors.
- Pure matching engine separated from HTTP, chain IO, and settlement.
- Chain event worker with confirmation-depth indexing, catchup, and backfill.
- Proof/audit manager with signed transcripts and public redacted verifier artifacts.
- Typed public/trader/agent/operator APIs.

## Implementation Phases

### Phase 0: Baseline And Deploy Safety

- Keep the current live deployment labeled as pre-side-private.
- Keep Hardhat as the maintained contract verification gate until Foundry CoFHE mocks are fixed.
- Do not deploy Vercel as side-private until the new DEX, matcher schema, matcher service, and frontend ABI are redeployed together.

### Phase 1: Side-Private Production Redeploy

- Deploy the local side-private `DarkPoolDEX` ABI to Arbitrum Sepolia.
- Apply matcher migrations through the latest task/state migration.
- Redeploy matcher and Vercel with the new DEX address and generated ABI.
- Run a fresh Vercel-only smoke: setup, submit, close, match, settle, orders, batches, markets, health, audit.

### Phase 2: Durable Task Driver

Status: materially implemented.

Implemented slice:

- Added durable `tasks` and `task_events` DB tables.
- Added public-redacted task serializers.
- Added matcher APIs:
  - `GET /tasks/recent?limit=20`
  - `GET /tasks/:id`
- Added task recording around `POST /agent/orders`.
- Added task recording around authenticated `POST /publish/:batchId`.
- Added `clientOrderId` idempotency for agent-order tasks.
- Added task visibility to `/health` and frontend `/health`.
- Added task recording for automated batch close, closed-batch match scans, batch-closed event matching, manual publish, and settlement attempts.
- Added task attempt counters, retry scheduling, heartbeat fields, and health reporting for retryable or stale tasks.
- Added private S3 match transcripts with auction input orders for new matches. These are operator-only audit artifacts and are not returned by public APIs.
- Added a protected audit-verifier endpoint that fetches S3 transcripts, verifies digest/signature, recomputes the auction when private inputs are present, compares the transcript to indexed match fields, and returns a redacted proof result:
  - `POST /operator/audits/:matchId/verify`

Next work:

- Add a retry worker that re-runs eligible failed tasks instead of surfacing them only in health.
- Add a redacted public audit-artifact API for verifier status once operator auth boundaries are finalized.
- Add cancellation tasks.
- Add account/trader-scoped task APIs after authentication boundaries are finalized.

Implemented since this plan was written:

- Added task lease fields for retry coordination.
- Added retry worker scaffolding for `CLOSE_BATCH`, `MATCH_BATCH`, `SETTLE_MATCH`, and `VERIFY_AUDIT`.
- Added a public redacted audit status endpoint:
  - `GET /matches/:id/audit`

### Phase 3: State And Event Indexer Hardening

Status: foundation implemented.

Implemented:

- Added confirmation-depth catchup via `MATCHER_INDEX_CONFIRMATIONS`.
- Added block-hash-backed indexed block/log tables.
- Added rollback-on-reorg foundation for indexed projections and replay.
- Expanded health with confirmed block, reorg count, relayer checkpoint summary, and expired leases.
- Matching continues to refuse incomplete indexed state before batch matching.

Next work:

- Add deterministic full DB rebuild from stored indexed logs.
- Harden rollback coverage for all future commitment/proof tables once contract-side state grows.

### Phase 4: Matching Engine And Audit Verifier

- Keep auction logic pure and deterministic.
- Generate canonical signed batch transcripts.
- Store full private transcripts in S3 and redacted public transcripts in the API.
- Build verifier that recomputes clearing price, match ids, neutral order ids, and tx hash links.

Implemented:

- Added shared order commitment/nullifier hashing primitives.
- Added relayer state checkpoints and commitment/nullifier persistence in the matcher DB.
- Public audit route now returns redacted verifier status only; raw verification remains operator-protected.

### Phase 5: Agent And x402 Production Path

- Keep x402 as access/payment only, never as encrypted settlement.
- Use plain public payment tokens and unlinkable agent/payment identities where possible.
- Persist agent idempotency and task tracking.
- Enable full paid settlement only after choosing an Arbitrum-compatible facilitator path.

### Phase 6: Decentralized Privacy Roadmap

- Multi-matcher committee.
- Threshold decryption or MPC matching.
- Private account commitments and nullifiers.
- Proof-backed settlement.
- P2P/gossip and cluster replication only after the single-relayer task/state machine is stable.

## Verification Gates

Local gate:

```powershell
npm --prefix contracts run build
npm --prefix contracts run test:hardhat
npm --prefix matcher test
npm --prefix matcher run build
npm --prefix matcher run lint
npm --prefix shared test
npm --prefix frontend run build
npm --prefix frontend run typecheck
```

Live gate:

- Vercel URL works without localhost or SSH tunnels.
- Fresh wallet completes setup and private order submission.
- Matcher closes, matches, audits, and settles without CLI recovery.
- Public APIs redact side, size, price, handles, and buy/sell-labeled match ids.
- Audit verifier passes for the latest settled match.
