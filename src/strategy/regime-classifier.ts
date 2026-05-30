import type { AppConfig } from "../core/config.js";
import type { MarketTick, RegimeResult, RoundState, SignalSnapshot } from "../core/types.js";

export function classifyRegime(state: RoundState, cfg: Pick<AppConfig, "endgameSeconds" | "observeSeconds" | "activeSeconds">, now = Date.now()): RegimeResult {
  const signals = computeSignals(state, cfg, now);
  const notes: string[] = [];
  if (state.phase === "ENDGAME_REBALANCE" || signals.timeRemainingSec <= cfg.endgameSeconds) {
    return { regime: "ENDGAME_REBALANCE", confidence: clamp(0.72 + Math.abs(signals.drift) * 0.6, 0, 0.95), signals, notes: ["final window uses dissolution-aware inventory utility"] };
  }

  const momentumScore = 0.35 * Math.abs(signals.drift) + 0.25 * signals.directionPersistence + 0.2 * Math.abs(signals.orderFlowImbalance) + 0.2 * Math.max(0, signals.impulseQuality);
  const extensionComponent = Math.min(1, Math.abs(signals.extensionZ) / 3);
  const fadeScore = 0.42 * extensionComponent + 0.26 * Math.max(0, -signals.participationTrend) + 0.18 * Math.max(0, -signals.impulseQuality) + 0.14 * signals.realizedVolatility;

  if (momentumScore > 0.58 && momentumScore > fadeScore * 1.05) {
    notes.push("persistent directional drift with confirming flow");
    return { regime: "BREAKOUT_MOMENTUM", confidence: clamp(momentumScore, 0, 0.94), signals, notes };
  }
  if (fadeScore > 0.62 && fadeScore > momentumScore * 1.08) {
    notes.push("extended impulse with weakening participation");
    return { regime: "OVERREACTION_FADE", confidence: clamp(fadeScore, 0, 0.92), signals, notes };
  }
  notes.push("signals are noisy or below confidence gate");
  return { regime: "CHOP_NO_EDGE", confidence: clamp(1 - Math.max(momentumScore, fadeScore), 0.15, 0.75), signals, notes };
}

export function computeSignals(state: RoundState, cfg: Pick<AppConfig, "observeSeconds" | "activeSeconds" | "endgameSeconds">, now = Date.now()): SignalSnapshot {
  const ticks = state.ticks;
  const last = ticks.at(-1);
  if (!last || ticks.length < 2) return zeroSignals(cfg.activeSeconds);
  const prices = ticks.map((t) => t.price).filter((p) => Number.isFinite(p) && p > 0);
  const first = prices[0] ?? last.price;
  const returns = prices.slice(1).map((p, i) => (p - prices[i]) / prices[i]);
  const drift = (last.price - first) / first;
  const short = prices.slice(-8);
  const prevShort = prices.slice(-16, -8);
  const shortDrift = short.length > 1 ? (short.at(-1)! - short[0]) / short[0] : 0;
  const prevDrift = prevShort.length > 1 ? (prevShort.at(-1)! - prevShort[0]) / prevShort[0] : 0;
  const acceleration = shortDrift - prevDrift;
  const realizedVolatility = std(returns) * Math.sqrt(Math.max(returns.length, 1));
  const directionPersistence = returns.length ? Math.abs(returns.filter((r) => Math.sign(r) === Math.sign(drift) && r !== 0).length / returns.length) : 0;
  const buy = sum(ticks.map((t) => t.buyVolumeUsd ?? 0));
  const sell = sum(ticks.map((t) => t.sellVolumeUsd ?? 0));
  const orderFlowImbalance = buy + sell > 0 ? (buy - sell) / (buy + sell) : Math.sign(drift) * Math.min(1, Math.abs(drift) * 20);
  const spreadBps = last.bid && last.ask && last.price ? ((last.ask - last.bid) / last.price) * 10000 : 0;
  const impulseQuality = Math.sign(drift || shortDrift) * (0.5 * directionPersistence + 0.5 * Math.abs(orderFlowImbalance)) - Math.min(0.5, spreadBps / 1000);
  const mean = avg(prices);
  const priceStd = std(prices.map((p) => (p - mean) / mean));
  const extensionZ = priceStd > 0 ? ((last.price - mean) / mean) / priceStd : 0;
  const recentVol = sum(ticks.slice(-8).map((t) => t.volumeUsd ?? 0));
  const priorVol = sum(ticks.slice(-16, -8).map((t) => t.volumeUsd ?? 0));
  const participationTrend = priorVol > 0 ? (recentVol - priorVol) / priorVol : recentVol > 0 ? 0.4 : -0.2;
  const elapsed = (now - state.startedAt) / 1000;
  const total = cfg.observeSeconds + cfg.activeSeconds;
  return { drift, acceleration, realizedVolatility, directionPersistence, orderFlowImbalance, spreadBps, impulseQuality, extensionZ, participationTrend, timeRemainingSec: Math.max(0, total - elapsed) };
}

function zeroSignals(timeRemainingSec: number): SignalSnapshot {
  return { drift: 0, acceleration: 0, realizedVolatility: 0, directionPersistence: 0, orderFlowImbalance: 0, spreadBps: 0, impulseQuality: 0, extensionZ: 0, participationTrend: 0, timeRemainingSec };
}
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const avg = (xs: number[]) => xs.length ? sum(xs) / xs.length : 0;
const std = (xs: number[]) => xs.length ? Math.sqrt(avg(xs.map((x) => (x - avg(xs)) ** 2))) : 0;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
