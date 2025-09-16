import type { Context } from "./types";
import { isIssueCommentEvent } from "./types/typeguards";
import fs from "node:fs";
import { brotliDecompressSync } from "node:zlib";

type CodexAgent = typeof import("./handlers/codex-agent") extends { codexAgent: infer Fn } ? Fn : never;

let cachedCodexAgent: Promise<CodexAgent> | undefined;

async function loadCodexAgent(): Promise<CodexAgent> {
  if (!cachedCodexAgent) {
    cachedCodexAgent = import("./handlers/codex-agent")
      .then((mod) => mod.codexAgent as CodexAgent)
      .catch(async (error) => {
        if (!isModuleNotFound(error) || !import.meta.url.endsWith(".ts")) {
          throw error;
        }

        const fallbackUrl = new URL("./handlers/codex-agent.ts", import.meta.url);
        const fallbackModule = await import(fallbackUrl.href);
        return fallbackModule.codexAgent as CodexAgent;
      });
  }

  return cachedCodexAgent;
}

function isModuleNotFound(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;

  return "code" in error && (error as { code?: unknown }).code === "ERR_MODULE_NOT_FOUND";
}

/**
 * The main plugin function. Split for easier testing.
 */
export async function runPlugin(context: Context) {
  const { logger, eventName } = context;

  if (isIssueCommentEvent(context)) {
    const codexAgent = await loadCodexAgent();
    return await codexAgent(context);
  }

  logger.error(`Unsupported event: ${eventName}`);
}

// Execute as a GitHub Actions plugin when run directly.
// This preserves the single entry point at dist/index.js.
// Lightweight Actions runner: reads workflow_dispatch inputs from GITHUB_EVENT_PATH
// and invokes runPlugin with decoded payload. No @actions/* or plugin-sdk needed.
async function mainFromActionsEnv() {
  try {
    const eventPath = process.env.GITHUB_EVENT_PATH;
    if (!eventPath || !fs.existsSync(eventPath)) return; // not running in Actions

    const raw = fs.readFileSync(eventPath, "utf8");
    const evt = JSON.parse(raw);
    const inputs = evt?.inputs || {};

    const eventName = inputs.eventName || evt?.event_name || "issue_comment.created";
    const payload = await decodeEventPayload(inputs.eventPayload);

    type LogReturn = { logMessage: { diff: string; type: string }; metadata: Record<string, unknown> };
    const logger: {
      info: (...args: unknown[]) => void;
      ok: (msg: unknown, meta?: Record<string, unknown>) => LogReturn;
      error: (msg: unknown, meta?: Record<string, unknown>) => LogReturn;
    } = {
      info: (...args: unknown[]) => console.log("[info]", ...args),
      ok: (msg: unknown, meta?: Record<string, unknown>) => ({
        logMessage: { diff: String(msg), type: "info" },
        metadata: { message: String(msg), ...(meta || {}) },
      }),
      error: (msg: unknown, meta?: Record<string, unknown>) => ({
        logMessage: { diff: String(msg), type: "fatal" },
        metadata: { message: String(msg), ...(meta || {}) },
      }),
    };

    const context: Record<string, unknown> = {
      eventName,
      payload,
      env: process.env,
      logger,
      commentHandler: { postComment: async () => null },
    };

    await runPlugin(context as Context);
  } catch (e) {
    console.error("[fatal] Actions runner error", e);
    process.exit(1);
  }
}

async function decodeEventPayload(maybe: unknown): Promise<unknown> {
  if (!maybe) return {};
  if (typeof maybe === "object") return maybe as Record<string, unknown>;
  if (typeof maybe === "string") {
    // Try brotli+base64 → JSON, else parse as JSON string
    try {
      const buf = Buffer.from(maybe, "base64");
      const decompressed = brotliDecompressSync(buf);
      return JSON.parse(decompressed.toString("utf8"));
    } catch {
      try {
        return JSON.parse(maybe as string);
      } catch {
        return { raw: maybe };
      }
    }
  }
  return {};
}

// Auto-run when executed directly in Actions
mainFromActionsEnv().catch((e) => {
  console.error(e);
  process.exit(1);
});
