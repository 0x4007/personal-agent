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

  // Build a compact prompt that includes just enough context for the Pi to augment via gh.
  const prompt = [
    `[mode:${accessLevel}] [type:${isPR ? "pr" : "issue"}]`,
    `repo:${owner}/${repo}`,
    `${isPR ? "pr" : "issue"}:${issueNumber}`,
    `actor:${sender}`,
    `\nUser request: ${command}`,
    `\nInstructions: Provide a helpful, concise answer. Consider repo code and ${isPR ? "PR diffs and discussion" : "issue discussion"}. Output plain text suitable for a GitHub comment.`,
  ].join(" ");

  try {
    const resp = await fetch(`${piBaseUrl}/api/codex`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        prompt,
        timeout_ms: 30000,
        repo: `${owner}/${repo}`,
        ...(isPR ? { pr: issueNumber } : { issue: issueNumber }),
        post: true,
      }),
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
