import type { RegimeResult, RoundState, StrategyProposal } from "../core/types.js";

export function momentumProposal(state: RoundState, regime: RegimeResult): StrategyProposal {
  const s = regime.signals;
  const direction = Math.sign(s.drift + s.acceleration * 0.7 + s.orderFlowImbalance * 0.02);
  const confidence = regime.regime === "BREAKOUT_MOMENTUM" ? regime.confidence : regime.confidence * 0.4;
  if (confidence < 0.55 || direction === 0) return hold("momentum", confidence, s, "below momentum gate");
  return {
    action: direction > 0 ? "BUY" : state.inventory.token > 0 ? "SELL" : "HOLD",
    sizeUsd: 0,
    confidence,
    expectedEdge: Math.abs(s.drift) * 0.8 + Math.abs(s.acceleration) * 1.1 + Math.abs(s.orderFlowImbalance) * 0.04,
    module: "momentum",
    signals: { drift: s.drift, acceleration: s.acceleration, orderFlowImbalance: s.orderFlowImbalance, directionPersistence: s.directionPersistence }
  };
}

function hold(module: "momentum", confidence: number, s: RegimeResult["signals"], reason: string): StrategyProposal {
  return { action: "HOLD", sizeUsd: 0, confidence, expectedEdge: 0, module, signals: { reason, drift: s.drift, acceleration: s.acceleration } };
}
