import type { Logger } from "pino";
import type { AppConfig } from "../core/config.js";
import { applyEvent, createInitialRound } from "../core/state-machine.js";
import type { AgentEvent, RoundResult, RoundState, TradeFill } from "../core/types.js";
import { RoundStore } from "../data/round-store.js";
import { BankrollManager } from "../risk/bankroll-manager.js";
import { KillSwitch } from "../risk/kill-switch.js";
import { decide } from "../strategy/meta-policy.js";
import type { BidClient } from "./bid-client.js";
import { OrderRouter } from "./order-router.js";
import { TerminalDashboard } from "../ui/terminal-dashboard.js";

export class Trader {
  private state?: RoundState;
  private readonly router: OrderRouter;
  private readonly bankroll: BankrollManager;
  private readonly killSwitch: KillSwitch;
  private readonly seenFillIds = new Set<string>();
  constructor(private readonly cfg: AppConfig, private readonly client: BidClient, private readonly store: RoundStore, private readonly logger: Logger, private readonly dashboard = new TerminalDashboard()) {
    this.router = new OrderRouter(client);
    this.bankroll = new BankrollManager(cfg.startingBankrollUsd, cfg);
    this.killSwitch = new KillSwitch(cfg);
  }
  async run() {
    for await (const event of this.client.events()) {
      this.store.appendEvent(event);
      if (!this.state || this.state.roundId !== event.roundId) this.state = createInitialRound(event.roundId, event.ts, this.bankroll.current());
      this.state = applyEvent(this.state, event, this.cfg);
      if (event.type === "MARKET_TICK") await this.onTick();
      if (event.type === "TRADE_FILL") this.applyFill(this.fillFromEvent(event));
      if (event.type === "ROUND_SETTLED" && this.state) this.settleRound(event);
    }
  }
  private async onTick() {
    if (!this.state) return;
    const decision = decide(this.state, this.cfg, this.bankroll, this.killSwitch, this.state.ticks.at(-1)?.ts);
    this.state = { ...this.state, lastDecision: decision };
    this.store.appendDecision(this.state.roundId, decision);
    const fill = await this.router.route(this.state, decision);
    if (fill) this.applyFill(fill);
    this.dashboard.render(this.state, decision, fill ?? undefined);
    this.logger.info({ decision, fill }, "decision evaluated");
  }
  private applyFill(fill: TradeFill) {
    if (!this.state || this.seenFillIds.has(fill.id)) return;
    this.seenFillIds.add(fill.id);
    const price = fill.price || this.state.inventory.lastMarkPrice || 1;
    const tokenAmount = fill.tokenAmount || fill.sizeUsd / price;
    const inv = { ...this.state.inventory };
    if (fill.action === "BUY") {
      const previousValue = inv.token * inv.avgEntryPrice;
      inv.usdc -= fill.sizeUsd + (fill.feeUsd ?? 0);
      inv.token += tokenAmount;
      inv.avgEntryPrice = inv.token > 0 ? (previousValue + fill.sizeUsd) / inv.token : 0;
    } else {
      const sellTokens = Math.min(inv.token, tokenAmount);
      inv.token -= sellTokens;
      inv.usdc += fill.sizeUsd - (fill.feeUsd ?? 0);
      inv.realizedPnl += fill.sizeUsd - sellTokens * inv.avgEntryPrice - (fill.feeUsd ?? 0);
    }
    this.state = { ...this.state, inventory: inv, trades: [...this.state.trades, { ...fill, price, tokenAmount }] };
  }
  private fillFromEvent(event: AgentEvent): TradeFill {
    return {
      id: String(event.payload.id ?? `${event.roundId}-${event.ts}-${event.payload.action ?? "fill"}`),
      roundId: event.roundId,
      ts: event.ts,
      action: event.payload.action === "SELL" ? "SELL" : "BUY",
      sizeUsd: Number(event.payload.sizeUsd ?? 0),
      price: Number(event.payload.price ?? this.state?.inventory.lastMarkPrice ?? 0),
      tokenAmount: Number(event.payload.tokenAmount ?? 0),
      feeUsd: event.payload.feeUsd === undefined ? undefined : Number(event.payload.feeUsd),
      module: String(event.payload.module ?? this.state?.lastDecision?.rationale.module ?? "external")
    };
  }
  private settleRound(event: AgentEvent) {
    if (!this.state) return;
    const mark = Number(event.payload.settlementPrice ?? event.payload.price ?? this.state.inventory.lastMarkPrice ?? 1);
    const endBankrollUsd = Number(event.payload.endBankrollUsd ?? event.payload.payoutUsd ?? this.state.inventory.usdc + this.state.inventory.token * mark);
    const result: RoundResult = {
      roundId: this.state.roundId,
      ts: event.ts,
      startBankrollUsd: this.state.bankrollUsd,
      endBankrollUsd,
      pnlUsd: endBankrollUsd - this.state.bankrollUsd,
      moduleAttribution: this.state.trades.reduce<Record<string, number>>((acc, trade) => {
        acc[trade.module] = (acc[trade.module] ?? 0) + trade.sizeUsd;
        return acc;
      }, {})
    };
    this.bankroll.recordResult(result);
    this.store.appendResult(result);
    this.logger.info({ result }, "round complete");
  }
}
