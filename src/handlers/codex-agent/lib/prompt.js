import { fetchRepoLabels } from "./github";
import { selectPatToken } from "./config";
import { safeStringify, stripUrlFields } from "./utils";
function formatStyleExamples(examples, agentOwner) {
    if (!examples.length)
        return "";
    const lines = examples.map((example) => {
        const meta = [];
        if (example.repo)
            meta.push(example.repo);
        if (example.createdAt)
            meta.push(example.createdAt.slice(0, 10));
        const prefix = meta.length ? `(${meta.join(", ")}) ` : "";
        return `- ${prefix}${example.body}`;
    });
    return `Writing style samples from @${agentOwner} (for tone only; do not quote verbatim):\n${lines.join("\n")}`;
}
export function buildRichPrompt(args) {
    const { accessLevel, isPr, owner, repo, issueNumber, sender, agentOwner, command, styleExamples } = args;
    const styleBlock = formatStyleExamples(styleExamples ?? [], agentOwner);
    const base = `
  [mode:${accessLevel}] [type:${isPr ? "pr" : "issue"}] repo:${owner}/${repo} ${isPr ? "pr" : "issue"}:${issueNumber} actor:${sender}
  Environment: Linux shell with GitHub CLI (gh) available and authenticated with a GitHub token.
  You are a GitHub assistant. You always return a single GitHub comment (no preamble, no wrappers).
  You are ${agentOwner}. Write in ${agentOwner}'s voice and perspective.

  User request:
  ${command}${styleBlock ? "\n\n" + styleBlock : ""}

  Output Contract:
  - Output only the final comment text to post on GitHub.
  - Do NOT include role labels (assistant:, system:, user:), system messages, logs, markers (e.g., GH_*_OK), transcripts, or thinking.
  - Do NOT @mention any user or team (avoid loops). If you must reference a handle, render as plain text or code.

  Style and Formatting (GitHub-flavored Markdown):
  - Use short headings to structure longer replies only when helpful.
  - Prefer bullet lists for enumerations; use one bullet per item.
    - Never compress many items into one bullet via hyphens/commas; use multiple bullets instead.
    - For 12+ similar items, a compact table is allowed if it improves scanability.
  - Use checklists for actionable tasks (e.g., "- [ ] Step").
  - Use code fences for commands, code, diffs, or JSON (\`\`\`bash, \`\`\`ts, \`\`\`json, \`\`\`diff).
  - Do NOT wrap the entire response in a code block; only fence code/diff/json snippets.
  - Link concisely with Markdown links or short refs (owner/repo#123). Avoid dumping long raw URLs.
  - Keep paragraphs short (1-3 sentences). Prefer lists/tables for dense info. Do not paste huge raw JSON.
  - Keep it concise: target about 800 characters unless a longer list is explicitly requested.

  Content Rules:
  - Always prefer live reads over inference: if the answer depends on repository data (labels, files, commits, diffs, milestones, prices, etc.), use gh or the GitHub API to read it first; do not guess or invent values.
  - Summarize results; do not echo command lines or transcripts.
  - If context is insufficient or shell access fails, state the single additional input or permission you need in one line, then proceed with what can be done now.
  - When asked for a plan, produce a short, numbered list (5-8 items max), each one line.
  - When asked for acceptance criteria, use bullets with clear, testable statements (concise Given/When/Then is fine).

  Safety and Etiquette:
  - No secrets or tokens.
  - Do not self-trigger loops (no mentions in output).

  Produce only the final GitHub comment now.`;
    return base.replace(/\n\s+/g, "\n");
}
function wrapJson(json) {
    // Wrap in fenced block to preserve structure in LLM prompt
    return json ? "```json\n" + json + "\n```" : "";
}
export async function buildFullPrompt(args) {
    const { richPrompt, command, payload, fetchedContext, owner, repo, isSelf, logger } = args;
    const minimalPrompt = command;
    const isMinimal = process.env.PROMPT_MINIMAL === "1" || process.env.UOS_PROMPT_MINIMAL === "1" || process.env.PI_MINIMAL === "1";
    const doesIncludeEventJson = process.env.PROMPT_INCLUDE_EVENT === "1" || process.env.INCLUDE_GH_EVENT === "1";
    const shouldStrip = (process.env.PROMPT_STRIP_URLS ?? "1") === "1";
    let eventForPrompt = undefined;
    if (doesIncludeEventJson) {
        eventForPrompt = shouldStrip ? stripUrlFields(payload) : payload;
    }
    const eventJson = doesIncludeEventJson ? safeStringify(eventForPrompt) : "";
    const contextJson = fetchedContext ? safeStringify(stripUrlFields(fetchedContext)) : "";
    const basePrompt = isMinimal ? minimalPrompt : richPrompt;
    let prompt = basePrompt;
    // Optional: prefetch repository labels to include in the prompt (disabled by default)
    const shouldFetchLabels = process.env.PROMPT_FETCH_LABELS === "1";
    if (contextJson) {
        prompt += `\n\nGitHub context (prefetched):\n\n${wrapJson(contextJson)}`;
    }
    if (shouldFetchLabels) {
        try {
            const token = selectPatToken({ isSelf: Boolean(isSelf) });
            const repoLabels = await fetchRepoLabels({ owner, repo, token });
            if (repoLabels.length) {
                const labelsJson = safeStringify(repoLabels);
                prompt += `\n\nRepository labels (prefetched):\n\n${wrapJson(labelsJson)}`;
            }
        }
        catch (e) {
            logger.info("[codexAgent] Prefetch labels failed (non-fatal)", { error: String(e) });
        }
    }
    if (doesIncludeEventJson) {
        prompt += `\n\nFull GitHub event JSON (verbatim):\n\n${wrapJson(eventJson)}`;
    }
    return { prompt, eventJson, contextJson, isMinimal };
}
