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
  const postToGh = false;
  const mentionOverride = process.env.PI_MENTION ?? "";
  const richPrompt = [
    `[mode:${accessLevel}] [type:${isPR ? "pr" : "issue"}]`,
    `repo:${owner}/${repo}`,
    `${isPR ? "pr" : "issue"}:${issueNumber}`,
    `actor:${sender}`,
    `Environment: Linux shell on Raspberry Pi with git and the GitHub CLI (gh) installed. The gh CLI is already authenticated as @${agentOwner} with access to private repos.`,
    `Rules for GitHub access: use gh for all GitHub reads (issues, PRs, files, comments, diffs). Prefer structured JSON, e.g. gh issue view ${issueNumber} --json title,body,comments or gh pr view --json files,commits. If raw REST is needed, use gh api with -q for JMESPath. Do not request credentials or tokens.`,
    `Posting policy: do NOT post comments yourself; output only the final comment text. The runner will post your final answer.`,
    `
User request: ${command}`,
    `
Instructions: Provide a helpful, concise answer. Consider repo code and ${isPR ? "PR diffs and discussion" : "issue discussion"}. Output plain text suitable for a GitHub comment.`
  ].join(" ");
  const minimalPrompt = command;
  const minimal = process.env.PI_MINIMAL === "1";
  const includeEventJson = process.env.PROMPT_INCLUDE_EVENT === "1" || process.env.INCLUDE_GH_EVENT === "1";
  const stripUrls = (process.env.PROMPT_STRIP_URLS ?? "1") === "1";
  const eventForPrompt = includeEventJson ? stripUrls ? stripUrlFields(payload) : payload : void 0;
  const eventJson = includeEventJson ? safeStringify(eventForPrompt) : "";
  const basePrompt = minimal ? minimalPrompt : richPrompt;
  const prompt = includeEventJson ? `${basePrompt}

Full GitHub event JSON (verbatim):


${wrapJson(eventJson)}` : basePrompt;
  try {
    if (process.env.LOG_PAYLOAD === "1") {
      logger.info("[codexAgent] GH payload (raw)", { payload });
    }
    if (process.env.LOG_PROMPT === "1") {
      const rawLen = includeEventJson ? safeStringify(payload).length : 0;
      const sanLen = includeEventJson ? eventJson.length : 0;
      logger.info("[codexAgent] Prompt (full)", { length: prompt.length, prompt, eventRawLen: rawLen, eventSanitizedLen: sanLen });
    }
    const body2 = minimal ? { prompt, timeout_ms: timeoutMs, post: false } : {
      prompt,
      timeout_ms: timeoutMs,
      repo: `${owner}/${repo}`,
      ...isPR ? { pr: issueNumber } : { issue: issueNumber },
      post: false,
      // best-effort: request server to avoid adding a leading mention
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
  const mentionRe = new RegExp(`^@${escapeReg(agentOwner)}\\b.*\\n?`, "i");
  text = text.replace(mentionRe, "");
  const lines = text.split(/\r?\n/);
  const filtered = [];
  for (const line of lines) {
    if (/OpenAI Codex v/i.test(line)) continue;
    if (/^-{2,}\s*workdir:/i.test(line)) continue;
    if (/^model:\s*/i.test(line)) continue;
    filtered.push(line);
  }
  text = filtered.join("\n").trim();
  const assistantIdx = Math.max(text.lastIndexOf("assistant:"), text.lastIndexOf("Assistant:"));
  if (assistantIdx !== -1) {
    text = text.slice(assistantIdx + "assistant:".length).trim();
  }
  text = text.replace(new RegExp(`@${escapeReg(agentOwner)}\\b`, "ig"), agentOwner);
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
function selectPatToken(opts) {
  const { isSelf } = opts;
  if (isSelf) {
    return process.env.USER_PAT_FULL || process.env.PAT_FULL || process.env.USER_PAT || process.env.PLUGIN_GITHUB_TOKEN || process.env.GITHUB_TOKEN || "";
  }
  return process.env.USER_PAT_READ || process.env.PAT_READ || process.env.USER_PAT || process.env.PLUGIN_GITHUB_TOKEN || process.env.GITHUB_TOKEN || "";
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