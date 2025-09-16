import { Context } from "../types";
import fs from "node:fs";
import path from "node:path";

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
  // Prefer posting via GitHub from compute to avoid server auto-mention wrappers
  const postToGh = process.env.PI_POST ? process.env.PI_POST === "true" : false;
  const mentionOverride = process.env.PI_MENTION ?? ""; // empty string disables mention on server if supported

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
  const stripUrls = (process.env.PROMPT_STRIP_URLS ?? "1") === "1";
  const eventForPrompt = includeEventJson ? (stripUrls ? stripUrlFields(payload) : payload) : undefined;
  const eventJson = includeEventJson ? safeStringify(eventForPrompt) : "";
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
      const rawLen = includeEventJson ? safeStringify(payload).length : 0;
      const sanLen = includeEventJson ? eventJson.length : 0;
      logger.info("[codexAgent] Prompt (full)", { length: prompt.length, prompt, eventRawLen: rawLen, eventSanitizedLen: sanLen });
    }
    const body = minimal
      ? { prompt, timeout_ms: timeoutMs, post: postToGh }
      : {
          prompt,
          timeout_ms: timeoutMs,
          repo: `${owner}/${repo}`,
          ...(isPR ? { pr: issueNumber } : { issue: issueNumber }),
          post: postToGh,
          // best-effort: request server to avoid adding a leading mention
          mention: mentionOverride,
        };
    if (process.env.LOG_PI_BODY === "1") {
      logger.info("[codexAgent] Pi request body", { body });
    }

    if (process.env.WRITE_PROMPT_FILE === "1") {
      try {
        writeRuntimeLogs({ prompt, body, payload, sanitized: eventForPrompt });
      } catch (e) {
        // non-fatal: keep going even if file logging fails
      }
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

    if (!postToGh) {
      // We will post selectively to avoid self-invocation. Strip mentions and boilerplate.
      const clean = sanitizeOutput(String(data.output || ""), agentOwner);
      if (!clean.trim()) {
        logger.info("[codexAgent] Empty sanitized output; skipping comment");
        return;
      }
      await postGithubComment({
        owner,
        repo,
        issueNumber,
        body: clean,
        token: process.env.PLUGIN_GITHUB_TOKEN || process.env.GITHUB_TOKEN || "",
      }, logger);
      logger.ok("Posted cleaned Codex response via GitHub API", { length: clean.length });
    } else {
      logger.ok(`Pi handled Codex ${data.posted ? "and posted comment" : "without posting"}`);
    }
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

function sanitizeOutput(output: string, agentOwner: string): string {
  let text = output || "";
  // Remove any leading username mention to avoid triggering ourselves
  const mentionRe = new RegExp(`^@${escapeReg(agentOwner)}\\b.*\\n?`, "i");
  text = text.replace(mentionRe, "");

  // Drop common wrapper/header lines the server or CLI may prepend
  const lines = text.split(/\r?\n/);
  const filtered: string[] = [];
  for (const line of lines) {
    if (/OpenAI Codex v/i.test(line)) continue;
    if (/^-{2,}\s*workdir:/i.test(line)) continue;
    if (/^model:\s*/i.test(line)) continue;
    filtered.push(line);
  }
  text = filtered.join("\n").trim();

  // If conversation style markers exist, keep only the last assistant reply
  const assistantIdx = Math.max(text.lastIndexOf("assistant:"), text.lastIndexOf("Assistant:"));
  if (assistantIdx !== -1) {
    text = text.slice(assistantIdx + "assistant:".length).trim();
  }

  // Ensure we don't accidentally re-mention
  text = text.replace(new RegExp(`@${escapeReg(agentOwner)}\\b`, "ig"), agentOwner);

  return text.trim();
}

function escapeReg(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function postGithubComment(
  params: { owner: string; repo: string; issueNumber: number; body: string; token: string },
  logger: { info: (...args: unknown[]) => void }
): Promise<void> {
  const { owner, repo, issueNumber, body, token } = params;
  if (!token) throw new Error("Missing GitHub token to post comment");
  const url = `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/comments`;
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "authorization": `Bearer ${token}`,
      "accept": "application/vnd.github+json",
      "content-type": "application/json",
      "x-github-api-version": "2022-11-28",
    },
    body: JSON.stringify({ body }),
  });
  if (!resp.ok) {
    const txt = await safeText(resp);
    throw new Error(`GitHub comment HTTP ${resp.status}: ${txt}`);
  }
  logger.info("[codexAgent] GitHub comment posted");
}

function writeRuntimeLogs(params: { prompt: string; body: unknown; payload: unknown; sanitized?: unknown }) {
  const dir = path.resolve(process.cwd(), "runtime-logs");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const runId = process.env.GITHUB_RUN_ID || String(Date.now());

  const promptPath = path.join(dir, `prompt-${runId}.txt`);
  const bodyPath = path.join(dir, `pi-request-${runId}.json`);
  const payloadPath = path.join(dir, `event-${runId}.json`);
  const payloadSanitizedPath = path.join(dir, `event-sanitized-${runId}.json`);

  fs.writeFileSync(promptPath, params.prompt, "utf8");
  fs.writeFileSync(bodyPath, JSON.stringify(params.body, null, 2), "utf8");

  if (process.env.WRITE_EVENT_FILE === "1") {
    try {
      fs.writeFileSync(payloadPath, JSON.stringify(params.payload, null, 2), "utf8");
      if (params.sanitized !== undefined) {
        fs.writeFileSync(payloadSanitizedPath, JSON.stringify(params.sanitized, null, 2), "utf8");
      }
    } catch {
      // ignore
    }
  }
}

function stripUrlFields(value: unknown): unknown {
  const urlKey = /(^|_)url$/i; // matches 'url' and '*_url'
  if (Array.isArray(value)) {
    return value.map(stripUrlFields);
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (urlKey.test(k)) continue;
      out[k] = stripUrlFields(v);
    }
    return out;
  }
  return value;
}
