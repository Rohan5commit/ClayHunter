import type { AppConfig } from "../core/config.js";
import type { RoundState, StrategyProposal } from "../core/types.js";

export function sizeProposal(proposal: StrategyProposal, state: RoundState, cfg: Pick<AppConfig, "maxRoundCapitalPct" | "maxOrderUsd" | "minOrderUsd">): StrategyProposal {
  if (proposal.action === "HOLD") return { ...proposal, sizeUsd: 0 };
  if (proposal.sizeUsd > 0) return { ...proposal, sizeUsd: clampOrder(proposal.sizeUsd, state, cfg, proposal.action) };
  const maxRound = state.bankrollUsd * cfg.maxRoundCapitalPct;
  const alreadyUsed = state.trades.reduce((acc, t) => acc + t.sizeUsd, 0);
  const remainingRound = Math.max(0, maxRound - alreadyUsed);
  const conviction = Math.max(0, Math.min(1, proposal.confidence)) * Math.max(0.25, Math.min(1, proposal.expectedEdge * 20));
  const raw = Math.min(cfg.maxOrderUsd, remainingRound) * conviction;
  return { ...proposal, sizeUsd: clampOrder(raw, state, cfg, proposal.action) };
}

function clampOrder(raw: number, state: RoundState, cfg: Pick<AppConfig, "maxOrderUsd" | "minOrderUsd">, action: "BUY" | "SELL") {
  const afford = action === "BUY" ? state.inventory.usdc : state.inventory.token * state.inventory.lastMarkPrice;
  const sized = Math.min(raw, cfg.maxOrderUsd, afford);
  return sized >= cfg.minOrderUsd ? Number(sized.toFixed(4)) : 0;
}
