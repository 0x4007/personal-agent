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
export async function codexAgent(context: Context): Promise<void> {
  const { logger, payload, env } = context;
  const owner = payload.repository.owner.login;
  if (!isWhitelisted(owner)) {
    logger.info(`Request from non-whitelisted org: ${owner}`);
    return;
  }

  const agentOwner = env.AGENT_OWNER;
  if (!agentOwner) {
    logger.error("Missing AGENT_OWNER env");
    return;
  }

  const sender = payload.comment.user?.login;
  const accessLevel = sender && String(sender).toLowerCase() === String(agentOwner).toLowerCase() ? "full" : "disabled";
  if (accessLevel === "disabled") {
    logger.info("Skipping execution: agent is in disabled mode for non-owners.", { sender, agentOwner });
    return;
  }

  const command = getAgentCommand(payload.comment.body || "", agentOwner);
  if (command === null) {
    logger.info(`Comment does not start with @${agentOwner}`);
    return;
  }
  if (!command) {
    const errorBody = "No command provided after username mention";
    logger.error(errorBody);
    await context.commentHandler.postComment(context, errorBody as unknown as Error);
    return;
  }

  const task = await buildAgentTask(context, command, accessLevel, agentOwner);
  const { conversationContext, conversationKey, agentMemory } = await gatherAgentContext(context, command);

  await executeAgentWorkflow(context, task, { conversationContext, conversationKey, agentMemory });
}

function isWhitelisted(owner: string): boolean {
  const whitelistedOrgs = ["placeholder-org"];
  return whitelistedOrgs.includes(owner.toLowerCase());
}

function getAgentCommand(body: string, agentOwner: string): string | null {
  const trimmed = body.trim();
  const mention = `@${agentOwner}`;
  if (!trimmed.toLowerCase().startsWith(mention.toLowerCase())) return null;
  return trimmed
    .slice(mention.length)
    .replace(/^[:,]?\s+/, "")
    .trim();
}

async function buildAgentTask(context: Context, command: string, accessLevel: string, agentOwner: string): Promise<string> {
  const { payload, env, logger } = context;
  const repo = payload.repository.name;
  const issueNumber = payload.issue.number;
  const owner = payload.repository.owner.login;
  const isPr = Boolean((payload.issue as { pull_request?: unknown } | undefined)?.pull_request);
  const sender = payload.comment.user?.login;

  const isMinimalEnv = env.PROMPT_MINIMAL === "1" || env.UOS_PROMPT_MINIMAL === "1" || env.PI_MINIMAL === "1";
  if (isMinimalEnv) return command;

  const styleExamples = await maybeFetchStyleExamples({ login: agentOwner, owner, repo, logger });
  const task = buildRichPrompt({
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

  const promptMaxLenRaw = Number(env.PROMPT_MAX_LEN || 0);
  const promptMaxLen = Number.isFinite(promptMaxLenRaw) && promptMaxLenRaw > 0 ? Math.floor(promptMaxLenRaw) : 0;
  if (promptMaxLen > 0 && task.length > promptMaxLen) {
    logger.info("[codexAgent] Task exceeds PROMPT_MAX_LEN, falling back to minimal", { len: task.length, max: promptMaxLen });
    return command;
  }
  return task;
}

async function gatherAgentContext(context: Context, command: string) {
  const { logger, payload } = context;
  const owner = payload.repository.owner.login;
  const repo = payload.repository.name;
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
    logger.info("[codexAgent] Conversation context build failed (non-fatal)", { error: error instanceof Error ? error : new Error(String(error)) });
  }
  return { conversationContext, conversationKey, agentMemory };
}

async function executeAgentWorkflow(context: Context, task: string, overrides: { conversationContext: string; conversationKey: string; agentMemory: string }) {
  const { env, logger, payload } = context;
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
        ...(overrides.agentMemory ? { agentMemory: overrides.agentMemory } : {}),
        ...(overrides.conversationContext ? { conversationContext: overrides.conversationContext } : {}),
        ...(overrides.conversationKey ? { conversationKey: overrides.conversationKey } : {}),
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
