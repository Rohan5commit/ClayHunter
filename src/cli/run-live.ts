import { loadConfig } from "../core/config.js";
import { createLogger } from "../core/logger.js";
import { RoundStore } from "../data/round-store.js";
import { HttpBidClient } from "../execution/bid-client.js";
import { Trader } from "../execution/trader.js";

const cfg = { ...loadConfig(), mode: "live" as const };
await new Trader(cfg, new HttpBidClient(cfg, createLogger(cfg)), new RoundStore(cfg.dataDir), createLogger(cfg)).run();
