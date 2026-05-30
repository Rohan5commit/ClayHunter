import { createReadStream, createWriteStream, existsSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { createInterface } from "node:readline";
import type { Decision, AgentEvent, RoundResult } from "../core/types.js";
import { parseJsonLine } from "./event-parser.js";

export class RoundStore {
  constructor(private readonly dataDir: string) {
    mkdirSync(this.roundDir(), { recursive: true });
  }

  roundDir() { return join(this.dataDir, "rounds"); }
  eventsPath(roundId: string) { return join(this.roundDir(), `${roundId}.events.jsonl`); }
  decisionsPath(roundId: string) { return join(this.roundDir(), `${roundId}.decisions.jsonl`); }
  resultsPath() { return join(this.dataDir, "results.jsonl"); }

  appendEvent(event: AgentEvent) { appendJson(this.eventsPath(event.roundId), event); }
  appendDecision(roundId: string, decision: Decision) { appendJson(this.decisionsPath(roundId), { ts: Date.now(), roundId, decision }); }
  appendResult(result: RoundResult) { appendJson(this.resultsPath(), result); }

  async readEvents(roundId: string): Promise<AgentEvent[]> {
    const path = this.eventsPath(roundId);
    if (!existsSync(path)) return [];
    const events: AgentEvent[] = [];
    const rl = createInterface({ input: createReadStream(path), crlfDelay: Infinity });
    for await (const line of rl) {
      const event = parseJsonLine(line);
      if (event) events.push(event);
    }
    return events;
  }

  listRoundIds(): string[] {
    if (!existsSync(this.roundDir())) return [];
    return readdirSync(this.roundDir())
      .filter((file) => file.endsWith(".events.jsonl"))
      .map((file) => file.replace(".events.jsonl", ""));
  }
}

function appendJson(path: string, value: unknown) {
  mkdirSync(dirname(path), { recursive: true });
  const stream = createWriteStream(path, { flags: "a" });
  stream.end(`${JSON.stringify(value)}\n`);
}
