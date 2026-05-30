import { loadConfig } from "../core/config.js";
import { RoundStore } from "../data/round-store.js";
import { replayRound } from "../replay/replay-engine.js";
import { sweepThresholds } from "../replay/parameter-sweeper.js";

const cfg = { ...loadConfig(), mode: "replay" as const };
const store = new RoundStore(cfg.dataDir);
const roundId = process.argv[2] ?? store.listRoundIds()[0];
if (!roundId) throw new Error("No replay round found. Run pnpm run:paper first or pass a round id.");
const result = await replayRound(store, roundId, cfg);
console.log(JSON.stringify({ roundId, metrics: result.metrics, lastDecision: result.decisions.at(-1) }, null, 2));
console.log("thresholdSweep", JSON.stringify(await sweepThresholds(store, cfg, [roundId]), null, 2));
