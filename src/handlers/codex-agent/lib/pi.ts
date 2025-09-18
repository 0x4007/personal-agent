import { fetchWithTimeoutRetry } from "./http";
import { safeText } from "./utils";

export function buildRequestBody(args: {
  isMinimal: boolean;
  prompt: string;
  timeoutMs: number;
  shouldPost: boolean;
  mentionOverride: boolean | string | null | undefined;
  editCommentId: number | null;
  owner: string;
  repo: string;
  isPr: boolean;
  issueNumber: number;
}): unknown {
  const { isMinimal, prompt, timeoutMs, shouldPost, mentionOverride, editCommentId, owner, repo, isPr, issueNumber } = args;
  if (isMinimal) {
    return { prompt, timeout_ms: timeoutMs, post: shouldPost, mention: mentionOverride, edit_comment_id: editCommentId };
  }
  return {
    prompt,
    timeout_ms: timeoutMs,
    repo: `${owner}/${repo}`,
    ...(isPr ? { pr: issueNumber } : { issue: issueNumber }),
    post: shouldPost,
    mention: mentionOverride,
    edit_comment_id: editCommentId,
  };
}

export function logPiBodyIfEnabled(args: { logger: { info: (...a: unknown[]) => unknown }; body: unknown }): void {
  const { logger, body } = args;
  if (process.env.LOG_PI_BODY === "1") {
    logger.info("[codexAgent] Pi request body", { body });
  }
}

export async function invokePiCodex(args: {
  baseUrl: string;
  body: unknown;
  timeoutMs: number;
  agentOwner: string;
  logger: { info: (...a: unknown[]) => unknown };
}): Promise<{ ok: boolean; code: number; output?: string; error?: string; posted?: boolean; gh?: unknown; req_id?: string; run_id?: string }> {
  const { baseUrl, body, timeoutMs, agentOwner, logger } = args;
  const runId = process.env.GITHUB_RUN_ID || "";
  const runRepo = process.env.GITHUB_REPOSITORY || "";
  const runAttempt = process.env.GITHUB_RUN_ATTEMPT || "";
  const resp = await sendPiRequest({
    url: `${baseUrl}/api/codex`,
    body,
    timeoutMs,
    runId,
    runRepo,
    runAttempt,
    agentOwner,
  });
  if (!resp.ok) {
    const txt = await safeText(resp);
    throw new Error(`Pi /api/codex HTTP ${resp.status}: ${txt}`);
  }
  const data = (await resp.json()) as {
    ok: boolean;
    code: number;
    output?: string;
    error?: string;
    posted?: boolean;
    gh?: unknown;
    req_id?: string;
    run_id?: string;
  };
  if (data?.req_id) {
    logger.info("[codexAgent] Pi request id", { reqId: data.req_id, runId: data.run_id || runId });
  }
  if (!data.ok) throw new Error(`Pi /api/codex failed (code ${data.code}): ${data.error || "unknown error"}`);
  return data;
}

export async function sendPiRequest(args: {
  url: string;
  body: unknown;
  timeoutMs: number;
  runId: string;
  runRepo: string;
  runAttempt: string;
  agentOwner: string;
}): Promise<Response> {
  const { url, body, timeoutMs, runId, runRepo, runAttempt, agentOwner } = args;
  return await fetchWithTimeoutRetry(
    url,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-run-id": runId,
        "x-run-repo": runRepo,
        "x-run-attempt": runAttempt,
        "x-agent-owner": agentOwner,
      },
      body: JSON.stringify(body),
      // Give the HTTP call slightly more than Codex time to return the JSON
      timeout: Math.max(1000, Math.min(timeoutMs + 30_000, 1_800_000)),
    },
    1
  );
}
