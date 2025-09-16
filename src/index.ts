import type { Context } from "./types";
import { isIssueCommentEvent } from "./types/typeguards";

type CodexAgent = typeof import("./handlers/codex-agent") extends { codexAgent: infer Fn }
  ? Fn
  : never;

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
