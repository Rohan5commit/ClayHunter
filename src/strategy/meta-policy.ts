import type { AppConfig } from "../core/config.js";
import type { Decision, RoundState, StrategyProposal } from "../core/types.js";
import { BankrollManager } from "../risk/bankroll-manager.js";
import { KillSwitch } from "../risk/kill-switch.js";
import { endgameProposal } from "./endgame-rebalance.js";
import { fadeProposal } from "./fade.js";
import { momentumProposal } from "./momentum.js";
import { classifyRegime } from "./regime-classifier.js";
import { sizeProposal } from "./sizing.js";

export function decide(state: RoundState, cfg: AppConfig, bankroll: BankrollManager, killSwitch: KillSwitch, now = Date.now()): Decision {
  const regime = classifyRegime(state, cfg, now);
  const unsafe = killSwitch.check(state, now);
  let proposal: StrategyProposal = { action: "HOLD", sizeUsd: 0, confidence: regime.confidence, expectedEdge: 0, module: "none", signals: { phase: state.phase } };

  if (state.phase === "OBSERVE_MM_PHASE" || state.phase === "PRE_GAME" || state.phase === "ROUND_COMPLETE") {
    proposal.signals = { ...proposal.signals, reason: "phase forbids trading" };
  } else if (!unsafe.ok) {
    proposal.signals = { ...proposal.signals, reason: unsafe.reason ?? "unsafe protocol state" };
  } else if (regime.regime === "ENDGAME_REBALANCE") {
    proposal = endgameProposal(state, regime);
  } else if (regime.regime === "BREAKOUT_MOMENTUM" && regime.confidence >= cfg.momentumConfidence) {
    proposal = momentumProposal(state, regime);
  } else if (regime.regime === "OVERREACTION_FADE" && regime.confidence >= cfg.fadeConfidence) {
    proposal = fadeProposal(state, regime);
  }

  proposal = sizeProposal(proposal, state, cfg);
  const risked = unsafe.ok ? bankroll.applyRisk(state, proposal) : { proposal: { ...proposal, action: "HOLD" as const, sizeUsd: 0 }, override: unsafe.reason };
  const finalProposal = risked.proposal.action !== "HOLD" && risked.proposal.sizeUsd <= 0 ? { ...risked.proposal, action: "HOLD" as const } : risked.proposal;

  return {
    action: finalProposal.action,
    sizeUsd: finalProposal.sizeUsd,
    rationale: {
      regime: regime.regime,
      confidence: finalProposal.confidence,
      signals: { ...regime.signals, ...finalProposal.signals },
      riskOverride: risked.override,
      expectedEdge: finalProposal.expectedEdge,
      module: finalProposal.module,
      timeRemaining: regime.signals.timeRemainingSec,
      inventoryState: state.inventory,
      finalAction: finalProposal.action,
      finalSize: finalProposal.sizeUsd
    }
  };
}
