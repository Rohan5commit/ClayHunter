# ClayHunter submission packet

## Title

ClayHunter — dissolution-aware PvP trading agent for BID Protocol

## One-line pitch

ClayHunter reads BID arena microstructure, switches between momentum/fade/endgame regimes, and optimizes final holdings for dissolution payout instead of only paper PnL.

## What to submit

- Repository: this repo.
- Demo command: `pnpm submit:ready`.
- Quick paper demo: `pnpm run:paper`.
- Replay demo: `pnpm replay` then `pnpm inspect`.
- Live command: `pnpm run:live` after setting `BID_MODE=live`, `BID_API_URL`, `BID_WS_URL`, and credentials.

## Judge-facing explanation

ClayHunter is a real custom BID Protocol trading agent, not a dashboard or generic bot shell. It uses the competition structure directly:

1. Observe the 30-second market-making phase without trading.
2. Trade only during the live window when confidence clears a gate.
3. Classify each round as momentum, fade, chop/no-edge, or endgame rebalance.
4. Treat the final seconds as a dissolution-aware inventory problem.
5. Preserve finite competition bankroll with drawdown stops, round caps, stale-state fail-safes, and duplicate-order blocking.

## 90-second narration

> ClayHunter is my custom trading agent for the BID Protocol Beat the House challenge. It is built around the exact round structure. During the first 30 seconds it only observes market-making behavior and records drift, volatility, spread, order-flow imbalance, direction persistence, and impulse quality. During the live window it switches between momentum, fade, and no-edge HOLD behavior. In the endgame it stops treating the market like a normal intraround trade and instead asks whether terminal dissolution value is higher in USDC, token, or a balanced inventory. Every decision emits a structured rationale, so judges can see the detected regime, confidence, signals, risk overrides, final action, and size. The agent also has bankroll survival rules because this competition bankroll is finite: per-round caps, drawdown stops, loss-streak downshift, stale-state HOLD, and duplicate-order protection.

## Final verification

Run:

```bash
pnpm submit:ready
```

That command runs tests, build/type-checking, paper mode, replay, inspect, and status. It also writes `.clayhunter/submission-summary.json` as a local artifact.

## Expected demo flow

```bash
pnpm install
cp .env.example .env
pnpm submit:ready
```

For live mode, configure credentials in `.env` and run:

```bash
BID_MODE=live pnpm run:live
```
