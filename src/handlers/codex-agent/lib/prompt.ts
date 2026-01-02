import { getEnvNumber, getEnvString } from "./config";
import { IssueContext, StyleExample } from "./github";

export type PromptMessages = Array<{ role: "system" | "user"; content: string }>;

function truncate(value: string, maxChars: number): string {
  if (value.length <= maxChars) return value;
  return value.slice(0, maxChars).trimEnd() + "...";
}

function formatStyleExamples(examples: StyleExample[]): string[] {
  if (!examples.length) return [];
  const maxChars = Math.max(120, Math.min(800, Math.floor(getEnvNumber("UOS_STYLE_EXAMPLE_MAX_CHARS", 320) ?? 320)));
  const out = ["Style examples (match tone and structure; do not quote verbatim):"];
  examples.forEach((ex, idx) => {
    const body = truncate(ex.body.replace(/\s+/g, " ").trim(), maxChars);
    const meta = ex.repo ? ` (${ex.repo})` : "";
    out.push(`${idx + 1}) ${body}${meta}`);
  });
  return out;
}

function formatIssueContext(args: { owner: string; repo: string; issueNumber: number; isPr: boolean; context: IssueContext | null }): string[] {
  const { owner, repo, issueNumber, isPr, context } = args;
  if (!context) return [];
  const lines: string[] = [];
  lines.push("Issue context:");
  lines.push(`- Repo: ${owner}/${repo}`);
  lines.push(`- ${isPr ? "PR" : "Issue"} #${issueNumber}: ${context.issue.title ?? "(no title)"}`);
  lines.push(`- State: ${context.issue.state ?? "unknown"}`);
  if (context.issue.labels.length) {
    lines.push(`- Labels: ${context.issue.labels.join(", ")}`);
  }
  if (context.issue.body) {
    lines.push("- Body:");
    lines.push(truncate(context.issue.body, Math.max(300, Math.min(4000, Math.floor(getEnvNumber("UOS_CONTEXT_BODY_MAX_CHARS", 1200) ?? 1200)))));
  }
  if (context.pr) {
    lines.push(`- PR: ${context.pr.draft ? "draft" : "ready"}, merged=${context.pr.merged}`);
    lines.push(`- Base: ${context.pr.base ?? "?"}, Head: ${context.pr.head ?? "?"}`);
    if (context.pr.changed_files !== undefined) {
      lines.push(`- Changes: +${context.pr.additions ?? 0}/-${context.pr.deletions ?? 0} across ${context.pr.changed_files ?? 0} files`);
    }
  }
  if (context.comments.length) {
    lines.push("Recent comments:");
    const maxComments = Math.max(1, Math.min(15, Math.floor(getEnvNumber("UOS_CONTEXT_COMMENT_SHOW", 8) ?? 8)));
    context.comments.slice(-maxComments).forEach((comment) => {
      if (!comment.body) return;
      const author = comment.author ? `@${comment.author}` : "(unknown)";
      lines.push(`- ${author}: ${comment.body}`);
    });
  }
  return lines;
}

export function buildPromptMessages(args: {
  agentOwner: string;
  sender?: string;
  owner: string;
  repo: string;
  issueNumber: number;
  isPr: boolean;
  command: string;
  issueContext: IssueContext | null;
  styleExamples: StyleExample[];
}): PromptMessages {
  const { agentOwner, sender, owner, repo, issueNumber, isPr, command, issueContext, styleExamples } = args;
  const voice = getEnvString("UOS_VOICE_GUIDE", "");

  const systemLines: string[] = [];
  systemLines.push(`You are ${agentOwner}. Write in ${agentOwner}'s voice and perspective.`);
  systemLines.push("You are replying on GitHub as the account owner. Act as them.");
  systemLines.push("Do not claim to have executed commands or made changes unless explicitly provided in context.");
  systemLines.push("Do not start the reply with an @mention. Avoid @mentioning the owner anywhere.");
  systemLines.push("Keep it concise, direct, and technically precise. Avoid fluff or AI disclaimers.");
  systemLines.push("Use GitHub-flavored Markdown for readability (lists, checklists, code fences).");
  systemLines.push("If the request is ambiguous, ask exactly one clarifying question.");
  if (voice) {
    systemLines.push("Voice notes:");
    systemLines.push(voice);
  }

  systemLines.push(...formatStyleExamples(styleExamples));
  systemLines.push(...formatIssueContext({ owner, repo, issueNumber, isPr, context: issueContext }));

  if (sender) {
    systemLines.push(`Requester: @${sender}`);
  }

  const system = systemLines.join("\n").trim();
  const user = `Request:\n${command}`.trim();

  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}
