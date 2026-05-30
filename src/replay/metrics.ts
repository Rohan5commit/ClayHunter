import type { Decision, RoundState, TradeFill } from "../core/types.js";

export interface ReplayMetrics {
  decisions: number;
  trades: number;
  buys: number;
  sells: number;
  holds: number;
  moduleCounts: Record<string, number>;
  regimeCounts: Record<string, number>;
  endingValueUsd: number;
  realizedPnlUsd: number;
}

export function computeReplayMetrics(state: RoundState, decisions: Decision[]): ReplayMetrics {
  const moduleCounts: Record<string, number> = {};
  const regimeCounts: Record<string, number> = {};
  for (const d of decisions) {
    moduleCounts[d.rationale.module] = (moduleCounts[d.rationale.module] ?? 0) + 1;
    regimeCounts[d.rationale.regime] = (regimeCounts[d.rationale.regime] ?? 0) + 1;
  }
  return {
    decisions: decisions.length,
    trades: state.trades.length,
    buys: state.trades.filter((t: TradeFill) => t.action === "BUY").length,
    sells: state.trades.filter((t: TradeFill) => t.action === "SELL").length,
    holds: decisions.filter((d) => d.action === "HOLD").length,
    moduleCounts,
    regimeCounts,
    endingValueUsd: state.inventory.usdc + state.inventory.token * state.inventory.lastMarkPrice,
    realizedPnlUsd: state.inventory.realizedPnl
  };
}
