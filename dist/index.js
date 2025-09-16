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
async function codexAgent(context) {
  const { logger, payload, env } = context;
  const sender = payload.comment.user?.login;
  const repo = payload.repository.name;
  const issueNumber = payload.issue.number;
  const isPR = Boolean(payload.issue?.pull_request);
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
  const timeoutMs = Number(process.env.PI_TIMEOUT_MS || env.PI_TIMEOUT_MS || 3e4);
  const postToGh = process.env.PI_POST ? process.env.PI_POST === "true" : true;
  const richPrompt = [
    `[mode:${accessLevel}] [type:${isPR ? "pr" : "issue"}]`,
    `repo:${owner}/${repo}`,
    `${isPR ? "pr" : "issue"}:${issueNumber}`,
    `actor:${sender}`,
    `
User request: ${command}`,
    `
Instructions: Provide a helpful, concise answer. Consider repo code and ${isPR ? "PR diffs and discussion" : "issue discussion"}. Output plain text suitable for a GitHub comment.`
  ].join(" ");
  const minimalPrompt = command;
  const minimal = process.env.PI_MINIMAL === "1";
  const prompt = minimal ? minimalPrompt : richPrompt;
  try {
    const body2 = minimal ? { prompt, timeout_ms: timeoutMs, post: postToGh } : {
      prompt,
      timeout_ms: timeoutMs,
      repo: `${owner}/${repo}`,
      ...isPR ? { pr: issueNumber } : { issue: issueNumber },
      post: postToGh
    };
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
    logger.ok(`Pi handled Codex ${data.posted ? "and posted comment" : "without posting"}`);
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
import fs from "fs";
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
    if (!eventPath || !fs.existsSync(eventPath)) return;
    const raw = fs.readFileSync(eventPath, "utf8");
    const evt = JSON.parse(raw);
    const inputs = evt?.inputs || {};
    const eventName = inputs.eventName || evt?.event_name || "issue_comment.created";
    const payload = await decodeEventPayload(inputs.eventPayload);
    const logger = {
      info: (...args) => console.log("[info]", ...args),
      ok: (msg, meta) => ({ logMessage: { diff: String(msg), type: "info" }, metadata: { message: String(msg), ...meta || {} } }),
      error: (msg, meta) => ({ logMessage: { diff: String(msg), type: "fatal" }, metadata: { message: String(msg), ...meta || {} } })
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