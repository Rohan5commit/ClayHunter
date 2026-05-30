import type { Logger } from "pino";
import WebSocket from "ws";
import type { AppConfig } from "../core/config.js";
import type { AgentEvent, OrderIntent, TradeFill } from "../core/types.js";
import { parseAgentEvent } from "../data/event-parser.js";

export interface BidClient {
  events(): AsyncIterable<AgentEvent>;
  submitOrder(order: OrderIntent): Promise<TradeFill>;
}

export class HttpBidClient implements BidClient {
  constructor(private readonly cfg: AppConfig, private readonly logger: Logger) {}
  async *events(): AsyncIterable<AgentEvent> {
    if (this.cfg.wsUrl.startsWith("ws://") || this.cfg.wsUrl.startsWith("wss://")) {
      yield* this.websocketEvents();
      return;
    }
    yield* this.httpStreamEvents(this.cfg.wsUrl);
  }

  private async *websocketEvents(): AsyncIterable<AgentEvent> {
    const socket = new WebSocket(this.cfg.wsUrl, {
      headers: {
        ...(this.cfg.apiKey ? { authorization: `Bearer ${this.cfg.apiKey}` } : {}),
        ...(this.cfg.accessCode ? { "x-access-code": this.cfg.accessCode } : {}),
        "x-agent-id": this.cfg.agentId
      }
    });
    const messages: string[] = [];
    let closed = false;
    let failure: Error | undefined;
    socket.on("message", (data) => messages.push(data.toString()));
    socket.on("close", () => { closed = true; });
    socket.on("error", (err) => { failure = err; closed = true; });
    while (!closed || messages.length > 0) {
      const raw = messages.shift();
      if (raw) {
        yield parseAgentEvent(JSON.parse(raw));
      } else {
        await new Promise((resolve) => setTimeout(resolve, 25));
      }
    }
    if (failure) throw failure;
  }

  private async *httpStreamEvents(eventUrl: string): AsyncIterable<AgentEvent> {
    const response = await fetch(eventUrl, {
      headers: {
        accept: "application/x-ndjson, application/json, text/event-stream",
        ...(this.cfg.apiKey ? { authorization: `Bearer ${this.cfg.apiKey}` } : {}),
        ...(this.cfg.accessCode ? { "x-access-code": this.cfg.accessCode } : {}),
        "x-agent-id": this.cfg.agentId
      }
    });
    if (!response.ok || !response.body) throw new Error(`BID event stream failed: ${response.status} ${await response.text()}`);
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? "";
      for (const raw of lines) {
        const line = raw.startsWith("data:") ? raw.slice(5).trim() : raw.trim();
        if (!line || line === "[DONE]") continue;
        yield parseAgentEvent(JSON.parse(line));
      }
    }
  }

  async submitOrder(order: OrderIntent): Promise<TradeFill> {
    const response = await fetch(`${this.cfg.apiUrl.replace(/\/$/, "")}/orders`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(this.cfg.apiKey ? { authorization: `Bearer ${this.cfg.apiKey}` } : {}),
        ...(this.cfg.accessCode ? { "x-access-code": this.cfg.accessCode } : {}),
        "x-agent-id": this.cfg.agentId
      },
      body: JSON.stringify(order)
    });
    if (!response.ok) throw new Error(`BID order rejected: ${response.status} ${await response.text()}`);
    const payload = await response.json() as Partial<TradeFill>;
    this.logger.info({ order, payload }, "live order accepted");
    return {
      id: payload.id ?? order.clientOrderId,
      roundId: order.roundId,
      ts: payload.ts ?? Date.now(),
      action: order.action,
      sizeUsd: payload.sizeUsd ?? order.sizeUsd,
      price: payload.price ?? 0,
      tokenAmount: payload.tokenAmount ?? 0,
      feeUsd: payload.feeUsd,
      module: order.reason.module
    };
  }
}

export class PaperBidClient implements BidClient {
  private lastPrice = 1;
  private lastTs = Date.now();
  constructor(private readonly cfg: AppConfig) {}
  async *events(): AsyncIterable<AgentEvent> {
    const roundId = `paper-${Date.now()}`;
    const start = Date.now();
    this.lastTs = start;
    yield { type: "ROUND_CREATED", ts: start, roundId, payload: {} };
    let price = 1;
    for (let i = 0; i < this.cfg.observeSeconds + this.cfg.activeSeconds; i += 2) {
      const ts = start + i * 1000;
      const phase = i < this.cfg.observeSeconds ? "OBSERVE_MM_PHASE" : i >= this.cfg.observeSeconds + this.cfg.activeSeconds - this.cfg.endgameSeconds ? "ENDGAME_REBALANCE" : "ACTIVE_TRADING";
      const trend = i < 80 ? 0.0025 : i < 150 ? -0.001 : 0.0008;
      price = Math.max(0.2, price * (1 + trend + Math.sin(i / 9) * 0.0015));
      this.lastPrice = price;
      this.lastTs = ts;
      yield parseAgentEvent({ type: "MARKET_TICK", ts, roundId, payload: { phase, price, bid: price * 0.998, ask: price * 1.002, volumeUsd: 40 + i, buyVolumeUsd: trend > 0 ? 28 + i / 3 : 14, sellVolumeUsd: trend > 0 ? 12 : 27 + i / 4 } });
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    yield { type: "ROUND_SETTLED", ts: start + (this.cfg.observeSeconds + this.cfg.activeSeconds) * 1000, roundId, payload: { settlementPrice: this.lastPrice } };
  }
  async submitOrder(order: OrderIntent): Promise<TradeFill> {
    return { id: order.clientOrderId, roundId: order.roundId, ts: this.lastTs, action: order.action, sizeUsd: order.sizeUsd, price: this.lastPrice, tokenAmount: order.sizeUsd / this.lastPrice, module: order.reason.module };
  }
}
