import type { AppConfig } from "./config.js";
import type { AgentEvent, MarketTick, RoundPhase, RoundState } from "./types.js";

export function createInitialRound(roundId: string, now: number, bankrollUsd: number, initialPrice = 1): RoundState {
  return {
    roundId,
    phase: "PRE_GAME",
    startedAt: now,
    phaseStartedAt: now,
    ticks: [],
    inventory: { usdc: bankrollUsd, token: 0, avgEntryPrice: 0, realizedPnl: 0, lastMarkPrice: initialPrice },
    bankrollUsd,
    trades: []
  };
}

export function nextPhaseByClock(state: RoundState, now: number, cfg: Pick<AppConfig, "observeSeconds" | "activeSeconds" | "endgameSeconds">): RoundPhase {
  const elapsed = (now - state.startedAt) / 1000;
  if (state.phase === "ROUND_COMPLETE") return "ROUND_COMPLETE";
  if (elapsed < cfg.observeSeconds) return "OBSERVE_MM_PHASE";
  if (elapsed < cfg.observeSeconds + cfg.activeSeconds - cfg.endgameSeconds) return "ACTIVE_TRADING";
  if (elapsed < cfg.observeSeconds + cfg.activeSeconds) return "ENDGAME_REBALANCE";
  return "ROUND_COMPLETE";
}

export function transitionPhase(state: RoundState, phase: RoundPhase, now: number): RoundState {
  if (state.phase === phase) return state;
  return { ...state, phase, phaseStartedAt: now, liveStartedAt: phase === "ACTIVE_TRADING" ? now : state.liveStartedAt, completeAt: phase === "ROUND_COMPLETE" ? now : state.completeAt };
}

export function applyTick(state: RoundState, tick: MarketTick, cfg: Pick<AppConfig, "observeSeconds" | "activeSeconds" | "endgameSeconds">): RoundState {
  const clockPhase = tick.phase ?? nextPhaseByClock(state, tick.ts, cfg);
  const transitioned = transitionPhase(state, clockPhase, tick.ts);
  const inventory = { ...transitioned.inventory, lastMarkPrice: tick.price };
  return { ...transitioned, inventory, ticks: [...transitioned.ticks, tick].slice(-600) };
}

export function applyEvent(state: RoundState, event: AgentEvent, cfg: Pick<AppConfig, "observeSeconds" | "activeSeconds" | "endgameSeconds">): RoundState {
  if (event.type === "PHASE_CHANGED") return transitionPhase(state, event.payload.phase as RoundPhase, event.ts);
  if (event.type === "MARKET_TICK") {
    return applyTick(state, {
      roundId: event.roundId,
      ts: event.ts,
      price: Number(event.payload.price),
      bid: optionalNumber(event.payload.bid),
      ask: optionalNumber(event.payload.ask),
      volumeUsd: optionalNumber(event.payload.volumeUsd),
      buyVolumeUsd: optionalNumber(event.payload.buyVolumeUsd),
      sellVolumeUsd: optionalNumber(event.payload.sellVolumeUsd),
      reserveToken: optionalNumber(event.payload.reserveToken),
      reserveUsdc: optionalNumber(event.payload.reserveUsdc),
      sequence: optionalNumber(event.payload.sequence)
    }, cfg);
  }
  if (event.type === "ROUND_SETTLED") return transitionPhase(state, "ROUND_COMPLETE", event.ts);
  return state;
}

function optionalNumber(value: unknown): number | undefined {
  return value === undefined || value === null || value === "" ? undefined : Number(value);
}
