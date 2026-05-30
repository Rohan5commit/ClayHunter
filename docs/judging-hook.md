# Judging hook

ClayHunter deserves to win because it is a real custom trading agent, not a UI wrapper.

## Custom agent

The repo contains a complete live/paper/replay agent loop with env auth, phase detection, order routing, logs, tests, and docs.

## Protocol-specific edge

The strategy is designed around BID's exact structure: observe first, trade live, rebalance for dissolution.

## Risk discipline

Finite bankroll survival is built in through round caps, drawdown stops, loss-streak downshift, stale-state fail-safe, and duplicate-order prevention.

## Real implementation

The decision engine, strategy modules, risk guards, replay metrics, JSONL recording, and operator commands are implemented in TypeScript.

## Reproducible workflow

Judges can run `pnpm run:paper`, `pnpm replay`, and `pnpm test` to see a credible end-to-end demo quickly.
