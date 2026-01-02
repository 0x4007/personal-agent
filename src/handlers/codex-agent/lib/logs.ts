import fs from "node:fs";
import path from "node:path";
import { safeStringify } from "./utils";

export function writeRuntimeLogs(params: { prompt: string; request: unknown; payload: unknown }) {
  const dir = path.resolve(process.cwd(), "runtime-logs");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const runId = process.env.GITHUB_RUN_ID || String(Date.now());

  const promptPath = path.join(dir, `prompt-${runId}.txt`);
  const requestPath = path.join(dir, `llm-request-${runId}.json`);
  const payloadPath = path.join(dir, `event-${runId}.json`);

  fs.writeFileSync(promptPath, params.prompt, "utf8");
  fs.writeFileSync(requestPath, JSON.stringify(params.request, null, 2), "utf8");

  if (process.env.WRITE_EVENT_FILE === "1") {
    try {
      fs.writeFileSync(payloadPath, JSON.stringify(params.payload, null, 2), "utf8");
    } catch {
      // ignore
    }
  }
}

export function logPromptIfEnabled(args: { logger: { info: (...a: unknown[]) => unknown }; prompt: string; payload: unknown }): void {
  const { logger, prompt, payload } = args;
  if (process.env.LOG_PROMPT === "1") {
    logger.info("[personalAgent] Prompt", { length: prompt.length, prompt, payloadSize: safeStringify(payload).length });
  }
}

export async function maybeWriteRuntimeLogs(args: {
  prompt: string;
  request: unknown;
  payload: unknown;
  logger: { info: (...a: unknown[]) => unknown };
}): Promise<void> {
  const { prompt, request, payload, logger } = args;
  if (process.env.WRITE_PROMPT_FILE !== "1") return;
  try {
    writeRuntimeLogs({ prompt, request, payload });
  } catch (e) {
    logger.info("[personalAgent] runtime log write failed (non-fatal)", { error: String(e) });
  }
}
