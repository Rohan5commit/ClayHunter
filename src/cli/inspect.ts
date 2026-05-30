import { readFileSync } from "node:fs";
import { loadConfig } from "../core/config.js";
import { RoundStore } from "../data/round-store.js";

const cfg = loadConfig();
const store = new RoundStore(cfg.dataDir);
const roundId = process.argv[2] ?? store.listRoundIds()[0];
if (!roundId) throw new Error("No round id available");
const path = store.decisionsPath(roundId);
const lines = readFileSync(path, "utf8").trim().split("\n").filter(Boolean);
console.log(JSON.stringify(lines.slice(-10).map((line) => JSON.parse(line)), null, 2));
