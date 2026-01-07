import "dotenv/config";
import { maybeFetchStyleExamples } from "../src/handlers/codex-agent/lib/github";
import { buildRichPrompt } from "../src/handlers/codex-agent/lib/prompt";
import { selectPatToken } from "../src/handlers/codex-agent/lib/config";
import { safeText } from "../src/handlers/codex-agent/lib/utils";
const logger = {
    info: (...args) => console.log("[info]", ...args),
    error: (...args) => console.error("[error]", ...args),
};
function printUsage() {
    console.log([
        "Usage:",
        "  bun scripts/simulate.ts <issue-url> [command...]",
        "",
        "Options:",
        "  --body <text>        Full comment body (must start with @AGENT_OWNER).",
        "  --command <text>     Command text appended after @AGENT_OWNER.",
        "  --comment-id <id>    Use an existing issue comment by id.",
        "  --actor <login>      Comment author login (defaults to AGENT_OWNER).",
        "  --agent <login>      Agent owner login (defaults to AGENT_OWNER env).",
        "  --prompt-only        Print the prompt without dispatching.",
    ].join("\n"));
}
function parseArgs(argv) {
    const options = { issueUrl: "", isPromptOnly: false };
    const positional = [];
    const optionHandlers = {
        "--body": (value) => {
            options.body = value;
        },
        "--command": (value) => {
            options.command = value;
        },
        "--comment-id": (value) => {
            options.commentId = value ? Number(value) : undefined;
        },
        "--actor": (value) => {
            options.actor = value;
        },
        "--agent": (value) => {
            options.agentOwner = value;
        },
    };
    const flagHandlers = {
        "--help": () => {
            printUsage();
            process.exit(0);
        },
        "-h": () => {
            printUsage();
            process.exit(0);
        },
        "--prompt-only": () => {
            options.isPromptOnly = true;
        },
    };
    let i = 0;
    while (i < argv.length) {
        const arg = argv[i];
        const flagHandler = flagHandlers[arg];
        if (flagHandler) {
            flagHandler();
            i += 1;
            continue;
        }
        const optionHandler = optionHandlers[arg];
        if (optionHandler) {
            optionHandler(argv[i + 1]);
            i += 2;
            continue;
        }
        positional.push(arg);
        i += 1;
    }
    if (positional.length > 0) {
        options.issueUrl = positional.shift() ?? "";
    }
    if (!options.command && positional.length > 0) {
        options.command = positional.join(" ").trim();
    }
    return options;
}
function parseIssueUrl(raw) {
    let url;
    try {
        url = new URL(raw);
    }
    catch {
        throw new Error(`Invalid URL: ${raw}`);
    }
    const trimmedPath = url.pathname.replace(/^\/+/, "").replace(/\/+$/, "");
    const parts = trimmedPath.split("/");
    if (parts.length < 4) {
        throw new Error(`Unsupported GitHub URL: ${raw}`);
    }
    const [owner, repo, type, number] = parts;
    const issueNumber = Number(number);
    if (!Number.isFinite(issueNumber)) {
        throw new Error(`Invalid issue number in URL: ${raw}`);
    }
    const isPrHint = type === "pull" || type === "pulls";
    return { owner, repo, issueNumber, isPrHint };
}
function buildGithubHeaders(token) {
    return {
        authorization: `Bearer ${token}`,
        accept: "application/vnd.github+json",
        "x-github-api-version": "2022-11-28",
    };
}
async function fetchGithubJson(url, token) {
    const resp = await fetch(url, { headers: buildGithubHeaders(token) });
    if (!resp.ok) {
        const text = await safeText(resp);
        throw new Error(`GitHub API ${resp.status} for ${url}: ${text}`);
    }
    return resp.json();
}
async function fetchIssueData(ref, token) {
    if (!token) {
        return { isPr: ref.isPrHint };
    }
    try {
        const url = `https://api.github.com/repos/${ref.owner}/${ref.repo}/issues/${ref.issueNumber}`;
        const issue = (await fetchGithubJson(url, token));
        return {
            isPr: Boolean(issue.pull_request) || ref.isPrHint,
            title: issue.title,
            htmlUrl: issue.html_url,
        };
    }
    catch (error) {
        logger.info("[simulate] Issue fetch failed, using URL hint", { error: String(error) });
        return { isPr: ref.isPrHint };
    }
}
async function fetchIssueCommentById(ref, commentId, token) {
    const url = `https://api.github.com/repos/${ref.owner}/${ref.repo}/issues/comments/${commentId}`;
    return (await fetchGithubJson(url, token));
}
function startsWithMention(body, agentOwner) {
    const trimmed = body.trim().toLowerCase();
    const mention = `@${agentOwner}`.toLowerCase();
    return trimmed.startsWith(mention);
}
async function fetchLatestMentionComment(ref, agentOwner, token) {
    const url = `https://api.github.com/repos/${ref.owner}/${ref.repo}/issues/${ref.issueNumber}/comments?per_page=100&sort=updated&direction=desc`;
    const comments = (await fetchGithubJson(url, token));
    for (const comment of comments) {
        if (comment?.body && startsWithMention(comment.body, agentOwner)) {
            return comment;
        }
    }
    return null;
}
function parseCommandFromBody(body, agentOwner) {
    const trimmed = body.trim();
    const mention = `@${agentOwner}`;
    if (!trimmed.toLowerCase().startsWith(mention.toLowerCase())) {
        throw new Error(`Comment must start with @${agentOwner}`);
    }
    const command = trimmed
        .slice(mention.length)
        .replace(/^[:,]?\s+/, "")
        .trim();
    if (!command) {
        throw new Error("No command provided after the @mention");
    }
    return command;
}
async function resolveCommentBody(params) {
    const { options, ref, agentOwner, token } = params;
    if (options.body) {
        return { body: options.body, actor: options.actor ?? agentOwner };
    }
    if (options.command) {
        return { body: `@${agentOwner} ${options.command}`, actor: options.actor ?? agentOwner };
    }
    if (!token) {
        throw new Error("Missing GitHub token. Set GITHUB_TOKEN or PAT_* envs, or provide --body/--command.");
    }
    if (options.commentId && Number.isFinite(options.commentId)) {
        const comment = await fetchIssueCommentById(ref, options.commentId, token);
        return {
            body: comment.body ?? "",
            actor: comment.user?.login ?? agentOwner,
            htmlUrl: comment.html_url,
        };
    }
    const latest = await fetchLatestMentionComment(ref, agentOwner, token);
    if (!latest) {
        throw new Error(`No issue comment starts with @${agentOwner}. Pass --body, --command, or --comment-id.`);
    }
    return {
        body: latest.body ?? "",
        actor: latest.user?.login ?? agentOwner,
        htmlUrl: latest.html_url,
    };
}
async function main() {
    const options = parseArgs(process.argv.slice(2));
    if (!options.issueUrl) {
        printUsage();
        process.exit(1);
    }
    const agentOwner = options.agentOwner ?? process.env.AGENT_OWNER ?? "";
    if (!agentOwner) {
        throw new Error("Missing AGENT_OWNER. Set env or pass --agent.");
    }
    const ref = parseIssueUrl(options.issueUrl);
    const token = selectPatToken({ isSelf: true }) || null;
    const issue = await fetchIssueData(ref, token);
    const resolved = await resolveCommentBody({ options, ref, agentOwner, token });
    const command = parseCommandFromBody(resolved.body, agentOwner);
    const isSelf = resolved.actor.toLowerCase() === agentOwner.toLowerCase();
    const accessLevel = isSelf ? "full" : "read-only";
    const isMinimalEnv = process.env.PROMPT_MINIMAL === "1" || process.env.UOS_PROMPT_MINIMAL === "1" || process.env.PI_MINIMAL === "1";
    const styleExamples = isMinimalEnv ? [] : await maybeFetchStyleExamples({ login: agentOwner, owner: ref.owner, repo: ref.repo, logger });
    const richPrompt = buildRichPrompt({
        accessLevel,
        isPr: issue.isPr,
        owner: ref.owner,
        repo: ref.repo,
        issueNumber: ref.issueNumber,
        sender: resolved.actor,
        agentOwner,
        command,
        styleExamples,
    });
    const isMinimal = isMinimalEnv;
    let prompt = isMinimal ? command : richPrompt;
    const promptMaxLenRaw = Number(process.env.PROMPT_MAX_LEN || 0);
    const promptMaxLen = Number.isFinite(promptMaxLenRaw) && promptMaxLenRaw > 0 ? Math.floor(promptMaxLenRaw) : 0;
    if (!isMinimal && promptMaxLen > 0 && prompt.length > promptMaxLen) {
        logger.info("[simulate] Prompt exceeds PROMPT_MAX_LEN; falling back to minimal", { length: prompt.length, max: promptMaxLen });
        prompt = command;
    }
    console.log(`\n[simulate] ${ref.owner}/${ref.repo}#${ref.issueNumber} actor=${resolved.actor} mode=${accessLevel}\n`);
    console.log("----- PROMPT -----");
    console.log(prompt);
    if (!options.isPromptOnly) {
        console.log("\n[simulate] Prompt-only mode: dispatch is handled by the workflow in GitHub.");
        console.log("[simulate] To test live, comment on the issue or use the workflow_dispatch API.");
    }
}
main().catch((error) => {
    console.error("[simulate error]", error);
    process.exit(1);
});
