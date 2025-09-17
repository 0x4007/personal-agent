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

  const isSelf = sender && agentOwner && String(sender).toLowerCase() === String(agentOwner).toLowerCase();
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

  const piBaseUrl = process.env.PI_URL || env.PI_URL || "http://pi.local:3000";
  const timeoutMs = Number(process.env.PI_TIMEOUT_MS || env.PI_TIMEOUT_MS || 30000);
  // Posting policy: only post when invoked by the owner; otherwise act read-only
  const shouldPost = isSelf;
  const postToGh = false; // we never ask the Pi server to post; compute may post if shouldPost
  const mentionOverride = parseMentionEnv(process.env.PI_MENTION);

  // Optionally prefetch GitHub context (issue/PR + comments) using the job token
  const enablePrefetch = (process.env.PROMPT_FETCH_ISSUE ?? "1") === "1";
  let fetchedContext: unknown = null;
  if (enablePrefetch) {
    try {
      const token = selectPatToken({ isSelf });
      fetchedContext = await fetchIssueContext({ owner, repo, issueNumber, isPR, token });
    } catch (e) {
      logger.info("[codexAgent] Prefetch failed (non-fatal)", { error: String(e) });
    }
  }

  // Build a universal GitHub reply prompt (single comment output, clean GFM formatting)
  const richPrompt = `
  [mode:${accessLevel}] [type:${isPR ? "pr" : "issue"}] repo:${owner}/${repo} ${isPR ? "pr" : "issue"}:${issueNumber} actor:${sender}
  Environment: Linux shell with GitHub CLI (gh) available and authenticated as @${agentOwner}.
  You are a GitHub assistant. You always return a single GitHub comment (no preamble, no wrappers).

  User request:
  ${command}

  Output Contract:
  - Output only the final comment text to post on GitHub.
  - Do NOT include system messages, logs, markers (e.g., GH_*_OK), transcripts, or thinking.
  - Do NOT @mention any user or team (avoid loops). If you must reference a handle, render as plain text or code.

  Style & Formatting (GitHub‑flavored Markdown):
  - Use short headings to structure longer replies only when helpful.
  - Prefer bullet lists for enumerations; use one bullet per item.
    - Never compress many items into one bullet via hyphens/commas; use multiple bullets instead.
    - For 12+ similar items, a compact table is allowed if it improves scanability.
  - Use checklists for actionable tasks (e.g., "- [ ] Step").
  - Use code fences for commands, code, diffs, or JSON (\`\`\`bash, \`\`\`ts, \`\`\`json, \`\`\`diff).
  - Link concisely with Markdown links or short refs (owner/repo#123). Avoid dumping long raw URLs.
  - Keep paragraphs short (1–3 sentences). Prefer lists/tables for dense info. Do not paste huge raw JSON.

  Content Rules:
  - If you read GitHub data (via gh or API), summarize results; do not echo command lines or transcripts.
  - If context is insufficient, state the single additional input you need in one line, then continue with what can be done now.
  - When listing labels (or similar), prefer bullets like:
    - \`bug\` — user‑visible defect
    - \`enhancement\` — new capability
    - \`priority:high\` — respond within 24h
  - When asked for a plan, produce a short, numbered list (5–8 items max), each one line.
  - When asked for acceptance criteria, use bullets with clear, testable statements (concise Given/When/Then is fine).

  Safety & Etiquette:
  - No secrets or tokens.
  - Do not self‑trigger loops (no mentions in output).

  Produce only the final GitHub comment now.`.replace(/\n\s+/g, "\n");
  const minimalPrompt = command;
  const minimal = process.env.PI_MINIMAL === "1";
  // Optionally append the entire raw GitHub event payload to the prompt for full context
  const includeEventJson = process.env.PROMPT_INCLUDE_EVENT === "1" || process.env.INCLUDE_GH_EVENT === "1";
  const stripUrls = (process.env.PROMPT_STRIP_URLS ?? "1") === "1";
  const eventForPrompt = includeEventJson ? (stripUrls ? stripUrlFields(payload) : payload) : undefined;
  const eventJson = includeEventJson ? safeStringify(eventForPrompt) : "";
  const contextJson = fetchedContext ? safeStringify(stripUrlFields(fetchedContext)) : "";
  const basePrompt = minimal ? minimalPrompt : richPrompt;
  let prompt = basePrompt;
  if (contextJson) {
    prompt += `\n\nGitHub context (prefetched):\n\n${wrapJson(contextJson)}`;
  }
  if (includeEventJson) {
    prompt += `\n\nFull GitHub event JSON (verbatim):\n\n${wrapJson(eventJson)}`;
  }

  try {
    // Optional runtime logging of the incoming payload, full prompt and request body (gated by env)
    if (process.env.LOG_PAYLOAD === "1") {
      logger.info("[codexAgent] GH payload (raw)", { payload });
    }
    if (process.env.LOG_PROMPT === "1") {
      const rawLen = includeEventJson ? safeStringify(payload).length : 0;
      const sanLen = includeEventJson ? eventJson.length : 0;
      const ctxLen = contextJson.length;
      logger.info("[codexAgent] Prompt (full)", { length: prompt.length, prompt, eventRawLen: rawLen, eventSanitizedLen: sanLen, contextLen: ctxLen });
    }
    const body = minimal
      ? { prompt, timeout_ms: timeoutMs, post: false, mention: mentionOverride }
      : {
          prompt,
          timeout_ms: timeoutMs,
          repo: `${owner}/${repo}`,
          ...(isPR ? { pr: issueNumber } : { issue: issueNumber }),
          post: false,
          // Explicitly request no mention unless overridden via PI_MENTION
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

    if (shouldPost) {
      // We will post selectively to avoid self-invocation. Strip mentions and boilerplate.
      const clean = sanitizeOutput(String(data.output || ""), agentOwner);
      if (!clean.trim()) {
        logger.info("[codexAgent] Empty sanitized output; skipping comment");
        return;
      }
      const token = selectPatToken({ isSelf });
      await postGithubComment({
        owner,
        repo,
        issueNumber,
        body: clean,
        token,
      }, logger);
      logger.ok("Posted cleaned Codex response via GitHub API", { length: clean.length });
    } else {
      logger.ok("Read-only mode: not posting comment.");
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

  // 1) Remove any @owner mentions anywhere to avoid re-trigger
  const mentionAny = new RegExp(`(^|\\n)@${escapeReg(agentOwner)}\\b[^\\n]*\\n`, "ig");
  text = text.replace(mentionAny, "\n");

  // 2) Drop noisy lines from Codex transcript/logs/thinking
  const dropPatterns: RegExp[] = [
    /^[-]{2,}\s*$/, // separators like -------
    /^OpenAI Codex v/i,
    /^workdir:/i,
    /^model:/i,
    /^provider:/i,
    /^approval:/i,
    /^sandbox:/i,
    /^reasoning( summaries)?:/i,
    /^tokens used:/i,
    /^Instructions:/i,
    /^User instructions:/i,
    /^User request:/i,
    /^Planned (fetch|GitHub fetch)/i,
    /^Fetch I.?d run:/i,
    /^Command I.?d run:/i,
    /^You can also run:/i,
    /gh\s+issue\s+view\s+\d+/i,
    /^exec\b/i,
    /^bash -lc/i,
    /^codex$/i,
    /^thinking$/i,
    /^\[[0-9]{4}-[0-9]{2}-[0-9]{2}T[^\]]+\]/, // timestamped brackets
  ];
  const lines = text.split(/\r?\n/);
  const kept: string[] = [];
  for (const line of lines) {
    const trimmed = line.trimEnd();
    if (dropPatterns.some((re) => re.test(trimmed))) continue;
    kept.push(trimmed);
  }
  text = kept.join("\n");

  // Remove explicit test markers like GH_OK, GH_LABELS_OK, etc.
  text = text.replace(/\bGH(?:_[A-Z]+)?_OK\b/g, "");

  // 3) Collapse multiple blank lines
  text = text.replace(/\n{3,}/g, "\n\n").trim();

  // 3.5) If the content looks like a big CSV (few newlines, many commas), present as bullets
  const commaCount = (text.match(/,/g) || []).length;
  const newlineCount = (text.match(/\n/g) || []).length;
  const hasBullets = /^\s*[-*]\s+/m.test(text) || /\|/.test(text);
  if (!hasBullets && newlineCount <= 2 && commaCount >= 8) {
    const items = text
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const seen = new Set<string>();
    const bullets = items.filter((s) => {
      const k = s.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    if (bullets.length > 0) {
      text = bullets.map((s) => `- ${s}`).join("\n");
    }
  }

  // 4) If there are conversation markers, keep only the last assistant-like section
  const markers = ["assistant:", "Assistant:"];
  let cut = -1;
  for (const m of markers) {
    const idx = text.lastIndexOf(m);
    cut = Math.max(cut, idx);
  }
  if (cut !== -1) {
    text = text.slice(cut + "assistant:".length).trim();
  }

  // 5) Limit to the last 2 sentences ONLY for paragraph-style text.
  //    If it looks like a list/table, keep as-is for readability.
  const looksLikeList = /^\s*[-*]\s+/m.test(text) || /\|/.test(text);
  if (!looksLikeList) {
    const sentences = text
      .replace(/\n+/g, " ")
      .split(/(?<=[.!?])\s+/)
      .filter(Boolean);
    if (sentences.length > 0) {
      const lastTwo = sentences.slice(-2).join(" ").trim();
      text = lastTwo;
    }
  }

  // 6) Ensure we don't accidentally re-mention owner in the remainder
  text = text.replace(new RegExp(`@${escapeReg(agentOwner)}\\b`, "ig"), agentOwner).trim();

  // Hard cap to 600 chars
  if (text.length > 600) text = text.slice(-600).trimStart();
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

function parseMentionEnv(val: string | undefined): boolean | string {
  if (val === undefined || val === "") return false;
  const s = String(val).toLowerCase().trim();
  if (s === "false" || s === "0" || s === "no" || s === "off") return false;
  if (s === "true" || s === "1" || s === "yes" || s === "on") return true;
  // any other non-empty string -> pass through (server may treat as custom mention)
  return val;
}

function selectPatToken(opts: { isSelf: boolean }): string {
  const { isSelf } = opts;
  // Prefer explicit PAT secrets; fall back to PLUGIN_GITHUB_TOKEN as last resort
  if (isSelf) {
    return (
      process.env.USER_PAT_FULL ||
      process.env.PAT_FULL ||
      process.env.USER_PAT ||
      process.env.PLUGIN_GITHUB_TOKEN ||
      process.env.GITHUB_TOKEN ||
      ""
    );
  }
  return (
    process.env.USER_PAT_READ ||
    process.env.PAT_READ ||
    process.env.USER_PAT ||
    process.env.PLUGIN_GITHUB_TOKEN ||
    process.env.GITHUB_TOKEN ||
    ""
  );
}

async function fetchIssueContext(params: { owner: string; repo: string; issueNumber: number; isPR: boolean; token: string }): Promise<unknown> {
  const { owner, repo, issueNumber, isPR, token } = params;
  if (!token) throw new Error("Missing token for GitHub context fetch");
  const base = `https://api.github.com/repos/${owner}/${repo}`;
  const headers = {
    "authorization": `Bearer ${token}`,
    "accept": "application/vnd.github+json",
    "x-github-api-version": "2022-11-28",
  } as Record<string, string>;

  async function getJson(url: string): Promise<any> {
    const r = await fetch(url, { headers });
    if (!r.ok) throw new Error(`${url} -> HTTP ${r.status}`);
    return r.json();
  }

  const issue = await getJson(`${base}/issues/${issueNumber}`);
  // comments can be many; fetch first page only to keep prompt small
  const comments = await getJson(`${base}/issues/${issueNumber}/comments?per_page=50`);
  let pr: any = null;
  if (isPR) {
    try { pr = await getJson(`${base}/pulls/${issueNumber}`); } catch { /* ignore */ }
  }

  // Keep only concise fields
  const slimIssue = {
    number: issue.number,
    title: issue.title,
    state: issue.state,
    author: issue.user?.login,
    labels: Array.isArray(issue.labels) ? issue.labels.map((l: any) => (typeof l === "string" ? l : l?.name)).filter(Boolean) : [],
    body: issue.body,
    created_at: issue.created_at,
    updated_at: issue.updated_at,
    url: issue.url,
  };
  const slimComments = Array.isArray(comments)
    ? comments.map((c: any) => ({ author: c.user?.login, created_at: c.created_at, body: c.body, url: c.url }))
    : [];
  const slimPr = pr
    ? { merged: !!pr.merged_at, draft: !!pr.draft, head: pr.head?.ref, base: pr.base?.ref, additions: pr.additions, deletions: pr.deletions, changed_files: pr.changed_files, url: pr.url }
    : null;

  return { issue: slimIssue, comments: slimComments, pr: slimPr };
}

function stripUrlFields(value: unknown): unknown {
  // Remove only keys that end with "_url" (e.g., html_url, forks_url),
  // but keep keys named exactly "url".
  const redundantUrlKey = /_url$/i;
  if (Array.isArray(value)) {
    return value.map(stripUrlFields);
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (redundantUrlKey.test(k)) continue; // strip *_url
      out[k] = stripUrlFields(v);
    }
    return out;
  }
  return value;
}
