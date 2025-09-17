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
  // No fast paths: always go through Codex (generalized system)

  // Build a universal GitHub reply prompt (single comment output, clean GFM formatting)
  const richPrompt = `
  [mode:${accessLevel}] [type:${isPR ? "pr" : "issue"}] repo:${owner}/${repo} ${isPR ? "pr" : "issue"}:${issueNumber} actor:${sender}
  Environment: Linux shell with GitHub CLI (gh) available and authenticated as @${agentOwner}.
  You are a GitHub assistant. You always return a single GitHub comment (no preamble, no wrappers).

  User request:
  ${command}

  Output Contract:
  - Output only the final comment text to post on GitHub.
  - Do NOT include role labels (assistant:, system:, user:), system messages, logs, markers (e.g., GH_*_OK), transcripts, or thinking.
  - Do NOT @mention any user or team (avoid loops). If you must reference a handle, render as plain text or code.

  Style & Formatting (GitHub‑flavored Markdown):
  - Use short headings to structure longer replies only when helpful.
  - Prefer bullet lists for enumerations; use one bullet per item.
    - Never compress many items into one bullet via hyphens/commas; use multiple bullets instead.
    - For 12+ similar items, a compact table is allowed if it improves scanability.
  - Use checklists for actionable tasks (e.g., "- [ ] Step").
  - Use code fences for commands, code, diffs, or JSON (\`\`\`bash, \`\`\`ts, \`\`\`json, \`\`\`diff).
  - Do NOT wrap the entire response in a code block; only fence code/diff/json snippets.
  - Link concisely with Markdown links or short refs (owner/repo#123). Avoid dumping long raw URLs.
  - Keep paragraphs short (1–3 sentences). Prefer lists/tables for dense info. Do not paste huge raw JSON.
  - Keep it concise: target ~800 characters unless a longer list is explicitly requested.

  Content Rules:
  - Always prefer live reads over inference: if the answer depends on repository data (labels, files, commits, diffs, milestones, prices, etc.), use gh or the GitHub API to read it first; do not guess or invent values.
  - Summarize results; do not echo command lines or transcripts.
  - If context is insufficient or shell access fails, state the single additional input or permission you need in one line, then proceed with what can be done now.
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
  // Optional: prefetch repository labels to include in the prompt (disabled by default)
  const enablePrefetchLabels = (process.env.PROMPT_FETCH_LABELS === "1");
  let repoLabels: Array<{ name: string; color?: string; description?: string }> = [];
  if (enablePrefetchLabels) {
    try {
      const token = selectPatToken({ isSelf });
      repoLabels = await fetchRepoLabels({ owner, repo, token });
    } catch (e) {
      logger.info("[codexAgent] Prefetch labels failed (non-fatal)", { error: String(e) });
    }
  }
  if (contextJson) {
    prompt += `\n\nGitHub context (prefetched):\n\n${wrapJson(contextJson)}`;
  }
  if (enablePrefetchLabels && repoLabels.length) {
    try {
      const labelsJson = safeStringify(repoLabels);
      prompt += `\n\nRepository labels (prefetched):\n\n${wrapJson(labelsJson)}`;
    } catch {
      // ignore stringify failures
    }
  }
  if (includeEventJson) {
    prompt += `\n\nFull GitHub event JSON (verbatim):\n\n${wrapJson(eventJson)}`;
  }

  // Prompt-size guard: if prompt exceeds PROMPT_MAX_LEN, fall back to minimal
  const promptMaxLenRaw = Number(process.env.PROMPT_MAX_LEN || env.PROMPT_MAX_LEN || 0);
  const promptMaxLen = Number.isFinite(promptMaxLenRaw) && promptMaxLenRaw > 0 ? Math.floor(promptMaxLenRaw) : 0;
  if (!minimal && promptMaxLen > 0 && prompt.length > promptMaxLen) {
    logger.info("[codexAgent] Prompt exceeds PROMPT_MAX_LEN, falling back to minimal", { len: prompt.length, max: promptMaxLen });
    prompt = minimalPrompt;
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

    // Correlate request with GitHub run and add a client-side timeout + retry
    const runId = process.env.GITHUB_RUN_ID || "";
    const runRepo = process.env.GITHUB_REPOSITORY || "";
    const runAttempt = process.env.GITHUB_RUN_ATTEMPT || "";

    async function fetchWithTimeoutRetry(url: string, init: RequestInit & { timeout?: number }, retries = 1): Promise<Response> {
      const ctl = new AbortController();
      const t = init.timeout && init.timeout > 0
        ? setTimeout(() => ctl.abort("timeout"), Math.floor(init.timeout))
        : undefined;
      try {
        return await fetch(url, { ...init, signal: ctl.signal });
      } catch (err) {
        if (retries > 0) {
          const msg = String(err || "");
          // Retry only on network/timeout errors
          if (msg.includes("timeout") || msg.includes("fetch") || msg.includes("network")) {
            await new Promise((r) => setTimeout(r, 1000));
            return await fetchWithTimeoutRetry(url, init, retries - 1);
          }
        }
        throw err;
      } finally {
        if (t) clearTimeout(t);
      }
    }

    const resp = await fetchWithTimeoutRetry(`${piBaseUrl}/api/codex`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-run-id": runId,
        "x-run-repo": runRepo,
        "x-run-attempt": runAttempt,
        "x-agent-owner": String(agentOwner || ""),
      },
      body: JSON.stringify(body),
      // Give the HTTP call slightly more than Codex time to return the JSON
      timeout: Math.max(1000, Math.min(timeoutMs + 30_000, 1_800_000)),
    }, 1);
    if (!resp.ok) {
      const txt = await safeText(resp);
      throw new Error(`Pi /api/codex HTTP ${resp.status}: ${txt}`);
    }
    const data = (await resp.json()) as { ok: boolean; code: number; output?: string; error?: string; posted?: boolean; gh?: any; req_id?: string; run_id?: string };
    if (data?.req_id) {
      logger.info("[codexAgent] Pi request id", { reqId: data.req_id, runId: data.run_id || runId });
    }
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
  // Safety only: avoid re-triggering by removing direct @owner mentions
  text = text.replace(new RegExp(`@${escapeReg(agentOwner)}\\b`, "ig"), agentOwner);
  // Remove explicit test markers like GH_OK, GH_LABELS_OK, etc.
  text = text.replace(/\bGH(?:_[A-Z]+)?_OK\b/g, "");
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

async function fetchRepoLabels(params: { owner: string; repo: string; token: string }): Promise<Array<{ name: string; color?: string; description?: string }>> {
  const { owner, repo, token } = params;
  const headers = {
    "authorization": `Bearer ${token}`,
    "accept": "application/vnd.github+json",
    "x-github-api-version": "2022-11-28",
  } as Record<string, string>;
  const base = `https://api.github.com/repos/${owner}/${repo}/labels`;
  const out: Array<{ name: string; color?: string; description?: string }> = [];
  let page = 1;
  for (let i = 0; i < 3; i++) { // fetch up to ~300 labels max
    const url = `${base}?per_page=100&page=${page}`;
    const r = await fetch(url, { headers });
    if (!r.ok) break;
    const arr = (await r.json()) as Array<any>;
    for (const l of arr) out.push({ name: String(l?.name || ""), color: l?.color, description: l?.description });
    if (arr.length < 100) break;
    page++;
  }
  // dedupe by name
  const seen = new Set<string>();
  return out.filter((l) => {
    const key = l.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
}

function renderLabelsMarkdown(params: { labels: Array<{ name: string; color?: string; description?: string }>; summary?: { title?: string; body?: string } | null }): string {
  const { labels, summary } = params;
  const lines: string[] = [];
  if (summary && (summary.title || summary.body)) {
    lines.push("**Summary**");
    if (summary.title) lines.push(`- Title: ${summary.title}`);
    if (summary.body) lines.push(`- Description: ${summary.body}`);
    lines.push("");
  }
  lines.push("**Repository Labels**");
  if (!labels || labels.length === 0) {
    lines.push("- No labels defined.");
    return lines.join("\n");
  }

  // Group by common prefixes to improve readability
  const buckets: Record<string, Array<{ name: string; description?: string }>> = {
    Price: [],
    Time: [],
    Priority: [],
    Severity: [],
    Type: [],
    Status: [],
    Other: [],
  };
  for (const l of labels) {
    const n = l.name;
    const d = l.description || "";
    const add = (k: string) => buckets[k].push({ name: n, description: d });
    if (/^price[:\s]/i.test(n)) add("Price");
    else if (/^time[:\s]/i.test(n)) add("Time");
    else if (/^priority[:\s]/i.test(n)) add("Priority");
    else if (/^severity[:\s]/i.test(n)) add("Severity");
    else if (/^(type|kind)[:\s]/i.test(n)) add("Type");
    else if (/^status[:\s]/i.test(n)) add("Status");
    else add("Other");
  }

  const order = ["Priority", "Severity", "Status", "Type", "Price", "Time", "Other"];
  for (const key of order) {
    const arr = buckets[key];
    if (!arr.length) continue;
    lines.push(`- **${key}**`);
    for (const item of arr) {
      const desc = item.description ? ` — ${item.description}` : "";
      lines.push(`  - \`${item.name}\`${desc}`);
    }
  }
  return lines.join("\n");
}

function summarizeIssueContextBrief(ctx: unknown): { title?: string; body?: string } | null {
  if (!ctx || typeof ctx !== "object") return null;
  const any = ctx as any;
  const title = any?.issue?.title ? String(any.issue.title) : undefined;
  const body = any?.issue?.body ? String(any.issue.body) : undefined;
  return title || body ? { title, body } : null;
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
