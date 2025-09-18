var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// node_modules/tsup/assets/esm_shims.js
import path from "path";
import { fileURLToPath } from "url";
var init_esm_shims = __esm({
  "node_modules/tsup/assets/esm_shims.js"() {
    "use strict";
  }
});

// src/handlers/codex-agent/lib/config.ts
function parseMentionEnv(val) {
  if (val === void 0 || val === "") return false;
  const s = String(val).toLowerCase().trim();
  if (s === "false" || s === "0" || s === "no" || s === "off") return false;
  if (s === "true" || s === "1" || s === "yes" || s === "on") return true;
  return val;
}
function selectPatToken(opts) {
  const { isSelf } = opts;
  if (isSelf) {
    return process.env.USER_PAT_FULL || process.env.PAT_FULL || process.env.USER_PAT || process.env.PLUGIN_GITHUB_TOKEN || process.env.GITHUB_TOKEN || "";
  }
  return process.env.USER_PAT_READ || process.env.PAT_READ || process.env.USER_PAT || process.env.PLUGIN_GITHUB_TOKEN || process.env.GITHUB_TOKEN || "";
}
var init_config = __esm({
  "src/handlers/codex-agent/lib/config.ts"() {
    "use strict";
    init_esm_shims();
  }
});

// src/handlers/codex-agent/lib/utils.ts
function toObject(v) {
  return v && typeof v === "object" ? v : {};
}
function toNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : void 0;
}
function toStringOrUndefined(v) {
  if (typeof v === "string") return v;
  if (v != null) return String(v);
  return void 0;
}
async function safeText(resp) {
  try {
    return await resp.text();
  } catch {
    return "";
  }
}
function safeStringify(obj) {
  try {
    return JSON.stringify(obj);
  } catch {
    return String(obj);
  }
}
function stripUrlFields(value) {
  const redundantUrlKey = /_url$/i;
  if (Array.isArray(value)) {
    return value.map(stripUrlFields);
  }
  if (value && typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (redundantUrlKey.test(k)) continue;
      out[k] = stripUrlFields(v);
    }
    return out;
  }
  return value;
}
var init_utils = __esm({
  "src/handlers/codex-agent/lib/utils.ts"() {
    "use strict";
    init_esm_shims();
  }
});

