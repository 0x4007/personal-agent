import fs from "node:fs";
import path from "node:path";
import { safeStringify, stripUrlFields } from "./utils";

export function writeRuntimeLogs(params: { task: string; inputs: unknown; payload: unknown; sanitized?: unknown }) {
  const dir = path.resolve(process.cwd(), "runtime-logs");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const runId = process.env.GITHUB_RUN_ID || String(Date.now());

  const promptPath = path.join(dir, `prompt-${runId}.txt`);
  const bodyPath = path.join(dir, `agent-request-${runId}.json`);
  const payloadPath = path.join(dir, `event-${runId}.json`);
  const payloadSanitizedPath = path.join(dir, `event-sanitized-${runId}.json`);

  fs.writeFileSync(promptPath, params.task, "utf8");
  fs.writeFileSync(bodyPath, JSON.stringify(params.inputs, null, 2), "utf8");

  if (process.env.WRITE_EVENT_FILE === "1") {
    try {
      fs.writeFileSync(payloadPath, JSON.stringify(params.payload, null, 2), "utf8");
      if (params.sanitized !== undefined) {
        fs.writeFileSync(payloadSanitizedPath, JSON.stringify(params.sanitized, null, 2), "utf8");
      }
    } catch {
      // ignore
    }
  }
}

export function logPayloadIfEnabled(args: { logger: { info: (...a: unknown[]) => unknown }; payload: unknown; task: string; inputs: unknown }): void {
  const { logger, payload, task, inputs } = args;
  if (process.env.LOG_PROMPT === "1") {
    const rawLen = safeStringify(payload).length;
    const inputsLen = safeStringify(inputs).length;
    logger.info("[codexAgent] Task (full)", { length: task.length, task, eventLen: rawLen, inputsLen });
  }
}

export async function maybeWriteRuntimeLogs(args: {
  task: string;
  inputs: unknown;
  payload: unknown;
  logger: { info: (...a: unknown[]) => unknown };
}): Promise<void> {
  const { task, inputs, payload, logger } = args;
  if (process.env.WRITE_PROMPT_FILE !== "1") return;
  try {
    writeRuntimeLogs({ task, inputs, payload, sanitized: process.env.PROMPT_INCLUDE_EVENT === "1" ? stripUrlFields(payload) : undefined });
  } catch (e) {
    logger.info("[codexAgent] runtime log write failed (non-fatal)", { error: String(e) });
  }
}
