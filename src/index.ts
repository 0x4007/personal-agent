import type { Context } from "./types";
import { isIssueCommentEvent } from "./types/typeguards";
import fs from "node:fs";
import { brotliDecompressSync } from "node:zlib";
import { customOctokit } from "@ubiquity-os/plugin-sdk/octokit";
import { requirePatToken } from "./handlers/codex-agent/lib/config";

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

function parseJsonInput<T>(value: unknown, fallback: T): T {
  if (value == null) return fallback;
  if (typeof value === "object") return value as T;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return fallback;
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

    const authToken = typeof inputs.authToken === "string" ? inputs.authToken : "";
    const ubiquityKernelToken = typeof inputs.ubiquityKernelToken === "string" ? inputs.ubiquityKernelToken : "";
    const config = parseJsonInput<Record<string, unknown>>(inputs.settings, {});
    const command = parseJsonInput<unknown>(inputs.command, null);

    // Optional verbose logging to inspect exactly what Kernel passed in
    if (process.env.DEBUG_EVENT_RAW === "1") {
      console.log("[debug] GITHUB_EVENT_PATH raw JSON:");
      console.log(raw);
    }
    if (process.env.DEBUG_EVENT === "1") {
      console.log("[debug] workflow_dispatch inputs:", JSON.stringify(inputs));
      try {
        console.log("[debug] decoded eventPayload:", JSON.stringify(payload));
      } catch {
        console.log("[debug] decoded eventPayload: <non-json>");
      }
    }

    type LogReturn = { logMessage: { diff: string; type: string }; metadata: Record<string, unknown> };
    const logger: {
      info: (...args: unknown[]) => void;
      ok: (msg: unknown, meta?: Record<string, unknown>) => LogReturn;
      error: (msg: unknown, meta?: Record<string, unknown>) => LogReturn;
      debug: (...args: unknown[]) => void;
      warn: (...args: unknown[]) => void;
    } = {
      info: (...args: unknown[]) => console.log("[info]", ...args),
      debug: (...args: unknown[]) => console.log("[debug]", ...args),
      warn: (...args: unknown[]) => console.warn("[warn]", ...args),
      ok: (msg: unknown, meta?: Record<string, unknown>) => {
        console.log("[ok]", msg, meta || "");
        return {
          logMessage: { diff: String(msg), type: "info" },
          metadata: { message: String(msg), ...(meta || {}) },
        };
      },
      error: (msg: unknown, meta?: Record<string, unknown>) => {
        console.error("[error]", msg, meta || "");
        return {
          logMessage: { diff: String(msg), type: "fatal" },
          metadata: { message: String(msg), ...(meta || {}) },
        };
      },
    };

    const { token: writeToken, source: tokenSource } = requirePatToken({ purpose: "GitHub API access" });
    const octokit = new customOctokit({ auth: writeToken });
    const context: Record<string, unknown> = {
      eventName,
      payload,
      env: process.env,
      logger,
      commentHandler: { postComment: async () => null },
      authToken: writeToken,
      ubiquityKernelToken,
      config,
      command,
      octokit,
    };

    logger.info("[auth] Using PAT for GitHub API", { tokenSource, kernelAuthProvided: Boolean(authToken) });

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
    // Try brotli+base64 -> JSON, else parse as JSON string
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
