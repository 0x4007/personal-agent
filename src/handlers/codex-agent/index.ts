import { Context } from "../../types";
import { parseMentionEnv } from "./lib/config";
import { buildRichPrompt, buildFullPrompt } from "./lib/prompt";
import { maybePrefetchContext, maybeCreatePlaceholderComment, maybeFetchStyleExamples } from "./lib/github";
import { buildRequestBody, logPiBodyIfEnabled, invokePiCodex } from "./lib/pi";
import { logPayloadIfEnabled, maybeWriteRuntimeLogs } from "./lib/logs";

/**
 * Calls the kernel/PI server to run Codex and posts the result back to GitHub.
 *
 * Env requirements (set in the workflow env):
 * - AGENT_OWNER: GitHub username to match @mention
 * - PI_URL or KERNEL_URL: Base URL to the server (e.g., https://kernel.pavlovcik.com)
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

  if (!agentOwner) {
    logger.error("Missing AGENT_OWNER env");
    return;
  }

  const isSelf = Boolean(sender && agentOwner && String(sender).toLowerCase() === String(agentOwner).toLowerCase());
  const accessLevel = isSelf ? "full" : "read-only";

  logger.info("Executing codexAgent", { sender, repo, issueNumber, owner, agentOwner, accessLevel });

  const trimmed = body.trim();
  const mention = `@${agentOwner}`;
  if (!trimmed.toLowerCase().startsWith(mention.toLowerCase())) {
    logger.info(`Comment does not start with @${agentOwner}`, { body });
    return;
  }

  const command = trimmed
    .slice(mention.length)
    .replace(/^[:,]?\s+/, "")
    .trim();

  if (!command) {
    await context.commentHandler.postComment(context, logger.error("No command provided after username mention"));
    return;
  }

  const kernelBaseUrl = String(process.env.KERNEL_URL || process.env.PI_URL || env.PI_URL || "https://kernel.pavlovcik.com").replace(/\/+$/, "");
  const timeoutRaw = Number(process.env.PI_TIMEOUT_MS || 900000);
  const timeoutMs = Number.isFinite(timeoutRaw) && timeoutRaw > 0 ? Math.floor(timeoutRaw) : 900000;
  // Posting policy: only owner triggers posting on the server; non-owner is read-only
  const shouldPost = isSelf;
  const mentionOverride = parseMentionEnv(process.env.PI_MENTION);

  const isMinimalEnv = process.env.PI_MINIMAL === "1";
  // Optionally prefetch GitHub context (issue/PR + comments) using the PAT
  const fetchedContext = await maybePrefetchContext({ logger, isSelf, owner, repo, issueNumber, isPr });
  // No fast paths: always go through Codex (generalized system)

  // Build a universal GitHub reply prompt (single comment output, clean GFM formatting)
  const styleExamples = isMinimalEnv ? [] : await maybeFetchStyleExamples({ login: agentOwner, owner, repo, logger });
  const richPrompt = buildRichPrompt({
    accessLevel,
    isPr,
    owner,
    repo,
    issueNumber,
    sender,
    agentOwner,
    command,
    styleExamples,
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
      baseUrl: kernelBaseUrl,
      body,
      timeoutMs,
      agentOwner: String(agentOwner || ""),
      logger,
    });
    logger.ok(shouldPost ? "Handoff complete; kernel will edit placeholder." : "Read-only invocation completed.");
  } catch (error) {
    logger.error(`Kernel codex error: ${String(error)}`);
  }
}
