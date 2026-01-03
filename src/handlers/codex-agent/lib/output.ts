import { getEnvNumber, getReplyMarker } from "./config";

function stripLeadingMention(text: string): string {
  return text.replace(/^@[^\s]+\s+/, "");
}

function stripOwnerMentions(text: string, owner: string): string {
  if (!owner) return text;
  try {
    const re = new RegExp(`@${owner.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "ig");
    return text.replace(re, owner);
  } catch {
    return text;
  }
}

const TOOL_MARKER_RE =
  /(multi_tool_use|assistant to=|to=shell|to=functions\.|exec_command|write_stdin|apply_patch|update_plan|tool call|call tool|tools available)/i;
const META_LABEL_RE = /^(analysis|reasoning|thinking|assistant|system|user|developer|command|action):/i;
const FILLER_LINE_RE = /^(ok|okay|sure|alright|all right|cool|thanks|great|proceeding|done)\.?$/i;
const META_ACTION_RE = /\b(i(?:'m| am)? going to|i will|i'll|let's|lets)\b.*\b(run|execute|call|invoke)\b/i;
const META_ACTION_CONTEXT_RE = /\b(tool|tools|shell|command|rg|grep|ripgrep|ls|cat|git|npm|bun|deno|curl|apply_patch|exec_command|write_stdin|update_plan)\b/i;

function splitSentences(text: string): string[] {
  return text.split(/(?<=[.!?])\s+/).filter(Boolean);
}

function stripToolChatter(text: string): { text: string; hadToolChatter: boolean } {
  const hasNewlines = text.includes("\n");
  const parts = hasNewlines ? text.split("\n") : splitSentences(text);
  let hasRemoved = false;
  const kept = parts.filter((part) => {
    const line = part.trim();
    if (!line) return false;
    if (META_LABEL_RE.test(line)) {
      hasRemoved = true;
      return false;
    }
    if (FILLER_LINE_RE.test(line)) {
      hasRemoved = true;
      return false;
    }
    if (TOOL_MARKER_RE.test(line)) {
      hasRemoved = true;
      return false;
    }
    if (META_ACTION_RE.test(line) && META_ACTION_CONTEXT_RE.test(line)) {
      hasRemoved = true;
      return false;
    }
    return true;
  });
  return {
    text: kept.join(hasNewlines ? "\n" : " ").trim(),
    hadToolChatter: hasRemoved,
  };
}

function extractAssistantSegment(text: string): { text: string; hadTranscript: boolean } {
  const match = /(?:^|\n)\s*assistant:\s*/gi;
  let lastIndex = -1;
  let m: RegExpExecArray | null;
  while ((m = match.exec(text))) {
    lastIndex = m.index + m[0].length;
  }
  if (lastIndex === -1) return { text, hadTranscript: false };
  return { text: text.slice(lastIndex).trim(), hadTranscript: true };
}

function limitToLastSentences(text: string, count: number): string {
  const sentences = splitSentences(text);
  if (sentences.length <= count) return text;
  return sentences.slice(-count).join(" ").trim();
}

export function sanitizeReply(raw: string, owner: string): string {
  const marker = getReplyMarker();
  let out = String(raw || "")
    .replace(/\r\n/g, "\n")
    .trim();
  if (!out) return "";
  if (marker) out = out.replace(marker, "").trim();
  const assistantSegment = extractAssistantSegment(out);
  out = assistantSegment.text;
  const toolStripped = stripToolChatter(out);
  out = toolStripped.text;
  out = stripLeadingMention(out);
  out = stripOwnerMentions(out, owner);
  if (assistantSegment.hadTranscript || toolStripped.hadToolChatter) {
    out = limitToLastSentences(out, 2);
  }
  const configuredMax = Math.max(200, Math.min(12000, Math.floor(getEnvNumber("UOS_REPLY_MAX_CHARS", 6000) ?? 6000)));
  const maxChars = Math.min(600, configuredMax);
  if (out.length > maxChars) out = out.slice(0, maxChars).trimEnd() + "...";
  return out.trim();
}

export function appendReplyMarker(body: string): string {
  const marker = getReplyMarker();
  if (!marker) return body;
  if (body.includes(marker)) return body;
  return `${body}\n\n${marker}`.trim();
}
