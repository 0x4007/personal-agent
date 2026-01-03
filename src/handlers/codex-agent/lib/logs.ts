import fs from "node:fs";
import path from "node:path";
import { safeStringify, stripUrlFields } from "./utils";

export function writeRuntimeLogs(params: { prompt: string; body: unknown; payload: unknown; sanitized?: unknown }) {
  const dir = path.resolve(process.cwd(), "runtime-logs");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const runId = process.env.GITHUB_RUN_ID || String(Date.now());

  const promptPath = path.join(dir, `prompt-${runId}.txt`);
  const bodyPath = path.join(dir, `pi-request-${runId}.json`);
  const payloadPath = path.join(dir, `event-${runId}.json`);
  const payloadSanitizedPath = path.join(dir, `event-sanitized-${runId}.json`);

  fs.writeFileSync(promptPath, params.prompt, "utf8");
  fs.writeFileSync(bodyPath, JSON.stringify(params.body, null, 2), "utf8");

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

export function logPayloadIfEnabled(args: {
  logger: { info: (...a: unknown[]) => unknown };
  payload: unknown;
  eventJson: string;
  contextJson: string;
  prompt: string;
}): void {
  const { logger, payload, eventJson, contextJson, prompt } = args;
  if (process.env.LOG_PROMPT === "1") {
    const rawLen = process.env.PROMPT_INCLUDE_EVENT === "1" || process.env.INCLUDE_GH_EVENT === "1" ? safeStringify(payload).length : 0;
    const sanLen = rawLen > 0 ? eventJson.length : 0;
    const ctxLen = contextJson.length;
    logger.info("[codexAgent] Prompt (full)", { length: prompt.length, prompt, eventRawLen: rawLen, eventSanitizedLen: sanLen, contextLen: ctxLen });
  }
}

export async function maybeWriteRuntimeLogs(args: {
  prompt: string;
  body: unknown;
  payload: unknown;
  logger: { info: (...a: unknown[]) => unknown };
}): Promise<void> {
  const { prompt, body, payload, logger } = args;
  if (process.env.WRITE_PROMPT_FILE !== "1") return;
  try {
    writeRuntimeLogs({ prompt, body, payload, sanitized: process.env.PROMPT_INCLUDE_EVENT === "1" ? stripUrlFields(payload) : undefined });
  } catch (e) {
    logger.info("[codexAgent] runtime log write failed (non-fatal)", { error: String(e) });
  }
}
