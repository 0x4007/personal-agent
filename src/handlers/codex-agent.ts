import { Context } from "../types";

/**
 * Calls the Raspberry Pi server to run Codex and posts the result back to GitHub.
 *
 * Env requirements (set in the workflow env):
 * - AGENT_OWNER: GitHub username to match @mention
 * - PI_URL: Base URL to the Pi server (e.g., https://pi.pavlovcik.com)
 * - ACCESS_MODE: "read-only" | "full" (set by the workflow)
 */
export async function codexAgent(context: Context): Promise<void> {
  const { logger, payload, env } = context;

  const sender = payload.comment.user?.login;
  const repo = payload.repository.name;
  const issueNumber = payload.issue.number;
  const isPR = Boolean((payload.issue as any)?.pull_request);
  const owner = payload.repository.owner.login;
  const body = String(payload.comment.body || "");
  const agentOwner = env.AGENT_OWNER;

  const isReadOnly = (process.env.ACCESS_MODE || "read-only") === "read-only";
  const accessLevel = isReadOnly ? "read-only" : "full";

  logger.info(`Executing codexAgent`, { sender, repo, issueNumber, owner, agentOwner, accessLevel });

  if (!body.trim().startsWith(`@${agentOwner}`)) {
    logger.info(`Comment does not start with @${agentOwner}`, { body });
    return;
  }

  const command = body.trim().substring(`@${agentOwner}`.length).trim();

  if (!command) {
    await context.commentHandler.postComment(context, logger.error("No command provided after username mention"));
    return;
  }

  const piBaseUrl = process.env.PI_URL || env.PI_URL || "http://pi.local:3000";
  const timeoutMs = Number(process.env.PI_TIMEOUT_MS || env.PI_TIMEOUT_MS || 30000);
  const postToGh = process.env.PI_POST ? process.env.PI_POST === "true" : true;

  // Build prompts
  const richPrompt = [
    `[mode:${accessLevel}] [type:${isPR ? "pr" : "issue"}]`,
    `repo:${owner}/${repo}`,
    `${isPR ? "pr" : "issue"}:${issueNumber}`,
    `actor:${sender}`,
    `\nUser request: ${command}`,
    `\nInstructions: Provide a helpful, concise answer. Consider repo code and ${isPR ? "PR diffs and discussion" : "issue discussion"}. Output plain text suitable for a GitHub comment.`,
  ].join(" ");
  const minimalPrompt = command;
  const minimal = process.env.PI_MINIMAL === "1";
  // Optionally append the entire raw GitHub event payload to the prompt for full context
  const includeEventJson = process.env.PROMPT_INCLUDE_EVENT === "1" || process.env.INCLUDE_GH_EVENT === "1";
  const eventJson = includeEventJson ? safeStringify(payload) : "";
  const basePrompt = minimal ? minimalPrompt : richPrompt;
  const prompt = includeEventJson
    ? `${basePrompt}\n\nFull GitHub event JSON (verbatim):\n\n\n${wrapJson(eventJson)}`
    : basePrompt;

  try {
    // Optional runtime logging of the incoming payload, full prompt and request body (gated by env)
    if (process.env.LOG_PAYLOAD === "1") {
      logger.info("[codexAgent] GH payload (raw)", { payload });
    }
    if (process.env.LOG_PROMPT === "1") {
      logger.info("[codexAgent] Prompt (full)", { length: prompt.length, prompt });
    }
    const body = minimal
      ? { prompt, timeout_ms: timeoutMs, post: postToGh }
      : {
          prompt,
          timeout_ms: timeoutMs,
          repo: `${owner}/${repo}`,
          ...(isPR ? { pr: issueNumber } : { issue: issueNumber }),
          post: postToGh,
        };
    if (process.env.LOG_PI_BODY === "1") {
      logger.info("[codexAgent] Pi request body", { body });
    }

    const resp = await fetch(`${piBaseUrl}/api/codex`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!resp.ok) {
      const txt = await safeText(resp);
      throw new Error(`Pi /api/codex HTTP ${resp.status}: ${txt}`);
    }
    const data = (await resp.json()) as { ok: boolean; code: number; output?: string; error?: string; posted?: boolean; gh?: any };
    if (!data.ok) throw new Error(`Pi /api/codex failed (code ${data.code}): ${data.error || "unknown error"}`);
    logger.ok(`Pi handled Codex ${data.posted ? "and posted comment" : "without posting"}`);
  } catch (error) {
    logger.error(`Pi Codex error: ${String(error)}`);
  }
}

async function safeText(resp: Response): Promise<string> {
  try {
    return await resp.text();
  } catch {
    return "";
  }
}

function safeStringify(obj: unknown): string {
  try {
    return JSON.stringify(obj);
  } catch (e) {
    return String(obj);
  }
}

function wrapJson(json: string): string {
  // Wrap in fenced block to preserve structure in LLM prompt
  return json ? "```json\n" + json + "\n```" : "";
}
