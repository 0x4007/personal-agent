import { Context } from "../../types";
import { buildRichPrompt } from "./lib/prompt";
import { maybeFetchStyleExamples } from "./lib/github";
import { getAgentMemorySnippet } from "./lib/agent-memory";
import { buildConversationContext } from "./lib/conversation-context";
import { resolveConversationKeyForContext } from "./lib/conversation-graph";
import { dispatchAgentWorkflow } from "./lib/agent-dispatch";
import { logPayloadIfEnabled, maybeWriteRuntimeLogs } from "./lib/logs";

function formatDispatchError(error: unknown): { message: string; status?: number; url?: string; name?: string; documentationUrl?: string } {
  if (!error || typeof error !== "object") {
    return { message: String(error) };
  }
  const err = error as {
    message?: unknown;
    status?: unknown;
    name?: unknown;
    request?: { url?: unknown };
    documentation_url?: unknown;
  };
  return {
    message: typeof err.message === "string" ? err.message : String(error),
    status: typeof err.status === "number" ? err.status : undefined,
    name: typeof err.name === "string" ? err.name : undefined,
    url: typeof err.request?.url === "string" ? err.request.url : undefined,
    documentationUrl: typeof err.documentation_url === "string" ? err.documentation_url : undefined,
  };
}

/**
 * Dispatches the kernel agent workflow with a prompt customized to the owner.
 *
 * Env requirements (set in the workflow env):
 * - AGENT_OWNER: GitHub username to match @mention
 * - UOS_AGENT_OWNER/UOS_AGENT_REPO/UOS_AGENT_WORKFLOW: target agent workflow to dispatch
 */
// eslint-disable-next-line sonarjs/cognitive-complexity
export async function codexAgent(context: Context): Promise<void> {
  const { logger, payload, env } = context;

  const sender = payload.comment.user?.login;
  const repo = payload.repository.name;
  const issueNumber = payload.issue.number;
  const isPr = Boolean((payload.issue as { pull_request?: unknown } | undefined)?.pull_request);
  const owner = payload.repository.owner.login;
  const whitelistedOrgs = ["placeholder-org"];
  const lowerOwner = owner.toLowerCase();
  if (!whitelistedOrgs.includes(lowerOwner)) {
    logger.info(`Request from non-whitelisted org: ${owner}`);
    return;
  }
  const body = String(payload.comment.body || "");
  const agentOwner = env.AGENT_OWNER;

  if (!agentOwner) {
    logger.error("Missing AGENT_OWNER env");
    return;
  }

  const isSelf = Boolean(sender && agentOwner && String(sender).toLowerCase() === String(agentOwner).toLowerCase());
  const accessLevel = isSelf ? "full" : "disabled";

  if (accessLevel === "disabled") {
    logger.info("Skipping execution: agent is in disabled mode for non-owners.", { sender, repo, issueNumber, owner, agentOwner, accessLevel });
    return;
  }

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
    const errorBody = "No command provided after username mention";
    logger.error(errorBody);
    await context.commentHandler.postComment(context, errorBody as unknown as Error);
    return;
  }

  const isMinimalEnv = env.PROMPT_MINIMAL === "1" || env.UOS_PROMPT_MINIMAL === "1" || env.PI_MINIMAL === "1";

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
  const promptMaxLenRaw = Number(env.PROMPT_MAX_LEN || 0);
  const promptMaxLen = Number.isFinite(promptMaxLenRaw) && promptMaxLenRaw > 0 ? Math.floor(promptMaxLenRaw) : 0;
  if (!isMinimal && promptMaxLen > 0 && task.length > promptMaxLen) {
    logger.info("[codexAgent] Task exceeds PROMPT_MAX_LEN, falling back to minimal", { len: task.length, max: promptMaxLen });
    // minimal prompt is just the user command
    task = command;
  }

  let conversationContext = "";
  let conversationKey = "";
  let agentMemory = "";
  try {
    const conversation = await resolveConversationKeyForContext(
      context,
      logger as unknown as { info: (log: string, metadata?: Record<string, unknown>) => unknown }
    );
    if (conversation) {
      conversationKey = conversation.key;
      conversationContext = await buildConversationContext({
        context,
        conversation,
        maxItems: 8,
        maxChars: 3200,
        query: command,
        shouldUseSelector: false,
      });
    }
    agentMemory = await getAgentMemorySnippet({
      owner,
      repo,
      scopeKey: conversationKey || undefined,
      logger: logger as unknown as { info: (log: string, metadata?: Record<string, unknown>) => unknown },
    });
  } catch (error) {
    logger.info("[codexAgent] Conversation context build failed (non-fatal)", { error: String(error) });
  }

  try {
    const shouldDispatch = String(env.UOS_AGENT_DISPATCH ?? "1").trim() !== "0";
    if (!shouldDispatch) {
      logPayloadIfEnabled({ logger: logger as unknown as { info: (log: string, metadata?: Record<string, unknown>) => unknown }, payload, task, inputs: {} });
      logger.info("[agent] Dispatch disabled via UOS_AGENT_DISPATCH=0.");
      return;
    }
    const { inputs } = await dispatchAgentWorkflow({
      context,
      task,
      logger: logger as unknown as { info: (log: string, metadata?: Record<string, unknown>) => unknown },
      settingsOverrides: {
        ...(agentMemory ? { agentMemory } : {}),
        ...(conversationContext ? { conversationContext } : {}),
        ...(conversationKey ? { conversationKey } : {}),
      },
    });
    logPayloadIfEnabled({ logger: logger as unknown as { info: (log: string, metadata?: Record<string, unknown>) => unknown }, payload, task, inputs });
    await maybeWriteRuntimeLogs({ task, inputs, payload, logger: logger as unknown as { info: (log: string, metadata?: Record<string, unknown>) => unknown } });
    logger.ok("Agent workflow dispatch complete.");
  } catch (error) {
    const details = formatDispatchError(error);
    logger.error(details.message, details);
    throw error;
  }
}
