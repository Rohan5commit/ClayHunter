import type { Decision, RoundState, TradeFill } from "../core/types.js";

export class TerminalDashboard {
  render(state: RoundState, decision: Decision, fill?: TradeFill) {
    if (!process.stdout.isTTY) return;
    console.clear();
    const rows = [
      ["Round", state.roundId],
      ["Phase", state.phase],
      ["Bankroll", `$${state.bankrollUsd.toFixed(2)}`],
      ["Inventory", `$${state.inventory.usdc.toFixed(2)} / ${state.inventory.token.toFixed(4)} token`],
      ["Last decision", `${decision.action} $${decision.sizeUsd.toFixed(2)} via ${decision.rationale.module}`],
      ["Regime", `${decision.rationale.regime} (${decision.rationale.confidence.toFixed(2)})`],
      ["Risk", decision.rationale.riskOverride ?? "clear"],
      ["Last trade", fill ? `${fill.action} $${fill.sizeUsd.toFixed(2)} @ ${fill.price.toFixed(4)}` : "none"]
    ];
    console.log("ClayHunter — dissolution-aware BID Protocol agent");
    console.table(Object.fromEntries(rows));
    console.log(JSON.stringify(decision.rationale, null, 2));
  }
}
