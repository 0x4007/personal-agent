export function parseMentionEnv(val: string | undefined): boolean | string {
  if (val === undefined || val === "") return false;
  const s = String(val).toLowerCase().trim();
  if (s === "false" || s === "0" || s === "no" || s === "off") return false;
  if (s === "true" || s === "1" || s === "yes" || s === "on") return true;
  // any other non-empty string -> pass through (server may treat as custom mention)
  return val;
}

export function selectPatToken(opts: { isSelf: boolean }): string {
  const { isSelf } = opts;
  // Prefer explicit PAT secrets; fall back to PLUGIN_GITHUB_TOKEN as last resort
  if (isSelf) {
    return process.env.USER_PAT_FULL || process.env.PAT_FULL || process.env.USER_PAT || process.env.PLUGIN_GITHUB_TOKEN || process.env.GITHUB_TOKEN || "";
  }
  return process.env.USER_PAT_READ || process.env.PAT_READ || process.env.USER_PAT || process.env.PLUGIN_GITHUB_TOKEN || process.env.GITHUB_TOKEN || "";
}

export function selectWriteToken(): string {
  return selectPatToken({ isSelf: true });
}
