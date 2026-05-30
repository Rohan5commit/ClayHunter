import { config as dotenvConfig } from "dotenv";
import { z } from "zod";
import type { AgentMode } from "./types.js";

dotenvConfig();

const boolFromString = z.preprocess((value) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return ["1", "true", "yes", "on"].includes(value.toLowerCase());
  return value;
}, z.boolean());

const num = (fallback: number) => z.coerce.number().finite().default(fallback);
const positiveNum = (fallback: number) => z.coerce.number().finite().positive().default(fallback);
const pctNum = (fallback: number) => z.coerce.number().finite().min(0.01).max(0.95).default(fallback);

export const ConfigSchema = z.object({
  mode: z.enum(["live", "paper", "replay"]).default("paper"),
  apiUrl: z.string().url().default("https://api.bid.example"),
  wsUrl: z.string().url().default("wss://api.bid.example/agent/events"),
  accessCode: z.string().optional().default(""),
  apiKey: z.string().optional().default(""),
  privateKey: z.string().optional().default(""),
  agentId: z.string().min(1).default("clayhunter"),
  startingBankrollUsd: positiveNum(1000),
  maxRoundCapitalPct: pctNum(0.18),
  maxOrderUsd: positiveNum(50),
  minOrderUsd: positiveNum(2),
  dailyDrawdownPct: pctNum(0.12),
  sessionDrawdownPct: pctNum(0.08),
  lossStreakLimit: z.coerce.number().int().min(1).default(3),
  downshiftMultiplier: z.coerce.number().finite().min(0.05).max(1).default(0.5),
  staleMarketMs: z.coerce.number().int().min(250).default(2500),
  killSwitchEnabled: boolFromString.default(true),
  momentumConfidence: z.coerce.number().finite().min(0).max(1).default(0.62),
  fadeConfidence: z.coerce.number().finite().min(0).max(1).default(0.66),
  endgameSeconds: z.coerce.number().int().min(5).default(35),
  observeSeconds: z.coerce.number().int().min(1).default(30),
  activeSeconds: z.coerce.number().int().min(30).default(180),
  logLevel: z.enum(["trace", "debug", "info", "warn", "error", "fatal", "silent"]).default("info"),
  dataDir: z.string().min(1).default(".clayhunter")
}).superRefine((cfg, ctx) => {
  if (cfg.mode === "live" && !cfg.apiKey && !cfg.accessCode && !cfg.privateKey) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "live mode requires BID_API_KEY, BID_ACCESS_CODE, or BID_PRIVATE_KEY" });
  }
  if (cfg.minOrderUsd > cfg.maxOrderUsd) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "CLAY_MIN_ORDER_USD cannot exceed CLAY_MAX_ORDER_USD" });
  }
});

export type AppConfig = z.infer<typeof ConfigSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return ConfigSchema.parse({
    mode: env.BID_MODE as AgentMode | undefined,
    apiUrl: env.BID_API_URL,
    wsUrl: env.BID_WS_URL,
    accessCode: env.BID_ACCESS_CODE,
    apiKey: env.BID_API_KEY,
    privateKey: env.BID_PRIVATE_KEY,
    agentId: env.BID_AGENT_ID,
    startingBankrollUsd: env.CLAY_STARTING_BANKROLL_USD,
    maxRoundCapitalPct: env.CLAY_MAX_ROUND_CAPITAL_PCT,
    maxOrderUsd: env.CLAY_MAX_ORDER_USD,
    minOrderUsd: env.CLAY_MIN_ORDER_USD,
    dailyDrawdownPct: env.CLAY_DAILY_DRAWDOWN_PCT,
    sessionDrawdownPct: env.CLAY_SESSION_DRAWDOWN_PCT,
    lossStreakLimit: env.CLAY_LOSS_STREAK_LIMIT,
    downshiftMultiplier: env.CLAY_DOWNSHIFT_MULTIPLIER,
    staleMarketMs: env.CLAY_STALE_MARKET_MS,
    killSwitchEnabled: env.CLAY_KILL_SWITCH_ENABLED,
    momentumConfidence: env.CLAY_MOMENTUM_CONFIDENCE,
    fadeConfidence: env.CLAY_FADE_CONFIDENCE,
    endgameSeconds: env.CLAY_ENDGAME_SECONDS,
    observeSeconds: env.CLAY_OBSERVE_SECONDS,
    activeSeconds: env.CLAY_ACTIVE_SECONDS,
    logLevel: env.CLAY_LOG_LEVEL,
    dataDir: env.CLAY_DATA_DIR
  });
}
