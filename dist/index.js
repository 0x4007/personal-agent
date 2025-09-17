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

// src/handlers/codex-agent.ts
var codex_agent_exports = {};
__export(codex_agent_exports, {
  codexAgent: () => codexAgent
});
import fs from "fs";
import path2 from "path";
async function codexAgent(context) {
  const { logger, payload, env } = context;
  const sender = payload.comment.user?.login;
  const repo = payload.repository.name;
  const issueNumber = payload.issue.number;
  const isPR = Boolean(payload.issue?.pull_request);
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
  const timeoutMs = Number(process.env.PI_TIMEOUT_MS || env.PI_TIMEOUT_MS || 3e4);
  const shouldPost = isSelf;
  const mentionOverride = parseMentionEnv(process.env.PI_MENTION);
  const enablePrefetch = (process.env.PROMPT_FETCH_ISSUE ?? "1") === "1";
  let fetchedContext = null;
  if (enablePrefetch) {
    try {
      const token = selectPatToken({ isSelf });
      fetchedContext = await fetchIssueContext({ owner, repo, issueNumber, isPR, token });
    } catch (e) {
      logger.info("[codexAgent] Prefetch failed (non-fatal)", { error: String(e) });
    }
  }
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

  Style & Formatting (GitHub\u2011flavored Markdown):
  - Use short headings to structure longer replies only when helpful.
  - Prefer bullet lists for enumerations; use one bullet per item.
    - Never compress many items into one bullet via hyphens/commas; use multiple bullets instead.
    - For 12+ similar items, a compact table is allowed if it improves scanability.
  - Use checklists for actionable tasks (e.g., "- [ ] Step").
  - Use code fences for commands, code, diffs, or JSON (\`\`\`bash, \`\`\`ts, \`\`\`json, \`\`\`diff).
  - Link concisely with Markdown links or short refs (owner/repo#123). Avoid dumping long raw URLs.
  - Keep paragraphs short (1\u20133 sentences). Prefer lists/tables for dense info. Do not paste huge raw JSON.

  Content Rules:
  - Always prefer live reads over inference: if the answer depends on repository data (labels, files, commits, diffs, milestones, prices, etc.), use gh or the GitHub API to read it first; do not guess or invent values.
  - Summarize results; do not echo command lines or transcripts.
  - If context is insufficient or shell access fails, state the single additional input or permission you need in one line, then proceed with what can be done now.
  - When listing labels (or similar), prefer bullets like:
  - \`bug\` \u2014 user\u2011visible defect
  - \`enhancement\` \u2014 new capability
  - \`priority:high\` \u2014 respond within 24h
  - When asked for a plan, produce a short, numbered list (5\u20138 items max), each one line.
  - When asked for acceptance criteria, use bullets with clear, testable statements (concise Given/When/Then is fine).

  Safety & Etiquette:
  - No secrets or tokens.
  - Do not self\u2011trigger loops (no mentions in output).

  Produce only the final GitHub comment now.`.replace(/\n\s+/g, "\n");
  const minimalPrompt = command;
  const minimal = process.env.PI_MINIMAL === "1";
  const includeEventJson = process.env.PROMPT_INCLUDE_EVENT === "1" || process.env.INCLUDE_GH_EVENT === "1";
  const stripUrls = (process.env.PROMPT_STRIP_URLS ?? "1") === "1";
  const eventForPrompt = includeEventJson ? stripUrls ? stripUrlFields(payload) : payload : void 0;
  const eventJson = includeEventJson ? safeStringify(eventForPrompt) : "";
  const contextJson = fetchedContext ? safeStringify(stripUrlFields(fetchedContext)) : "";
  const basePrompt = minimal ? minimalPrompt : richPrompt;
  let prompt = basePrompt;
  const enablePrefetchLabels = process.env.PROMPT_FETCH_LABELS === "1";
  let repoLabels = [];
  if (enablePrefetchLabels) {
    try {
      const token2 = selectPatToken({ isSelf });
      repoLabels = await fetchRepoLabels({ owner, repo, token: token2 });
    } catch (e) {
      logger.info("[codexAgent] Prefetch labels failed (non-fatal)", { error: String(e) });
    }
  }
  if (contextJson) {
    prompt += `

GitHub context (prefetched):

${wrapJson(contextJson)}`;
  }
  if (enablePrefetchLabels && repoLabels.length) {
    try {
      const labelsJson = safeStringify(repoLabels);
      prompt += `

Repository labels (prefetched):

${wrapJson(labelsJson)}`;
    } catch {
    }
  }
  if (includeEventJson) {
    prompt += `

Full GitHub event JSON (verbatim):

${wrapJson(eventJson)}`;
  }
  try {
    if (process.env.LOG_PAYLOAD === "1") {
      logger.info("[codexAgent] GH payload (raw)", { payload });
    }
    if (process.env.LOG_PROMPT === "1") {
      const rawLen = includeEventJson ? safeStringify(payload).length : 0;
      const sanLen = includeEventJson ? eventJson.length : 0;
      const ctxLen = contextJson.length;
      logger.info("[codexAgent] Prompt (full)", { length: prompt.length, prompt, eventRawLen: rawLen, eventSanitizedLen: sanLen, contextLen: ctxLen });
    }
    const body2 = minimal ? { prompt, timeout_ms: timeoutMs, post: false, mention: mentionOverride } : {
      prompt,
      timeout_ms: timeoutMs,
      repo: `${owner}/${repo}`,
      ...isPR ? { pr: issueNumber } : { issue: issueNumber },
      post: false,
      // Explicitly request no mention unless overridden via PI_MENTION
      mention: mentionOverride
    };
    if (process.env.LOG_PI_BODY === "1") {
      logger.info("[codexAgent] Pi request body", { body: body2 });
    }
    if (process.env.WRITE_PROMPT_FILE === "1") {
      try {
        writeRuntimeLogs({ prompt, body: body2, payload, sanitized: eventForPrompt });
      } catch (e) {
      }
    }
    const resp = await fetch(`${piBaseUrl}/api/codex`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body2)
    });
    if (!resp.ok) {
      const txt = await safeText(resp);
      throw new Error(`Pi /api/codex HTTP ${resp.status}: ${txt}`);
    }
    const data = await resp.json();
    if (!data.ok) throw new Error(`Pi /api/codex failed (code ${data.code}): ${data.error || "unknown error"}`);
    if (shouldPost) {
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
        token
      }, logger);
      logger.ok("Posted cleaned Codex response via GitHub API", { length: clean.length });
    } else {
      logger.ok("Read-only mode: not posting comment.");
    }
  } catch (error) {
    logger.error(`Pi Codex error: ${String(error)}`);
  }
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
  } catch (e) {
    return String(obj);
  }
}
function wrapJson(json) {
  return json ? "```json\n" + json + "\n```" : "";
}
function sanitizeOutput(output, agentOwner) {
  let text = output || "";
  const mentionAny = new RegExp(`(^|\\n)@${escapeReg(agentOwner)}\\b[^\\n]*\\n`, "ig");
  text = text.replace(mentionAny, "\n");
  const dropPatterns = [
    /^[-]{2,}\s*$/,
    // separators like -------
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
    /^\[[0-9]{4}-[0-9]{2}-[0-9]{2}T[^\]]+\]/
    // timestamped brackets
  ];
  const lines = text.split(/\r?\n/);
  const kept = [];
  for (const line of lines) {
    const trimmed = line.trimEnd();
    if (dropPatterns.some((re) => re.test(trimmed))) continue;
    kept.push(trimmed);
  }
  text = kept.join("\n");
  text = text.replace(/\bGH(?:_[A-Z]+)?_OK\b/g, "");
  text = text.replace(/\n{3,}/g, "\n\n").trim();
  const commaCount = (text.match(/,/g) || []).length;
  const newlineCount = (text.match(/\n/g) || []).length;
  const hasBullets = /^\s*[-*]\s+/m.test(text) || /\|/.test(text);
  if (!hasBullets && newlineCount <= 2 && commaCount >= 8) {
    const items = text.split(",").map((s) => s.trim()).filter(Boolean);
    const seen = /* @__PURE__ */ new Set();
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
  const markers = ["assistant:", "Assistant:"];
  let cut = -1;
  for (const m of markers) {
    const idx = text.lastIndexOf(m);
    cut = Math.max(cut, idx);
  }
  if (cut !== -1) {
    text = text.slice(cut + "assistant:".length).trim();
  }
  text = text.replace(new RegExp(`@${escapeReg(agentOwner)}\\b`, "ig"), agentOwner).trim();
  if (text.length > 600) text = text.slice(-600).trimStart();
  return text.trim();
}
function escapeReg(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
async function postGithubComment(params, logger) {
  const { owner, repo, issueNumber, body, token } = params;
  if (!token) throw new Error("Missing GitHub token to post comment");
  const url = `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/comments`;
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "authorization": `Bearer ${token}`,
      "accept": "application/vnd.github+json",
      "content-type": "application/json",
      "x-github-api-version": "2022-11-28"
    },
    body: JSON.stringify({ body })
  });
  if (!resp.ok) {
    const txt = await safeText(resp);
    throw new Error(`GitHub comment HTTP ${resp.status}: ${txt}`);
  }
  logger.info("[codexAgent] GitHub comment posted");
}
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
async function fetchIssueContext(params) {
  const { owner, repo, issueNumber, isPR, token } = params;
  if (!token) throw new Error("Missing token for GitHub context fetch");
  const base = `https://api.github.com/repos/${owner}/${repo}`;
  const headers = {
    "authorization": `Bearer ${token}`,
    "accept": "application/vnd.github+json",
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
  if (isPR) {
    try {
      pr = await getJson(`${base}/pulls/${issueNumber}`);
    } catch {
    }
  }
  const slimIssue = {
    number: issue.number,
    title: issue.title,
    state: issue.state,
    author: issue.user?.login,
    labels: Array.isArray(issue.labels) ? issue.labels.map((l) => typeof l === "string" ? l : l?.name).filter(Boolean) : [],
    body: issue.body,
    created_at: issue.created_at,
    updated_at: issue.updated_at,
    url: issue.url
  };
  const slimComments = Array.isArray(comments) ? comments.map((c) => ({ author: c.user?.login, created_at: c.created_at, body: c.body, url: c.url })) : [];
  const slimPr = pr ? { merged: !!pr.merged_at, draft: !!pr.draft, head: pr.head?.ref, base: pr.base?.ref, additions: pr.additions, deletions: pr.deletions, changed_files: pr.changed_files, url: pr.url } : null;
  return { issue: slimIssue, comments: slimComments, pr: slimPr };
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
var init_codex_agent = __esm({
  "src/handlers/codex-agent.ts"() {
    "use strict";
    init_esm_shims();
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
    cachedCodexAgent = Promise.resolve().then(() => (init_codex_agent(), codex_agent_exports)).then((mod) => mod.codexAgent).catch(async (error) => {
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
