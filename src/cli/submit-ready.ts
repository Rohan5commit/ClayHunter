import { mkdirSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

interface StepResult {
  command: string;
  status: "pass" | "fail";
  code: number | null;
}

const env = {
  ...process.env,
  BID_MODE: process.env.BID_MODE ?? "paper",
  CLAY_LOG_LEVEL: process.env.CLAY_LOG_LEVEL ?? "error"
};

const steps = [
  "pnpm test",
  "pnpm build",
  "pnpm run:paper",
  "pnpm replay",
  "pnpm inspect",
  "pnpm status"
];

const results: StepResult[] = [];

for (const command of steps) {
  console.log(`\n▶ ${command}`);
  const result = spawnSync(command, { shell: true, stdio: "inherit", env });
  const passed = result.status === 0;
  results.push({ command, status: passed ? "pass" : "fail", code: result.status });
  if (!passed) {
    writeSummary(results);
    process.exit(result.status ?? 1);
  }
}

writeSummary(results);
console.log("\n✅ ClayHunter is submission-ready. Use SUBMISSION.md and docs/demo-script.md for Devpost/judging.");

function writeSummary(results: StepResult[]) {
  const outDir = process.env.CLAY_DATA_DIR ?? ".clayhunter";
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "submission-summary.json"), `${JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2)}\n`);
}
