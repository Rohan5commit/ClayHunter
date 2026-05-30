import { z } from "zod";
import type { AgentEvent } from "../core/types.js";

const EventSchema = z.object({
  type: z.enum(["ROUND_CREATED", "PHASE_CHANGED", "MARKET_TICK", "TRADE_FILL", "ROUND_SETTLED"]),
  ts: z.coerce.number(),
  roundId: z.string().min(1),
  payload: z.record(z.unknown()).default({})
});

export function parseAgentEvent(input: unknown): AgentEvent {
  return EventSchema.parse(input);
}

export function parseJsonLine(line: string): AgentEvent | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  return parseAgentEvent(JSON.parse(trimmed));
}
