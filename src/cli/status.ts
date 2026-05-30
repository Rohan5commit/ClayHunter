import { existsSync, readFileSync } from "node:fs";
import { loadConfig } from "../core/config.js";
import { RoundStore } from "../data/round-store.js";

const cfg = loadConfig();
const store = new RoundStore(cfg.dataDir);
const rounds = store.listRoundIds();
console.log({ mode: cfg.mode, dataDir: cfg.dataDir, rounds, latestRound: rounds.at(-1) });
if (existsSync(store.resultsPath())) console.log(readFileSync(store.resultsPath(), "utf8").trim().split("\n").slice(-5).join("\n"));
