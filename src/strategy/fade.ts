import type { RegimeResult, RoundState, StrategyProposal } from "../core/types.js";

export function fadeProposal(state: RoundState, regime: RegimeResult): StrategyProposal {
  const s = regime.signals;
  const confidence = regime.regime === "OVERREACTION_FADE" ? regime.confidence : regime.confidence * 0.35;
  if (confidence < 0.6 || Math.abs(s.extensionZ) < 1.2) {
    return { action: "HOLD", sizeUsd: 0, confidence, expectedEdge: 0, module: "fade", signals: { reason: "below fade gate", extensionZ: s.extensionZ } };
  }
  const stretchedUp = s.extensionZ > 0;
  const action = stretchedUp && state.inventory.token > 0 ? "SELL" : stretchedUp ? "HOLD" : "BUY";
  return {
    action,
    sizeUsd: 0,
    confidence,
    expectedEdge: Math.abs(s.extensionZ) * 0.015 + Math.max(0, -s.participationTrend) * 0.02,
    module: "fade",
    signals: { extensionZ: s.extensionZ, participationTrend: s.participationTrend, realizedVolatility: s.realizedVolatility }
  };
}
