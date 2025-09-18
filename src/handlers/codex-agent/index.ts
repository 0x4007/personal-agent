import { Context } from "../../types";
import { parseMentionEnv } from "./lib/config";
import { buildRichPrompt, buildFullPrompt } from "./lib/prompt";
import { maybePrefetchContext, maybeCreatePlaceholderComment } from "./lib/github";
import { buildRequestBody, logPiBodyIfEnabled, invokePiCodex } from "./lib/pi";
import { logPayloadIfEnabled, maybeWriteRuntimeLogs } from "./lib/logs";

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
  const isPr = Boolean((payload.issue as { pull_request?: unknown } | undefined)?.pull_request);
  const owner = payload.repository.owner.login;
  const body = String(payload.comment.body || "");
  const agentOwner = env.AGENT_OWNER;

  const isSelf = Boolean(sender && agentOwner && String(sender).toLowerCase() === String(agentOwner).toLowerCase());
  const accessLevel = isSelf ? "full" : "read-only";

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

  const piBaseUrl = String(process.env.PI_URL || env.PI_URL || "https://pi.pavlovcik.com");
  const timeoutMs = Number(process.env.PI_TIMEOUT_MS || 30000);
  // Posting policy: only owner triggers posting on the Pi; non-owner is read-only
  const shouldPost = isSelf;
  const mentionOverride = parseMentionEnv(process.env.PI_MENTION);

  // Optionally prefetch GitHub context (issue/PR + comments) using the job token
  const fetchedContext = await maybePrefetchContext({ logger, isSelf, owner, repo, issueNumber, isPr });
  // No fast paths: always go through Codex (generalized system)

  // Build a universal GitHub reply prompt (single comment output, clean GFM formatting)
  const richPrompt = buildRichPrompt({
    accessLevel,
    isPr,
    owner,
    repo,
    issueNumber,
    sender,
    agentOwner,
    command,
  });
  const {
    prompt: fullPrompt,
    eventJson,
    contextJson,
    isMinimal,
  } = await buildFullPrompt({
    richPrompt,
    command,
    payload,
    fetchedContext,
    owner,
    repo,
    isSelf,
    logger,
  });
  let prompt = fullPrompt;

  // Prompt-size guard: if prompt exceeds PROMPT_MAX_LEN, fall back to minimal
  const promptMaxLenRaw = Number(process.env.PROMPT_MAX_LEN || 0);
  const promptMaxLen = Number.isFinite(promptMaxLenRaw) && promptMaxLenRaw > 0 ? Math.floor(promptMaxLenRaw) : 0;
  if (!isMinimal && promptMaxLen > 0 && prompt.length > promptMaxLen) {
    logger.info("[codexAgent] Prompt exceeds PROMPT_MAX_LEN, falling back to minimal", { len: prompt.length, max: promptMaxLen });
    // minimal prompt is just the user command
    prompt = command;
  }

  try {
    logPayloadIfEnabled({ logger, payload, eventJson, contextJson, prompt });
    const editCommentId = shouldPost ? await maybeCreatePlaceholderComment({ logger, isSelf, owner, repo, issueNumber }) : null;

    const body = buildRequestBody({ isMinimal, prompt, timeoutMs, shouldPost, mentionOverride, editCommentId, owner, repo, isPr, issueNumber });
    logPiBodyIfEnabled({ logger, body });
    await maybeWriteRuntimeLogs({ prompt, body, payload, logger });

    await invokePiCodex({
      baseUrl: piBaseUrl,
      body,
      timeoutMs,
      agentOwner: String(agentOwner || ""),
      logger,
    });
    logger.ok(shouldPost ? "Handoff complete; Pi will edit placeholder." : "Read-only invocation completed.");
  } catch (error) {
    logger.error(`Pi Codex error: ${String(error)}`);
  }
}
