import pino from "pino";
import type { AppConfig } from "./config.js";

export function createLogger(config: Pick<AppConfig, "logLevel">) {
  return pino({
    level: config.logLevel,
    transport: process.stdout.isTTY ? { target: "pino-pretty", options: { colorize: true, translateTime: "SYS:standard" } } : undefined
  });
}
