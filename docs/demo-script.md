# Demo script

## 0:00–0:30 — Repo and thesis

Show `README.md` and `src/strategy`. Say: ClayHunter is not a dashboard or chatbot; it is a custom BID Protocol agent that exploits the exact observe/live/dissolution round structure.

## 0:30–1:00 — Config

Run:

```bash
cp .env.example .env
pnpm submit:ready
```

Point out that one command runs tests, build, paper mode, replay, inspect, and status. Then show env validation, risk limits, signal thresholds, and live credentials.

## 1:00–2:00 — Paper run

Run:

```bash
pnpm run:paper
```

Show structured logs with `regime`, `confidence`, `signals`, `riskOverride`, `finalAction`, and `finalSize`.

## 2:00–3:00 — Replay and metrics

Run:

```bash
pnpm replay
pnpm inspect
```

Show module counts, regime counts, trade counts, ending value, and rationale replay.

## 3:00–4:00 — Why it beats naive hosted logic

Emphasize: observation-only start, confidence-gated live trading, no-edge HOLD, endgame dissolution utility, and bankroll survival across many finite-bankroll games.

## Final 20-second close

Say: ClayHunter is submission-ready because the agent runs end to end, records every round, explains every decision, can replay/tune logs, and has a live adapter ready for BID credentials. The differentiator is dissolution-aware endgame inventory, not generic hosted-agent momentum.
