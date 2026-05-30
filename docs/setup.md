# Setup

## Install

```bash
pnpm install
cp .env.example .env
```

## Configure

Set `BID_MODE=paper` for local demos. For live mode, set `BID_MODE=live` plus the BID Protocol endpoint and at least one credential: `BID_API_KEY`, `BID_ACCESS_CODE`, or `BID_PRIVATE_KEY`.

## Run

```bash
pnpm run:paper
pnpm run:live
pnpm replay [roundId]
pnpm inspect [roundId]
pnpm status
```

## Troubleshooting

- Live mode fails at startup: credentials are missing.
- Agent holds every tick: phase may be observe/endgame, market data may be stale, or confidence gates are not met.
- Replay has no rounds: run `pnpm run:paper` first or point `CLAY_DATA_DIR` at recorded data.
