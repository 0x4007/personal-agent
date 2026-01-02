import { callLlm } from "@ubiquity-os/plugin-sdk";
import { Context } from "../../types";
import { getEnvString } from "./lib/config";
import { maybeFetchIssueContext, maybeFetchStyleExamples, resolveReadToken, resolveWriteToken, createGithubComment } from "./lib/github";
import { logPromptIfEnabled, maybeWriteRuntimeLogs } from "./lib/logs";
import { appendReplyMarker, sanitizeReply } from "./lib/output";
import { buildPromptMessages } from "./lib/prompt";

function extractCommand(body: string, agentOwner: string): string | null {
  const trimmed = body.trim();
  if (!trimmed) return null;
  const mention = `@${agentOwner}`.toLowerCase();
  if (!trimmed.toLowerCase().startsWith(mention)) return null;
  return trimmed
    .slice(mention.length)
    .replace(/^[:,]?\s+/, "")
    .trim();
}

function extractLlmContent(result: unknown): string {
  const res = result as { choices?: Array<{ message?: { content?: string } }> };
  const content = res?.choices?.[0]?.message?.content;
  return typeof content === "string" ? content : "";
}

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

  const command = extractCommand(body, agentOwner);
  if (command === null) {
    logger.info(`Comment does not start with @${agentOwner}`, { body });
    return;
  }

  const authToken = String((context as unknown as { authToken?: string }).authToken ?? "").trim();
  if (!authToken) {
    logger.error("Missing authToken from kernel inputs; cannot call LLM");
    return;
  }

  const readToken = resolveReadToken(authToken);
  const writeToken = resolveWriteToken(authToken);

  const issueContext = await maybeFetchIssueContext({ owner, repo, issueNumber, isPr, token: readToken, logger });
  const styleExamples = await maybeFetchStyleExamples({ login: agentOwner, token: writeToken, logger });

  const safeCommand = command || "No explicit request provided. Ask a single clarifying question.";
  const messages = buildPromptMessages({
    agentOwner,
    sender,
    owner,
    repo,
    issueNumber,
    isPr,
    command: safeCommand,
    issueContext,
    styleExamples,
  });

  const model = getEnvString("UOS_AI_MODEL", "");
  const request = {
    ...(model ? { model } : {}),
    messages,
  };

  try {
    const promptText = messages.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join("\n\n");
    logPromptIfEnabled({ logger, prompt: promptText, payload });
    await maybeWriteRuntimeLogs({ prompt: promptText, request, payload, logger });

    const result = await callLlm(request, context);
    const raw = extractLlmContent(result);
    const cleaned = sanitizeReply(raw, agentOwner);
    if (!cleaned) {
      logger.error("LLM returned empty response");
      return;
    }
    const finalBody = appendReplyMarker(cleaned);

    if (!writeToken) {
      logger.error("Missing PAT for posting reply; set USER_PAT or PAT_FULL");
      return;
    }

    await createGithubComment({ owner, repo, issueNumber, body: finalBody, token: writeToken }, logger);
    logger.ok("Successfully created comment!");
  } catch (error) {
    logger.error(`LLM failure: ${String(error)}`);
  }
}
