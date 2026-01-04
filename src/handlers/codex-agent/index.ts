import { Context } from "../../types";
import { buildRichPrompt } from "./lib/prompt";
import { maybeFetchStyleExamples } from "./lib/github";
import { dispatchAgentWorkflow } from "./lib/agent-dispatch";
import { logPayloadIfEnabled, maybeWriteRuntimeLogs } from "./lib/logs";

/**
 * Dispatches the kernel agent workflow with a prompt customized to the owner.
 *
 * Env requirements (set in the workflow env):
 * - AGENT_OWNER: GitHub username to match @mention
 * - UOS_AGENT_OWNER/UOS_AGENT_REPO/UOS_AGENT_WORKFLOW: target agent workflow to dispatch
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

  const isMinimalEnv = process.env.PROMPT_MINIMAL === "1" || process.env.UOS_PROMPT_MINIMAL === "1" || process.env.PI_MINIMAL === "1";

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
  const isMinimal = isMinimalEnv;
  let task = isMinimal ? command : richPrompt;

  // Prompt-size guard: if task exceeds PROMPT_MAX_LEN, fall back to minimal
  const promptMaxLenRaw = Number(process.env.PROMPT_MAX_LEN || 0);
  const promptMaxLen = Number.isFinite(promptMaxLenRaw) && promptMaxLenRaw > 0 ? Math.floor(promptMaxLenRaw) : 0;
  if (!isMinimal && promptMaxLen > 0 && task.length > promptMaxLen) {
    logger.info("[codexAgent] Task exceeds PROMPT_MAX_LEN, falling back to minimal", { len: task.length, max: promptMaxLen });
    // minimal prompt is just the user command
    task = command;
  }

  try {
    const shouldDispatch = String(process.env.UOS_AGENT_DISPATCH ?? env.UOS_AGENT_DISPATCH ?? "1").trim() !== "0";
    if (!shouldDispatch) {
      logPayloadIfEnabled({ logger, payload, task, inputs: {} });
      logger.info("[agent] Dispatch disabled via UOS_AGENT_DISPATCH=0.");
      return;
    }
    const { inputs } = await dispatchAgentWorkflow({ context, task, logger });
    logPayloadIfEnabled({ logger, payload, task, inputs });
    await maybeWriteRuntimeLogs({ task, inputs, payload, logger });
    logger.ok("Agent workflow dispatch complete.");
  } catch (error) {
    logger.error(`Agent dispatch error: ${String(error)}`);
  }
}
