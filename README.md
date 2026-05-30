# ClayHunter

**ClayHunter** is a custom dissolution-aware PvP trading agent for BID Protocol.

> ClayHunter reads arena microstructure, switches trading regimes in real time, and optimizes end-of-round holdings for the protocol's dissolution payout.

## Why this fits BID Protocol

BID's hackathon game structure creates a specific edge: the first 30 seconds are observable market-making, the next 180 seconds are live PvP trading, and the round ends with a final dissolution payout. Generic hosted strategies often optimize intraround mark-to-market PnL. ClayHunter instead:

- refuses to trade during the observation phase;
- classifies arena-only market structure into momentum, fade, chop, or endgame regimes;
- makes HOLD a first-class output when edge is weak;
- sizes trades under strict bankroll survival constraints;
- treats the final seconds as a special dissolution-aware rebalance problem.

## Quick start

```bash
pnpm install
cp .env.example .env
pnpm test
pnpm run:paper
pnpm replay
```

## Environment configuration

All runtime configuration is env-based and validated by `zod` at startup.

| Variable | Purpose |
| --- | --- |
| `BID_MODE` | `paper`, `live`, or `replay` |
| `BID_API_URL`, `BID_WS_URL` | BID Protocol agent endpoints |
| `BID_ACCESS_CODE`, `BID_API_KEY`, `BID_PRIVATE_KEY` | live-mode auth/access values |
| `CLAY_STARTING_BANKROLL_USD` | local bankroll accounting base |
| `CLAY_MAX_ROUND_CAPITAL_PCT` | max bankroll committed to one round |
| `CLAY_MAX_ORDER_USD`, `CLAY_MIN_ORDER_USD` | order bounds |
| `CLAY_DAILY_DRAWDOWN_PCT`, `CLAY_SESSION_DRAWDOWN_PCT` | hard stop thresholds |
| `CLAY_LOSS_STREAK_LIMIT`, `CLAY_DOWNSHIFT_MULTIPLIER` | survival throttling |
| `CLAY_MOMENTUM_CONFIDENCE`, `CLAY_FADE_CONFIDENCE` | strategy gates |
| `CLAY_ENDGAME_SECONDS` | final rebalance window |
| `CLAY_DATA_DIR` | JSONL recording directory |

## Commands

```bash
pnpm run:paper      # one-command paper demo with logs and JSONL recording
pnpm run:live       # live execution adapter using env credentials
pnpm replay [id]    # replay a recorded round and print metrics/rationale
pnpm inspect [id]   # inspect recent machine-readable decisions
pnpm status         # show local recording status
pnpm test           # run unit tests
pnpm build          # type-check and compile
```

## Strategy engine

The core contract is:

```ts
decide(state) => {
  action: "BUY" | "SELL" | "HOLD",
  sizeUsd: number,
  rationale: {
    regime: string,
    confidence: number,
    signals: Record<string, number | string | boolean>,
    riskOverride?: string,
    expectedEdge?: number
  }
}
```

Every live, paper, and replay flow uses the same decision path.

## File structure

```text
src/core/       state machine, shared types, config, logger
src/data/       JSONL round store and event parsing
src/strategy/   regime classifier, momentum, fade, endgame, meta-policy, sizing
src/risk/       bankroll manager, drawdown guard, kill-switch
src/execution/  BID client adapter, trader loop, duplicate-safe router
src/replay/     replay engine, metrics, parameter sweeper
src/cli/        run-live, run-paper, replay, inspect, status
src/ui/         terminal dashboard
test/           vitest coverage for core agent behavior
docs/           architecture, strategy, setup, demo, Devpost copy, judging hook
```

## Risk controls

ClayHunter hard-codes bankroll survival behavior:

- never allocates 100% of bankroll to a round;
- enforces per-round capital caps below protocol hard limits;
- blocks stale/inconsistent protocol state;
- stops after configured daily/session drawdown;
- downshifts after loss streaks;
- blocks duplicate conflicting orders;
- fails safe to HOLD when state is unsafe.

## Limitations

The included `HttpBidClient` is intentionally an adapter boundary because final BID Protocol custom-agent endpoints and payloads must be supplied by the competition environment. Paper mode and replay mode are fully local; live mode validates credentials, supports WebSocket or HTTP/SSE-style event streams, and submits orders through the configured HTTP endpoint.

## Future improvements

- replace generic HTTP endpoint paths with the final BID SDK once supplied;
- add exchange-specific fill reconciliation if BID exposes partial fills;
- persist bankroll between sessions with signed result reconciliation;
- expand parameter sweeps across larger recorded-round corpora.
