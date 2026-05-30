import type { AppConfig } from "../core/config.js";
import type { RoundResult, RoundState, StrategyProposal } from "../core/types.js";
import { DrawdownGuard } from "./drawdown-guard.js";

export class BankrollManager {
  private lossStreak = 0;
  private readonly drawdown: DrawdownGuard;
  constructor(private bankroll: number, private readonly cfg: Pick<AppConfig, "dailyDrawdownPct" | "sessionDrawdownPct" | "lossStreakLimit" | "downshiftMultiplier" | "maxRoundCapitalPct" | "maxOrderUsd" | "minOrderUsd">) {
    this.drawdown = new DrawdownGuard(bankroll, cfg);
  }
  current() { return this.bankroll; }
  recordResult(result: RoundResult) {
    this.bankroll = result.endBankrollUsd;
    this.lossStreak = result.pnlUsd < 0 ? this.lossStreak + 1 : 0;
  }
  applyRisk(state: RoundState, proposal: StrategyProposal): { proposal: StrategyProposal; override?: string } {
    const dd = this.drawdown.check(state.bankrollUsd);
    if (!dd.ok) return { proposal: { ...proposal, action: "HOLD", sizeUsd: 0 }, override: dd.reason };
    if (proposal.action === "HOLD") return { proposal };
    const roundCap = state.bankrollUsd * this.cfg.maxRoundCapitalPct;
    const used = state.trades.reduce((acc, t) => acc + t.sizeUsd, 0);
    if (used >= roundCap) return { proposal: { ...proposal, action: "HOLD", sizeUsd: 0 }, override: "per-round capital cap reached" };
    const throttle = this.lossStreak >= this.cfg.lossStreakLimit ? this.cfg.downshiftMultiplier : 1;
    const sizeUsd = Math.min(proposal.sizeUsd * throttle, roundCap - used, this.cfg.maxOrderUsd);
    if (sizeUsd < this.cfg.minOrderUsd) return { proposal: { ...proposal, action: "HOLD", sizeUsd: 0 }, override: this.lossStreak >= this.cfg.lossStreakLimit ? "loss-streak throttle below min size" : "size below min order" };
    return { proposal: { ...proposal, sizeUsd: Number(sizeUsd.toFixed(4)) }, override: throttle < 1 ? "loss-streak downshift" : undefined };
  }
}
