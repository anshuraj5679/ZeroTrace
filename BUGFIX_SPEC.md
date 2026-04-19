# ZeroTrace Bugfix Spec

## Scope

This pass keeps ZeroTrace as a hackathon-friendly, trusted-operator CoFHE prototype. It does not attempt to redesign matching into a fully trustless encrypted protocol, because the current backend intentionally decrypts permitted order handles for matching.

## Confirmed Fixes

1. Backend status tests must match the current degraded-health response shape.
   - `GET /api/v1/status` returns `status`, `postgres`, `redis`, and `timestamp`.
   - Tests should assert healthy and degraded behavior so the graceful startup path stays covered.

2. User-facing text must not show mojibake.
   - Replace ellipsis glyphs in the order form with ASCII `...`.
   - Keep source files ASCII where practical.

3. Deployment script should be explicit about Hardhat runtime usage.
   - Import `hardhat` in `scripts/deploy.js` instead of relying on ambient `hre`.

4. Order accounting must follow actual encrypted escrow.
   - `ZeroTrace.submitOrder` records the encrypted amount actually transferred by the private token.
   - Underfunded buy orders now derive `remainingBase` from the actual escrowed quote amount.
   - Underfunded sell orders now store only the actual escrowed base amount.
   - `MockERC20` grants the caller access to returned encrypted transfer receipts so `ZeroTrace` can safely use them in later FHE operations.

5. Settlement decisions must be verifiable on-chain.
   - `executeMatch` now accepts a `MatchProof` with operator `decryptForTx` results and threshold-network signatures.
   - The contract verifies current buy/sell remaining size and limit price ciphertexts with `FHE.verifyDecryptResultSafe`.
   - The contract derives crossing, fill status, matched base amount, settlement price, quote spend, and refund from verified plaintext values.
   - Stale or tampered proofs revert with `InvalidDecryptProof`.
   - Non-crossing verified orders revert with `MatchNotCrossed`.

6. Zero-capacity orders must not clog matching.
   - The matcher removes orders whose decrypted `remainingBase` is zero from active Redis sets and marks them `empty`.
   - The frontend renders `empty` orders as closed, non-cancellable rows.

## Security Findings Not Fully Solved In This Patch

1. Trusted operator privacy boundary.
   - `ZeroTrace` grants the operator access to encrypted order size and limit price so the backend can sort and match orders.
   - Resting orders are hidden from the public chain and API, but the operator can decrypt candidate orders for matching.
   - Executed trade size and price are revealed in settlement calldata because the contract verifies decrypt results.
   - A production version that hides executed trade details from calldata would need privacy-preserving matching or zero-knowledge proof integration beyond the current CoFHE prototype.

2. Mock token escrow semantics.
   - `MockERC20` still silently caps encrypted transfers to available encrypted balance/allowance.
   - `ZeroTrace` now accounts from the returned encrypted transfer receipt, so direct underfunded submissions cannot overstate order size.
   - The contract still accepts zero-capacity encrypted orders because rejecting them synchronously would require revealing encrypted state.
   - The backend matcher now removes zero-remaining orders after operator decryption.
   - A production token should expose a stricter escrow primitive if available.

## Verification Plan

Run these after patching:

```bash
npx hardhat test
npm --workspace backend test
npm --workspace frontend run lint
npx tsc --noEmit --project frontend\tsconfig.json
```
