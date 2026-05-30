import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/core/config.js";
import { applyTick, createInitialRound, nextPhaseByClock } from "../src/core/state-machine.js";
import type { RoundState } from "../src/core/types.js";
import { classifyRegime } from "../src/strategy/regime-classifier.js";
import { sizeProposal } from "../src/strategy/sizing.js";
import { DrawdownGuard } from "../src/risk/drawdown-guard.js";
import { KillSwitch } from "../src/risk/kill-switch.js";
import { OrderRouter } from "../src/execution/order-router.js";
import { PaperBidClient } from "../src/execution/bid-client.js";
import { endgameProposal } from "../src/strategy/endgame-rebalance.js";

const cfg = loadConfig({ BID_MODE: "paper", CLAY_LOG_LEVEL: "silent" } as NodeJS.ProcessEnv);

function trendingRound(direction = 1): RoundState {
  let state = createInitialRound("r", 0, 1000, 1);
  for (let i = 0; i < 60; i++) {
    const price = 1 + direction * i * 0.004;
    state = applyTick(state, { roundId: "r", ts: i * 1000, price, buyVolumeUsd: direction > 0 ? 30 : 10, sellVolumeUsd: direction > 0 ? 10 : 30, volumeUsd: 40 }, cfg);
  }
  return state;
}

describe("state machine", () => {
  it("moves through observe, active, endgame, complete", () => {
    const s = createInitialRound("r", 0, 1000);
    expect(nextPhaseByClock(s, 1_000, cfg)).toBe("OBSERVE_MM_PHASE");
    expect(nextPhaseByClock(s, 40_000, cfg)).toBe("ACTIVE_TRADING");
    expect(nextPhaseByClock(s, 190_000, cfg)).toBe("ENDGAME_REBALANCE");
    expect(nextPhaseByClock(s, 220_000, cfg)).toBe("ROUND_COMPLETE");
  });
});

describe("regime classifier", () => {
  it("detects momentum on persistent flow", () => {
    const state = trendingRound(1);
    const result = classifyRegime({ ...state, phase: "ACTIVE_TRADING" }, cfg, 60_000);
    expect(result.regime).toBe("BREAKOUT_MOMENTUM");
  });
});

describe("sizing", () => {
  it("never allocates full bankroll", () => {
    const state = trendingRound(1);
    const sized = sizeProposal({ action: "BUY", sizeUsd: 0, confidence: 0.9, expectedEdge: 1, module: "momentum", signals: {} }, state, cfg);
    expect(sized.sizeUsd).toBeLessThan(cfg.startingBankrollUsd);
    expect(sized.sizeUsd).toBeLessThanOrEqual(cfg.maxOrderUsd);
  });
});

describe("drawdown guard", () => {
  it("stops after configured drawdown", () => {
    const guard = new DrawdownGuard(1000, cfg);
    expect(guard.check(1000).ok).toBe(true);
    expect(guard.check(850).ok).toBe(false);
  });
});

describe("kill switch", () => {
  it("fails safe on stale market state", () => {
    const state = trendingRound(1);
    const kill = new KillSwitch({ killSwitchEnabled: true, staleMarketMs: 100 });
    expect(kill.check(state, 1_000_000).ok).toBe(false);
  });
});

describe("order router", () => {
  it("prevents duplicate orders", async () => {
    let orders = 0;
    const client = { events: async function* () {}, submitOrder: async (order: any) => { orders++; return { id: order.clientOrderId, roundId: order.roundId, ts: 0, action: order.action, sizeUsd: order.sizeUsd, price: 1, tokenAmount: order.sizeUsd, module: "test" }; } };
    const router = new OrderRouter(client);
    const state = trendingRound(1);
    const decision: any = { action: "BUY", sizeUsd: 5, rationale: { module: "momentum" } };
    await router.route(state, decision);
    await router.route(state, decision);
    expect(orders).toBe(1);
  });

  it("allows repeated same-side orders after duplicate TTL expires", async () => {
    let orders = 0;
    const client = { events: async function* () {}, submitOrder: async (order: any) => { orders++; return { id: order.clientOrderId, roundId: order.roundId, ts: 0, action: order.action, sizeUsd: order.sizeUsd, price: 1, tokenAmount: order.sizeUsd, module: "test" }; } };
    const router = new OrderRouter(client);
    const state = trendingRound(1);
    const decision: any = { action: "BUY", sizeUsd: 5, rationale: { module: "momentum" } };
    await router.route(state, decision);
    const later = { ...state, ticks: [...state.ticks, { roundId: "r", ts: 100_000, price: 1.2 }] };
    await router.route(later, decision);
    expect(orders).toBe(2);
  });
});

describe("endgame rebalance", () => {
  it("returns sane bounded action", () => {
    const state = { ...trendingRound(1), phase: "ENDGAME_REBALANCE" as const };
    const regime = classifyRegime(state, cfg, 190_000);
    const proposal = endgameProposal(state, regime);
    expect(["BUY", "SELL", "HOLD"]).toContain(proposal.action);
    expect(proposal.sizeUsd).toBeGreaterThanOrEqual(0);
  });
});

describe("config", () => {
  it("validates live credentials", () => {
    expect(() => loadConfig({ BID_MODE: "live" } as NodeJS.ProcessEnv)).toThrow();
  });
});


describe("paper client", () => {
  it("fills at the latest paper mark instead of a constant placeholder", async () => {
    const client = new PaperBidClient(cfg);
    const iterator = client.events()[Symbol.asyncIterator]();
    await iterator.next();
    await iterator.next();
    const fill = await client.submitOrder({ roundId: "paper", action: "BUY", sizeUsd: 10, clientOrderId: "paper-1", reason: { regime: "CHOP_NO_EDGE", confidence: 0, signals: {}, module: "test", timeRemaining: 0, inventoryState: { usdc: 10, token: 0, avgEntryPrice: 0, realizedPnl: 0, lastMarkPrice: 1 }, finalAction: "BUY", finalSize: 10 } });
    expect(fill.price).not.toBe(1);
    expect(fill.tokenAmount).toBeCloseTo(fill.sizeUsd / fill.price);
  });
});