// src/handlers/codex-agent/lib/github.ts
async function maybePrefetchContext(args) {
  const { logger, isSelf, owner, repo, issueNumber, isPr } = args;
  const isPrefetchEnabled = (process.env.PROMPT_FETCH_ISSUE ?? "1") === "1";
  if (!isPrefetchEnabled) return null;
  try {
    const token = selectPatToken({ isSelf: Boolean(isSelf) });
    return await fetchIssueContext({ owner, repo, issueNumber, isPr, token });
  } catch (e) {
    logger.info("[codexAgent] Prefetch failed (non-fatal)", { error: String(e) });
    return null;
  }
}
async function createGithubComment(params, logger) {
  const { owner, repo, issueNumber, body, token } = params;
  if (!token) throw new Error("Missing GitHub token to create comment");
  const url = `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/comments`;
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      accept: "application/vnd.github+json",
      "content-type": "application/json",
      "x-github-api-version": "2022-11-28"
    },
    body: JSON.stringify({ body })
  });
  if (!resp.ok) {
    const txt = await safeText(resp);
    throw new Error(`GitHub comment HTTP ${resp.status}: ${txt}`);
  }
  try {
    const json = await resp.json();
    const id = Number(json.id);
    if (!Number.isFinite(id)) return null;
    logger.info("[codexAgent] Created comment", { id });
    return { id };
  } catch {
    return null;
  }
}
async function maybeCreatePlaceholderComment(args) {
  const { logger, isSelf, owner, repo, issueNumber } = args;
  try {
    const token = selectPatToken({ isSelf: Boolean(isSelf) });
    const placeholder = `\u23F3 Thinking\u2026`;
    const created = await createGithubComment(
      {
        owner,
        repo,
        issueNumber,
        body: placeholder,
        token
      },
      logger
    );
    const id = created?.id ?? null;
    logger.info("[codexAgent] Created placeholder comment", { id });
    return id;
  } catch (e) {
    logger.info("[codexAgent] Placeholder comment creation failed (non-fatal)", { error: String(e) });
    return null;
  }
}
async function fetchIssueContext(params) {
  const { owner, repo, issueNumber, isPr, token } = params;
  if (!token) throw new Error("Missing token for GitHub context fetch");
  const base = `https://api.github.com/repos/${owner}/${repo}`;
  const headers = {
    authorization: `Bearer ${token}`,
    accept: "application/vnd.github+json",
    "x-github-api-version": "2022-11-28"
  };
  async function getJson(url) {
    const r = await fetch(url, { headers });
    if (!r.ok) throw new Error(`${url} -> HTTP ${r.status}`);
    return r.json();
  }
  const issue = await getJson(`${base}/issues/${issueNumber}`);
  const comments = await getJson(`${base}/issues/${issueNumber}/comments?per_page=50`);
  let pr = null;
  if (isPr) {
    try {
      pr = await getJson(`${base}/pulls/${issueNumber}`);
    } catch {
    }
  }
  const issueObj = toObject(issue);
  const slimIssue = {
    number: toNumber(issueObj.number) ?? issueNumber,
    title: toStringOrUndefined(issueObj.title),
    state: toStringOrUndefined(issueObj.state),
    author: toObject(issueObj.user).login,
    labels: Array.isArray(issueObj.labels) ? issueObj.labels.map((l) => typeof l === "string" ? l : toStringOrUndefined(toObject(l).name)).filter((v) => Boolean(v)) : [],
    body: toStringOrUndefined(issueObj.body),
    created_at: toStringOrUndefined(issueObj.created_at),
    updated_at: toStringOrUndefined(issueObj.updated_at),
    url: toStringOrUndefined(issueObj.url)
  };
  const slimComments = Array.isArray(comments) ? comments.map((c) => {
    const obj = toObject(c);
    return {
      author: toStringOrUndefined(toObject(obj.user).login),
      created_at: toStringOrUndefined(obj.created_at),
      body: toStringOrUndefined(obj.body),
      url: toStringOrUndefined(obj.url)
    };
  }) : [];
  const prObj = pr && typeof pr === "object" ? pr : null;
  const slimPr = prObj ? {
    merged: Boolean(prObj.merged_at),
    draft: Boolean(prObj.draft),
    head: toStringOrUndefined(toObject(prObj.head).ref),
    base: toStringOrUndefined(toObject(prObj.base).ref),
    additions: toNumber(prObj.additions) ?? void 0,
    deletions: toNumber(prObj.deletions) ?? void 0,
    changed_files: toNumber(prObj.changed_files) ?? void 0,
    url: toStringOrUndefined(prObj.url)
  } : null;
  return { issue: slimIssue, comments: slimComments, pr: slimPr };
}
async function fetchRepoLabels(params) {
  const { owner, repo, token } = params;
  const headers = {
    authorization: `Bearer ${token}`,
    accept: "application/vnd.github+json",
    "x-github-api-version": "2022-11-28"
  };
  const base = `https://api.github.com/repos/${owner}/${repo}/labels`;
  const out = [];
  let page = 1;
  for (let i = 0; i < 3; i++) {
    const url = `${base}?per_page=100&page=${page}`;
    const r = await fetch(url, { headers });
    if (!r.ok) break;
    const arr = await r.json();
    for (const l of arr) {
      const obj = toObject(l);
      out.push({ name: String(obj.name ?? ""), color: obj.color, description: obj.description });
    }
    if (arr.length < 100) break;
    page++;
  }
  const seen = /* @__PURE__ */ new Set();
  return out.filter((l) => {
    const key = l.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).sort((a, b) => a.name.localeCompare(b.name, void 0, { sensitivity: "base" }));
}
var init_github = __esm({
  "src/handlers/codex-agent/lib/github.ts"() {
    "use strict";
    init_esm_shims();
    init_config();
    init_utils();
  }
});

// src/handlers/codex-agent/lib/prompt.ts
function buildRichPrompt(args) {
  const { accessLevel, isPr, owner, repo, issueNumber, sender, agentOwner, command } = args;
  const base = `
  [mode:${accessLevel}] [type:${isPr ? "pr" : "issue"}] repo:${owner}/${repo} ${isPr ? "pr" : "issue"}:${issueNumber} actor:${sender}
  Environment: Linux shell with GitHub CLI (gh) available and authenticated as @${agentOwner}.
  You are a GitHub assistant. You always return a single GitHub comment (no preamble, no wrappers).

  User request:
  ${command}

  Output Contract:
  - Output only the final comment text to post on GitHub.
  - Do NOT include role labels (assistant:, system:, user:), system messages, logs, markers (e.g., GH_*_OK), transcripts, or thinking.
  - Do NOT @mention any user or team (avoid loops). If you must reference a handle, render as plain text or code.

  Style & Formatting (GitHub\u2011flavored Markdown):
  - Use short headings to structure longer replies only when helpful.
  - Prefer bullet lists for enumerations; use one bullet per item.
    - Never compress many items into one bullet via hyphens/commas; use multiple bullets instead.
    - For 12+ similar items, a compact table is allowed if it improves scanability.
  - Use checklists for actionable tasks (e.g., "- [ ] Step").
  - Use code fences for commands, code, diffs, or JSON (\`\`\`bash, \`\`\`ts, \`\`\`json, \`\`\`diff).
  - Do NOT wrap the entire response in a code block; only fence code/diff/json snippets.
  - Link concisely with Markdown links or short refs (owner/repo#123). Avoid dumping long raw URLs.
  - Keep paragraphs short (1\u20133 sentences). Prefer lists/tables for dense info. Do not paste huge raw JSON.
  - Keep it concise: target ~800 characters unless a longer list is explicitly requested.

  Content Rules:
  - Always prefer live reads over inference: if the answer depends on repository data (labels, files, commits, diffs, milestones, prices, etc.), use gh or the GitHub API to read it first; do not guess or invent values.
  - Summarize results; do not echo command lines or transcripts.
  - If context is insufficient or shell access fails, state the single additional input or permission you need in one line, then proceed with what can be done now.
  - When asked for a plan, produce a short, numbered list (5\u20138 items max), each one line.
  - When asked for acceptance criteria, use bullets with clear, testable statements (concise Given/When/Then is fine).

  Safety & Etiquette:
  - No secrets or tokens.
  - Do not self\u2011trigger loops (no mentions in output).

  Produce only the final GitHub comment now.`;
  return base.replace(/\n\s+/g, "\n");
}
function wrapJson(json) {
  return json ? "```json\n" + json + "\n```" : "";
}
async function buildFullPrompt(args) {
  const { richPrompt, command, payload, fetchedContext, owner, repo, isSelf, logger } = args;
  const minimalPrompt = command;
  const isMinimal = process.env.PI_MINIMAL === "1";
  const doesIncludeEventJson = process.env.PROMPT_INCLUDE_EVENT === "1" || process.env.INCLUDE_GH_EVENT === "1";
  const shouldStrip = (process.env.PROMPT_STRIP_URLS ?? "1") === "1";
  let eventForPrompt = void 0;
  if (doesIncludeEventJson) {
    eventForPrompt = shouldStrip ? stripUrlFields(payload) : payload;
  }
  const eventJson = doesIncludeEventJson ? safeStringify(eventForPrompt) : "";
  const contextJson = fetchedContext ? safeStringify(stripUrlFields(fetchedContext)) : "";
  const basePrompt = isMinimal ? minimalPrompt : richPrompt;
  let prompt = basePrompt;
  const shouldFetchLabels = process.env.PROMPT_FETCH_LABELS === "1";
  if (contextJson) {
    prompt += `

GitHub context (prefetched):

${wrapJson(contextJson)}`;
  }
  if (shouldFetchLabels) {
    try {
      const token = selectPatToken({ isSelf: Boolean(isSelf) });
      const repoLabels = await fetchRepoLabels({ owner, repo, token });
      if (repoLabels.length) {
        const labelsJson = safeStringify(repoLabels);
        prompt += `

Repository labels (prefetched):

${wrapJson(labelsJson)}`;
      }
    } catch (e) {
      logger.info("[codexAgent] Prefetch labels failed (non-fatal)", { error: String(e) });
    }
  }
  if (doesIncludeEventJson) {
    prompt += `

Full GitHub event JSON (verbatim):

${wrapJson(eventJson)}`;
  }
  return { prompt, eventJson, contextJson, isMinimal };
}
var init_prompt = __esm({
  "src/handlers/codex-agent/lib/prompt.ts"() {
    "use strict";
    init_esm_shims();
    init_github();
    init_config();
    init_utils();
  }
});

// src/handlers/codex-agent/lib/http.ts
async function fetchWithTimeoutRetry(url, init, retries = 1) {
  const ctl = new AbortController();
  const t = init.timeout && init.timeout > 0 ? setTimeout(() => ctl.abort("timeout"), Math.floor(init.timeout)) : void 0;
  try {
    return await fetch(url, { ...init, signal: ctl.signal });
  } catch (err) {
    if (retries > 0) {
      const msg = String(err || "");
      if (msg.includes("timeout") || msg.includes("fetch") || msg.includes("network")) {
        await new Promise((r) => setTimeout(r, 1e3));
        return await fetchWithTimeoutRetry(url, init, retries - 1);
      }
    }
    throw err;
  } finally {
    if (t) clearTimeout(t);
  }
}
var init_http = __esm({
  "src/handlers/codex-agent/lib/http.ts"() {
    "use strict";
    init_esm_shims();
  }
});

// src/handlers/codex-agent/lib/pi.ts
function buildRequestBody(args) {
  const { isMinimal, prompt, timeoutMs, shouldPost, mentionOverride, editCommentId, owner, repo, isPr, issueNumber } = args;
  if (isMinimal) {
    return { prompt, timeout_ms: timeoutMs, post: shouldPost, mention: mentionOverride, edit_comment_id: editCommentId };
  }
  return {
    prompt,
    timeout_ms: timeoutMs,
    repo: `${owner}/${repo}`,
    ...isPr ? { pr: issueNumber } : { issue: issueNumber },
    post: shouldPost,
    mention: mentionOverride,
    edit_comment_id: editCommentId
  };
}
function logPiBodyIfEnabled(args) {
  const { logger, body } = args;
  if (process.env.LOG_PI_BODY === "1") {
    logger.info("[codexAgent] Pi request body", { body });
  }
}
async function invokePiCodex(args) {
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
    agentOwner
  });
  if (!resp.ok) {
    const txt = await safeText(resp);
    throw new Error(`Pi /api/codex HTTP ${resp.status}: ${txt}`);
  }
  const data = await resp.json();
  if (data?.req_id) {
    logger.info("[codexAgent] Pi request id", { reqId: data.req_id, runId: data.run_id || runId });
  }
  if (!data.ok) throw new Error(`Pi /api/codex failed (code ${data.code}): ${data.error || "unknown error"}`);
  return data;
}
async function sendPiRequest(args) {
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
        "x-agent-owner": agentOwner
      },
      body: JSON.stringify(body),
      // Give the HTTP call slightly more than Codex time to return the JSON
      timeout: Math.max(1e3, Math.min(timeoutMs + 3e4, 18e5))
    },
    1
  );
}
var init_pi = __esm({
  "src/handlers/codex-agent/lib/pi.ts"() {
    "use strict";
    init_esm_shims();
    init_http();
    init_utils();
  }
});

