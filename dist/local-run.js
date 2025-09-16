var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/handlers/codex-agent.ts
var codex_agent_exports = {};
__export(codex_agent_exports, {
  codexAgent: () => codexAgent
});
async function codexAgent(context) {
  const { logger: logger2, payload, env } = context;
  const sender = payload.comment.user?.login;
  const repo = payload.repository.name;
  const issueNumber = payload.issue.number;
  const isPR = Boolean(payload.issue?.pull_request);
  const owner = payload.repository.owner.login;
  const body = String(payload.comment.body || "");
  const agentOwner = env.AGENT_OWNER;
  const isReadOnly = (process.env.ACCESS_MODE || "read-only") === "read-only";
  const accessLevel = isReadOnly ? "read-only" : "full";
  logger2.info(`Executing codexAgent`, { sender, repo, issueNumber, owner, agentOwner, accessLevel });
  if (!body.trim().startsWith(`@${agentOwner}`)) {
    logger2.info(`Comment does not start with @${agentOwner}`, { body });
    return;
  }
  const command = body.trim().substring(`@${agentOwner}`.length).trim();
  if (!command) {
    await context.commentHandler.postComment(context, logger2.error("No command provided after username mention"));
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
    logger2.ok(`Pi handled Codex ${data.posted ? "and posted comment" : "without posting"}`);
  } catch (error) {
    logger2.error(`Pi Codex error: ${String(error)}`);
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
  }
});

// src/types/typeguards.ts
function isIssueCommentEvent(context) {
  return context.eventName === "issue_comment.created";
}

// src/index.ts
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
  const { logger: logger2, eventName } = context;
  if (isIssueCommentEvent(context)) {
    const codexAgent2 = await loadCodexAgent();
    return await codexAgent2(context);
  }
  logger2.error(`Unsupported event: ${eventName}`);
}

// scripts/local-run.ts
var logger = {
  info: (...args) => console.log("[info]", ...args),
  ok: (msg, meta) => {
    console.log("[ok]", msg, meta ?? "");
    return {
      logMessage: { diff: String(msg), type: "info" },
      metadata: { message: String(msg), ...meta }
    };
  },
  error: (msg, meta) => {
    console.error("[error]", msg, meta ?? "");
    return {
      logMessage: { diff: String(msg), type: "fatal" },
      metadata: { message: String(msg), ...meta }
    };
  }
};
var commentHandler = {
  postComment: async (_ctx, message) => {
    console.log("[comment]", typeof message === "string" ? message : message?.logMessage?.diff || message);
    return null;
  }
};
var originalFetch = globalThis.fetch;
var FETCH_TIMEOUT_MS = Number(process.env.FETCH_TIMEOUT_MS || 15e3);
if (!process.env.REAL_PI) {
  globalThis.fetch = (async (input, init) => {
    console.log("[stub fetch]", input, init?.method || "GET");
    const body = JSON.stringify({ ok: true, code: 200, posted: false });
    return new Response(body, { status: 200, headers: { "content-type": "application/json" } });
  });
} else if (originalFetch) {
  globalThis.fetch = (async (input, init) => {
    console.log("[fetch]", input, init?.method || "GET");
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(new Error("timeout")), FETCH_TIMEOUT_MS);
    try {
      const res = await originalFetch(input, { ...init || {}, signal: ac.signal });
      console.log("[fetch status]", res.status);
      return res;
    } finally {
      clearTimeout(timer);
    }
  });
}
var AGENT = process.env.AGENT_OWNER || "0x4007";
var OWNER = process.env.OWNER || "0x4007";
var REPO = process.env.REPO || "personal-agent";
var ISSUE = Number(process.env.ISSUE || 1);
var BODY = process.env.BODY || `@${AGENT} test local`;
async function main() {
  const context = {
    eventName: "issue_comment.created",
    payload: {
      comment: { user: { login: OWNER }, body: BODY, html_url: "http://local/test" },
      repository: { name: REPO, owner: { login: OWNER } },
      issue: { number: ISSUE }
    },
    env: {
      AGENT_OWNER: AGENT,
      PI_URL: process.env.PI_URL || "http://pi.local:3000"
    },
    logger,
    commentHandler
  };
  await runPlugin(context);
}
main().catch((e) => {
  console.error("[local-run error]", e);
  process.exit(1);
});
//# sourceMappingURL=local-run.js.map