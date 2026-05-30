import type { AppConfig } from "../core/config.js";

export class DrawdownGuard {
  private sessionHighWater: number;
  private dailyStart: number;
  constructor(startBankroll: number, private readonly cfg: Pick<AppConfig, "dailyDrawdownPct" | "sessionDrawdownPct">) {
    this.sessionHighWater = startBankroll;
    this.dailyStart = startBankroll;
  }
  check(currentBankroll: number): { ok: boolean; reason?: string } {
    this.sessionHighWater = Math.max(this.sessionHighWater, currentBankroll);
    if ((this.dailyStart - currentBankroll) / this.dailyStart >= this.cfg.dailyDrawdownPct) return { ok: false, reason: "daily drawdown stop" };
    if ((this.sessionHighWater - currentBankroll) / this.sessionHighWater >= this.cfg.sessionDrawdownPct) return { ok: false, reason: "session drawdown stop" };
    return { ok: true };
  }
}
