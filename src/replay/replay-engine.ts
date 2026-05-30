import type { AppConfig } from "../core/config.js";
import { applyEvent, createInitialRound } from "../core/state-machine.js";
import type { Decision, RoundState } from "../core/types.js";
import { BankrollManager } from "../risk/bankroll-manager.js";
import { KillSwitch } from "../risk/kill-switch.js";
import { decide } from "../strategy/meta-policy.js";
import { computeReplayMetrics } from "./metrics.js";
import type { RoundStore } from "../data/round-store.js";

export async function replayRound(store: RoundStore, roundId: string, cfg: AppConfig) {
  const events = await store.readEvents(roundId);
  let state: RoundState | undefined;
  const bankroll = new BankrollManager(cfg.startingBankrollUsd, cfg);
  const kill = new KillSwitch(cfg);
  const decisions: Decision[] = [];
  for (const event of events) {
    if (!state) state = createInitialRound(roundId, event.ts, cfg.startingBankrollUsd);
    state = applyEvent(state, event, cfg);
    if (event.type === "MARKET_TICK") {
      const decision = decide(state, cfg, bankroll, kill, event.ts);
      decisions.push(decision);
      if (decision.action !== "HOLD" && decision.sizeUsd > 0) {
        const price = state.inventory.lastMarkPrice || 1;
        const tokenAmount = decision.sizeUsd / price;
        const fill = { id: `replay-${event.ts}-${decision.action}`, roundId, ts: event.ts, action: decision.action, sizeUsd: decision.sizeUsd, price, tokenAmount, module: decision.rationale.module };
        const inv = { ...state.inventory };
        if (decision.action === "BUY") {
          const previousValue = inv.token * inv.avgEntryPrice;
          inv.usdc -= decision.sizeUsd;
          inv.token += tokenAmount;
          inv.avgEntryPrice = inv.token > 0 ? (previousValue + decision.sizeUsd) / inv.token : 0;
        } else {
          const sellTokens = Math.min(inv.token, tokenAmount);
          inv.token -= sellTokens;
          inv.usdc += decision.sizeUsd;
          inv.realizedPnl += decision.sizeUsd - sellTokens * inv.avgEntryPrice;
        }
        state = { ...state, inventory: inv, trades: [...state.trades, fill] };
      }
    }
  }
  if (!state) throw new Error(`No events found for ${roundId}`);
  return { state, decisions, metrics: computeReplayMetrics(state, decisions) };
}