// src/handlers/codex-agent/lib/logs.ts
import fs from "fs";
import path2 from "path";
function writeRuntimeLogs(params) {
  const dir = path2.resolve(process.cwd(), "runtime-logs");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const runId = process.env.GITHUB_RUN_ID || String(Date.now());
  const promptPath = path2.join(dir, `prompt-${runId}.txt`);
  const bodyPath = path2.join(dir, `pi-request-${runId}.json`);
  const payloadPath = path2.join(dir, `event-${runId}.json`);
  const payloadSanitizedPath = path2.join(dir, `event-sanitized-${runId}.json`);
  fs.writeFileSync(promptPath, params.prompt, "utf8");
  fs.writeFileSync(bodyPath, JSON.stringify(params.body, null, 2), "utf8");
  if (process.env.WRITE_EVENT_FILE === "1") {
    try {
      fs.writeFileSync(payloadPath, JSON.stringify(params.payload, null, 2), "utf8");
      if (params.sanitized !== void 0) {
        fs.writeFileSync(payloadSanitizedPath, JSON.stringify(params.sanitized, null, 2), "utf8");
      }
    } catch {
    }
  }
}
function logPayloadIfEnabled(args) {
  const { logger, payload, eventJson, contextJson, prompt } = args;
  if (process.env.LOG_PROMPT === "1") {
    const rawLen = process.env.PROMPT_INCLUDE_EVENT === "1" || process.env.INCLUDE_GH_EVENT === "1" ? safeStringify(payload).length : 0;
    const sanLen = rawLen > 0 ? eventJson.length : 0;
    const ctxLen = contextJson.length;
    logger.info("[codexAgent] Prompt (full)", { length: prompt.length, prompt, eventRawLen: rawLen, eventSanitizedLen: sanLen, contextLen: ctxLen });
  }
}
async function maybeWriteRuntimeLogs(args) {
  const { prompt, body, payload, logger } = args;
  if (process.env.WRITE_PROMPT_FILE !== "1") return;
  try {
    writeRuntimeLogs({ prompt, body, payload, sanitized: process.env.PROMPT_INCLUDE_EVENT === "1" ? stripUrlFields(payload) : void 0 });
  } catch (e) {
    logger.info("[codexAgent] runtime log write failed (non-fatal)", { error: String(e) });
  }
}
var init_logs = __esm({
  "src/handlers/codex-agent/lib/logs.ts"() {
    "use strict";
    init_esm_shims();
    init_utils();
  }
});

