import type { BidClient } from "./bid-client.js";
import type { Decision, OrderIntent, RoundState, TradeFill } from "../core/types.js";

const DUPLICATE_ORDER_TTL_MS = 5_000;

export class OrderRouter {
  private inFlight = new Set<string>();
  private inFlightRoundActions = new Map<string, "BUY" | "SELL">();
  private recent = new Map<string, number>();
  constructor(private readonly client: BidClient) {}

  async route(state: RoundState, decision: Decision): Promise<TradeFill | null> {
    if (decision.action === "HOLD" || decision.sizeUsd <= 0) return null;
    const now = state.ticks.at(-1)?.ts ?? Date.now();
    this.prune(now);
    const signature = `${state.roundId}:${decision.action}:${decision.sizeUsd.toFixed(2)}:${decision.rationale.module}`;
    const inFlightAction = this.inFlightRoundActions.get(state.roundId);
    if (this.inFlight.has(signature) || this.recent.has(signature) || (inFlightAction && inFlightAction !== decision.action)) return null;
    this.inFlight.add(signature);
    this.inFlightRoundActions.set(state.roundId, decision.action);
    try {
      const order: OrderIntent = {
        roundId: state.roundId,
        action: decision.action,
        sizeUsd: decision.sizeUsd,
        clientOrderId: `${state.roundId}-${now}-${decision.action}`,
        reason: decision.rationale
      };
      const fill = await this.client.submitOrder(order);
      this.recent.set(signature, now + DUPLICATE_ORDER_TTL_MS);
      return fill;
    } finally {
      this.inFlight.delete(signature);
      this.inFlightRoundActions.delete(state.roundId);
    }
  }

  private prune(now: number) {
    for (const [signature, expiresAt] of this.recent.entries()) {
      if (expiresAt <= now) this.recent.delete(signature);
    }
  }
}
