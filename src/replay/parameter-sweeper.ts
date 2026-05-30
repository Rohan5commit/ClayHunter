import type { AppConfig } from "../core/config.js";
import type { RoundStore } from "../data/round-store.js";
import { replayRound } from "./replay-engine.js";

export async function sweepThresholds(store: RoundStore, cfg: AppConfig, roundIds = store.listRoundIds()) {
  const candidates = [0.55, 0.62, 0.7].flatMap((momentum) => [0.6, 0.66, 0.74].map((fade) => ({ momentum, fade })));
  const rows = [];
  for (const c of candidates) {
    const tuned = { ...cfg, momentumConfidence: c.momentum, fadeConfidence: c.fade };
    let score = 0;
    for (const id of roundIds) score += (await replayRound(store, id, tuned)).metrics.endingValueUsd;
    rows.push({ ...c, score });
  }
  return rows.sort((a, b) => b.score - a.score);
}
