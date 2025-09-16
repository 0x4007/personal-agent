/* Local runner to execute the plugin logic after Actions input decoding.
 * Skips signature/eventPayload decompression by constructing Context directly.
 */
import { runPlugin } from "../src/index";

// Minimal logger + comment handler stubs compatible with our usage
const logger = {
  info: (...args: any[]) => console.log("[info]", ...args),
  ok: (msg: any, meta?: any) => ({
    logMessage: { diff: String(msg), type: "info" },
    metadata: { message: String(msg), ...meta },
  }),
  error: (msg: any, meta?: any) => ({
    logMessage: { diff: String(msg), type: "fatal" },
    metadata: { message: String(msg), ...meta },
  }),
};

const commentHandler = {
  postComment: async (_ctx: any, message: any) => {
    console.log("[comment]", typeof message === "string" ? message : message?.logMessage?.diff || message);
    return null;
  },
};

// Optional: stub fetch unless REAL_PI is set
if (!process.env.REAL_PI) {
  globalThis.fetch = (async (input: any, init?: any) => {
    console.log("[stub fetch]", input);
    const body = JSON.stringify({ ok: true, code: 200, posted: false });
    return new Response(body, { status: 200, headers: { "content-type": "application/json" } });
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
