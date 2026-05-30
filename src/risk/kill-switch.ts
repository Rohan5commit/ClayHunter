import type { AppConfig } from "../core/config.js";
import type { RoundState } from "../core/types.js";

export class KillSwitch {
  private manual = false;
  constructor(private readonly cfg: Pick<AppConfig, "killSwitchEnabled" | "staleMarketMs">) {}
  trigger() { this.manual = true; }
  reset() { this.manual = false; }
  check(state: RoundState, now = Date.now()): { ok: boolean; reason?: string } {
    if (!this.cfg.killSwitchEnabled) return { ok: true };
    if (this.manual) return { ok: false, reason: "manual kill switch active" };
    const last = state.ticks.at(-1);
    if (!last) return { ok: false, reason: "no market data" };
    if (now - last.ts > this.cfg.staleMarketMs) return { ok: false, reason: "stale protocol state" };
    if (!Number.isFinite(last.price) || last.price <= 0) return { ok: false, reason: "invalid market price" };
    return { ok: true };
  }
}
