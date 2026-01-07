/* Local runner to execute the plugin logic after Actions input decoding.
 * Skips signature/eventPayload decompression by constructing Context directly.
 */
import { runPlugin } from "../src/index";
// Minimal logger + comment handler stubs compatible with our usage
const logger = {
    info: (...args) => console.log("[info]", ...args),
    ok: (msg, meta = {}) => {
        console.log("[ok]", msg, meta ?? "");
        return {
            logMessage: { diff: String(msg), type: "info" },
            metadata: { message: String(msg), ...meta },
        };
    },
    error: (msg, meta = {}) => {
        console.error("[error]", msg, meta ?? "");
        return {
            logMessage: { diff: String(msg), type: "fatal" },
            metadata: { message: String(msg), ...meta },
        };
    },
};
const commentHandler = {
    postComment: async (context, message) => {
        const body = (() => {
            if (typeof message === "string")
                return message;
            if (typeof message === "object" && message && "logMessage" in message) {
                return message.logMessage?.diff || message;
            }
            return message;
        })();
        console.log("[comment]", body);
        logger.info("[comment context]", context.eventName);
        return null;
    },
};
// Wrap fetch: stub when REAL_FETCH/REAL_PI unset; otherwise add timeout + logging
const originalFetch = globalThis.fetch;
const FETCH_TIMEOUT_MS = Number(process.env.FETCH_TIMEOUT_MS || 15000);
const shouldUseRealFetch = Boolean(process.env.REAL_FETCH || process.env.REAL_PI);
if (!shouldUseRealFetch) {
    globalThis.fetch = async (input, init) => {
        console.log("[stub fetch]", input, init?.method || "GET");
        const body = JSON.stringify({ ok: true, code: 200 });
        return new Response(body, { status: 200, headers: { "content-type": "application/json" } });
    };
}
else if (originalFetch) {
    globalThis.fetch = async (input, init) => {
        console.log("[fetch]", input, init?.method || "GET");
        const ac = new AbortController();
        const timer = setTimeout(() => ac.abort(new Error("timeout")), FETCH_TIMEOUT_MS);
        try {
            const res = await originalFetch(input, { ...(init || {}), signal: ac.signal });
            console.log("[fetch status]", res.status);
            return res;
        }
        finally {
            clearTimeout(timer);
        }
    };
}
const AGENT = process.env.AGENT_OWNER || "0x4007";
const OWNER = process.env.OWNER || "0x4007";
const REPO = process.env.REPO || "personal-agent";
const ISSUE = Number(process.env.ISSUE || 1);
const BODY = process.env.BODY || `@${AGENT} test local`;
async function main() {
    const context = {
        eventName: "issue_comment.created",
        payload: {
            comment: { user: { login: OWNER }, body: BODY, html_url: "https://local.test" },
            repository: { name: REPO, owner: { login: OWNER } },
            issue: { number: ISSUE },
        },
        env: {
            AGENT_OWNER: AGENT,
            UOS_AGENT_DISPATCH: "0",
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
