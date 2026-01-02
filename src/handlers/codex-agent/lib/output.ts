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

export function sanitizeReply(raw: string, owner: string): string {
  const marker = getReplyMarker();
  let out = String(raw || "")
    .replace(/\r\n/g, "\n")
    .trim();
  if (!out) return "";
  if (marker) out = out.replace(marker, "").trim();
  out = stripLeadingMention(out);
  out = stripOwnerMentions(out, owner);
  const maxChars = Math.max(200, Math.min(12000, Math.floor(getEnvNumber("UOS_REPLY_MAX_CHARS", 6000) ?? 6000)));
  if (out.length > maxChars) out = out.slice(0, maxChars).trimEnd() + "...";
  return out.trim();
}

export function appendReplyMarker(body: string): string {
  const marker = getReplyMarker();
  if (!marker) return body;
  if (body.includes(marker)) return body;
  return `${body}\n\n${marker}`.trim();
}
