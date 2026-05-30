# Architecture

ClayHunter is a TypeScript Node.js trading-agent system built around one shared decision engine.

## Event flow

1. `BidClient.events()` streams round lifecycle and market ticks.
2. `Trader` records every event to JSONL through `RoundStore`.
3. `state-machine.ts` updates local round phase, inventory marks, and tick history.
4. `meta-policy.ts` calls the regime classifier, strategy module, sizing engine, bankroll manager, and kill-switch.
5. `OrderRouter` submits a single duplicate-safe order intent when the final action is BUY or SELL.
6. The dashboard and structured logs emit the machine-readable rationale.

## State machine

- `PRE_GAME`: initialized before meaningful market data.
- `OBSERVE_MM_PHASE`: first 30 seconds; collect signals only.
- `ACTIVE_TRADING`: trade only above confidence gates.
- `ENDGAME_REBALANCE`: switch to dissolution-aware inventory utility.
- `ROUND_COMPLETE`: no new risk.

## Execution path

`run-paper` uses `PaperBidClient` and generates deterministic in-arena ticks. `run-live` uses `HttpBidClient`, env credentials, and the same `Trader` loop. No LLM calls are made in live execution.

## Replay and tuning loop

Recorded `*.events.jsonl` files can be replayed locally. Replay recomputes decisions, simulates fills, reports metrics by module/regime, and can sweep confidence thresholds.