// src/handlers/codex-agent/index.ts
async function codexAgent(context) {
  const { logger, payload, env } = context;
  const sender = payload.comment.user?.login;
  const repo = payload.repository.name;
  const issueNumber = payload.issue.number;
  const isPr = Boolean(payload.issue?.pull_request);
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
  const timeoutMs = Number(process.env.PI_TIMEOUT_MS || 3e4);
  const shouldPost = isSelf;
  const mentionOverride = parseMentionEnv(process.env.PI_MENTION);
  const fetchedContext = await maybePrefetchContext({ logger, isSelf, owner, repo, issueNumber, isPr });
  const richPrompt = buildRichPrompt({
    accessLevel,
    isPr,
    owner,
    repo,
    issueNumber,
    sender,
    agentOwner,
    command
  });
  const {
    prompt: fullPrompt,
    eventJson,
    contextJson,
    isMinimal
  } = await buildFullPrompt({
    richPrompt,
    command,
    payload,
    fetchedContext,
    owner,
    repo,
    isSelf,
    logger
  });
  let prompt = fullPrompt;
  const promptMaxLenRaw = Number(process.env.PROMPT_MAX_LEN || 0);
  const promptMaxLen = Number.isFinite(promptMaxLenRaw) && promptMaxLenRaw > 0 ? Math.floor(promptMaxLenRaw) : 0;
  if (!isMinimal && promptMaxLen > 0 && prompt.length > promptMaxLen) {
    logger.info("[codexAgent] Prompt exceeds PROMPT_MAX_LEN, falling back to minimal", { len: prompt.length, max: promptMaxLen });
    prompt = command;
  }
  try {
    logPayloadIfEnabled({ logger, payload, eventJson, contextJson, prompt });
    const editCommentId = shouldPost ? await maybeCreatePlaceholderComment({ logger, isSelf, owner, repo, issueNumber }) : null;
    const body2 = buildRequestBody({ isMinimal, prompt, timeoutMs, shouldPost, mentionOverride, editCommentId, owner, repo, isPr, issueNumber });
    logPiBodyIfEnabled({ logger, body: body2 });
    await maybeWriteRuntimeLogs({ prompt, body: body2, payload, logger });
    await invokePiCodex({
      baseUrl: piBaseUrl,
      body: body2,
      timeoutMs,
      agentOwner: String(agentOwner || ""),
      logger
    });
    logger.ok(shouldPost ? "Handoff complete; Pi will edit placeholder." : "Read-only invocation completed.");
  } catch (error) {
    logger.error(`Pi Codex error: ${String(error)}`);
  }
}
var init_codex_agent = __esm({
  "src/handlers/codex-agent/index.ts"() {
    "use strict";
    init_esm_shims();
    init_config();
    init_prompt();
    init_github();
    init_pi();
    init_logs();
  }
});

