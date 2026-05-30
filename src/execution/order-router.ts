import type { BidClient } from "./bid-client.js";
import type { Decision, OrderIntent, RoundState, TradeFill } from "../core/types.js";

export class OrderRouter {
  private inFlight = new Set<string>();
  private lastSignature = "";
  constructor(private readonly client: BidClient) {}

  async route(state: RoundState, decision: Decision): Promise<TradeFill | null> {
    if (decision.action === "HOLD" || decision.sizeUsd <= 0) return null;
    const signature = `${state.roundId}:${decision.action}:${decision.sizeUsd.toFixed(2)}:${decision.rationale.module}`;
    if (this.inFlight.has(signature) || this.lastSignature === signature) return null;
    this.inFlight.add(signature);
    try {
      const order: OrderIntent = {
        roundId: state.roundId,
        action: decision.action,
        sizeUsd: decision.sizeUsd,
        clientOrderId: `${state.roundId}-${Date.now()}-${decision.action}`,
        reason: decision.rationale
      };
      const fill = await this.client.submitOrder(order);
      this.lastSignature = signature;
      return fill;
    } finally {
      this.inFlight.delete(signature);
    }
  }
}
