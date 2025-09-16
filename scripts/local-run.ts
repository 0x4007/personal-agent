/* Local runner to execute the plugin logic after Actions input decoding.
 * Skips signature/eventPayload decompression by constructing Context directly.
 */
import { runPlugin } from "../src/index";

// Minimal logger + comment handler stubs compatible with our usage
const logger = {
  info: (...args: any[]) => console.log("[info]", ...args),
  ok: (msg: any, meta?: any) => {
    console.log("[ok]", msg, meta ?? "");
    return {
      logMessage: { diff: String(msg), type: "info" },
      metadata: { message: String(msg), ...meta },
    };
  },
  error: (msg: any, meta?: any) => {
    console.error("[error]", msg, meta ?? "");
    return {
      logMessage: { diff: String(msg), type: "fatal" },
      metadata: { message: String(msg), ...meta },
    };
  },
};

const commentHandler = {
  postComment: async (_ctx: any, message: any) => {
    console.log("[comment]", typeof message === "string" ? message : message?.logMessage?.diff || message);
    return null;
  },
};

// Wrap fetch: stub when REAL_PI unset; otherwise add timeout + logging
const originalFetch: typeof fetch | undefined = (globalThis as any).fetch;
const FETCH_TIMEOUT_MS = Number(process.env.FETCH_TIMEOUT_MS || 15000);

if (!process.env.REAL_PI) {
  (globalThis as any).fetch = (async (input: any, init?: any) => {
    console.log("[stub fetch]", input, init?.method || "GET");
    const body = JSON.stringify({ ok: true, code: 200, posted: false });
    return new Response(body, { status: 200, headers: { "content-type": "application/json" } });
  }) as any;
} else if (originalFetch) {
  (globalThis as any).fetch = (async (input: any, init?: any) => {
    console.log("[fetch]", input, init?.method || "GET");
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(new Error("timeout")), FETCH_TIMEOUT_MS);
    try {
      const res = await originalFetch(input, { ...(init || {}), signal: ac.signal });
      console.log("[fetch status]", res.status);
      return res;
    } finally {
      clearTimeout(timer);
    }
  }) as any;
}

const AGENT = process.env.AGENT_OWNER || "0x4007";
const OWNER = process.env.OWNER || "0x4007";
const REPO = process.env.REPO || "personal-agent";
const ISSUE = Number(process.env.ISSUE || 1);
const BODY = process.env.BODY || `@${AGENT} test local`;

async function main() {
  const context: any = {
    eventName: "issue_comment.created",
    payload: {
      comment: { user: { login: OWNER }, body: BODY, html_url: "http://local/test" },
      repository: { name: REPO, owner: { login: OWNER } },
      issue: { number: ISSUE },
    },
    env: {
      AGENT_OWNER: AGENT,
      PI_URL: process.env.PI_URL || "http://pi.local:3000",
    },
    logger,
    commentHandler,
  };

  await runPlugin(context);
}

main().catch((e) => {
  console.error("[local-run error]", e);
  process.exit(1);
});