// src/handlers/codex-agent.ts
var codex_agent_exports = {};
__export(codex_agent_exports, {
  codexAgent: () => codexAgent
});
var init_codex_agent2 = __esm({
  "src/handlers/codex-agent.ts"() {
    "use strict";
    init_esm_shims();
    init_codex_agent();
  }
});

// src/index.ts
init_esm_shims();

// src/types/typeguards.ts
init_esm_shims();
function isIssueCommentEvent(context) {
  return context.eventName === "issue_comment.created";
}

// src/index.ts
import fs2 from "fs";
import { brotliDecompressSync } from "zlib";
var cachedCodexAgent;
async function loadCodexAgent() {
  if (!cachedCodexAgent) {
    cachedCodexAgent = Promise.resolve().then(() => (init_codex_agent2(), codex_agent_exports)).then((mod) => mod.codexAgent).catch(async (error) => {
      if (!isModuleNotFound(error) || !import.meta.url.endsWith(".ts")) {
        throw error;
      }
      const fallbackUrl = new URL("./handlers/codex-agent.ts", import.meta.url);
      const fallbackModule = await import(fallbackUrl.href);
      return fallbackModule.codexAgent;
    });
  }
  return cachedCodexAgent;
}
function isModuleNotFound(error) {
  if (typeof error !== "object" || error === null) return false;
  return "code" in error && error.code === "ERR_MODULE_NOT_FOUND";
}
async function runPlugin(context) {
  const { logger, eventName } = context;
  if (isIssueCommentEvent(context)) {
    const codexAgent2 = await loadCodexAgent();
    return await codexAgent2(context);
  }
  logger.error(`Unsupported event: ${eventName}`);
}
async function mainFromActionsEnv() {
  try {
    const eventPath = process.env.GITHUB_EVENT_PATH;
    if (!eventPath || !fs2.existsSync(eventPath)) return;
    const raw = fs2.readFileSync(eventPath, "utf8");
    const evt = JSON.parse(raw);
    const inputs = evt?.inputs || {};
    const eventName = inputs.eventName || evt?.event_name || "issue_comment.created";
    const payload = await decodeEventPayload(inputs.eventPayload);
    if (process.env.DEBUG_EVENT_RAW === "1") {
      console.log("[debug] GITHUB_EVENT_PATH raw JSON:");
      console.log(raw);
    }
    if (process.env.DEBUG_EVENT === "1") {
      console.log("[debug] workflow_dispatch inputs:", JSON.stringify(inputs));
      try {
        console.log("[debug] decoded eventPayload:", JSON.stringify(payload));
      } catch {
        console.log("[debug] decoded eventPayload: <non-json>");
      }
    }
    const logger = {
      info: (...args) => console.log("[info]", ...args),
      ok: (msg, meta) => {
        console.log("[ok]", msg, meta || "");
        return {
          logMessage: { diff: String(msg), type: "info" },
          metadata: { message: String(msg), ...meta || {} }
        };
      },
      error: (msg, meta) => {
        console.error("[error]", msg, meta || "");
        return {
          logMessage: { diff: String(msg), type: "fatal" },
          metadata: { message: String(msg), ...meta || {} }
        };
      }
    };
    const context = {
      eventName,
      payload,
      env: process.env,
      logger,
      commentHandler: { postComment: async () => null }
    };
    await runPlugin(context);
  } catch (e) {
    console.error("[fatal] Actions runner error", e);
    process.exit(1);
  }
}
async function decodeEventPayload(maybe) {
  if (!maybe) return {};
  if (typeof maybe === "object") return maybe;
  if (typeof maybe === "string") {
    try {
      const buf = Buffer.from(maybe, "base64");
      const decompressed = brotliDecompressSync(buf);
      return JSON.parse(decompressed.toString("utf8"));
    } catch {
      try {
        return JSON.parse(maybe);
      } catch {
        return { raw: maybe };
      }
    }
  }
  return {};
}
mainFromActionsEnv().catch((e) => {
  console.error(e);
  process.exit(1);
});
export {
  runPlugin
};
//# sourceMappingURL=index.js.map