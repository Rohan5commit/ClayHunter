import type { RegimeResult, RoundState, StrategyProposal } from "../core/types.js";

export function estimateDissolutionValue(state: RoundState, token: number, usdc: number, mark = state.inventory.lastMarkPrice): number {
  const roundDrift = state.ticks.length > 1 ? (mark - state.ticks[0].price) / state.ticks[0].price : 0;
  const conservativeHaircut = Math.max(-0.08, Math.min(0.05, roundDrift * 0.35));
  return usdc + token * mark * (1 + conservativeHaircut);
}

export function endgameProposal(state: RoundState, regime: RegimeResult): StrategyProposal {
  const mark = state.inventory.lastMarkPrice || state.ticks.at(-1)?.price || 1;
  const tokenValue = state.inventory.token * mark;
  const total = state.inventory.usdc + tokenValue;
  if (total <= 0) return { action: "HOLD", sizeUsd: 0, confidence: 0, expectedEdge: 0, module: "endgame", signals: { reason: "empty inventory" } };
  const currentValue = estimateDissolutionValue(state, state.inventory.token, state.inventory.usdc, mark);
  const buyUsd = Math.min(state.inventory.usdc * 0.35, total * 0.15);
  const sellUsd = Math.min(tokenValue * 0.35, total * 0.15);
  const buyValue = estimateDissolutionValue(state, state.inventory.token + buyUsd / mark, state.inventory.usdc - buyUsd, mark);
  const sellValue = estimateDissolutionValue(state, Math.max(0, state.inventory.token - sellUsd / mark), state.inventory.usdc + sellUsd, mark);
  const best = Math.max(currentValue, buyValue, sellValue);
  const expectedEdge = best - currentValue;
  const tokenWeight = tokenValue / total;
  if (expectedEdge <= Math.max(0.03, total * 0.0005)) {
    return { action: "HOLD", sizeUsd: 0, confidence: regime.confidence, expectedEdge, module: "endgame", signals: { currentValue, tokenWeight, reason: "rebalance edge too small" } };
  }
  const action = buyValue === best ? "BUY" : "SELL";
  return { action, sizeUsd: action === "BUY" ? buyUsd : sellUsd, confidence: regime.confidence, expectedEdge, module: "endgame", signals: { currentValue, buyValue, sellValue, tokenWeight, mark } };
}
