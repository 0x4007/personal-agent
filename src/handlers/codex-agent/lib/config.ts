const DEFAULT_AI_MARKER = "<!-- pa:ai -->";

export function getEnvString(name: string, fallback = ""): string {
  const raw = typeof process !== "undefined" ? process.env[name] : undefined;
  const val = String(raw ?? "").trim();
  return val || fallback;
}

export function getEnvNumber(name: string, fallback?: number): number | undefined {
  const raw = getEnvString(name);
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

export function getReplyMarker(): string {
  return getEnvString("UOS_REPLY_MARKER", DEFAULT_AI_MARKER);
}

export function selectWriteToken(): string {
  return (
    getEnvString("USER_PAT") ||
    getEnvString("USER_PAT_FULL") ||
    getEnvString("PAT_FULL") ||
    getEnvString("PAT") ||
    getEnvString("PLUGIN_GITHUB_TOKEN") ||
    getEnvString("GITHUB_TOKEN")
  );
}

export function selectReadToken(): string {
  return (
    getEnvString("USER_PAT") ||
    getEnvString("USER_PAT_READ") ||
    getEnvString("PAT_READ") ||
    getEnvString("USER_PAT_FULL") ||
    getEnvString("PAT_FULL") ||
    getEnvString("PAT") ||
    getEnvString("PLUGIN_GITHUB_TOKEN") ||
    getEnvString("GITHUB_TOKEN")
  );
}
