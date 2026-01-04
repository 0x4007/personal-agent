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
