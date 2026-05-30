import { loadConfig } from "../core/config.js";
import { createLogger } from "../core/logger.js";
import { RoundStore } from "../data/round-store.js";
import { PaperBidClient } from "../execution/bid-client.js";
import { Trader } from "../execution/trader.js";

const cfg = { ...loadConfig(), mode: "paper" as const };
await new Trader(cfg, new PaperBidClient(cfg), new RoundStore(cfg.dataDir), createLogger(cfg)).run();
