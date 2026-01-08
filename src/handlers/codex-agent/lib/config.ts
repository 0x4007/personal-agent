type PatResolution = {
  token: string;
  source: string;
};

const PAT_ENV_VARS = ["USER_PAT_FULL", "PAT_FULL", "USER_PAT"] as const;

export function resolvePatToken(): PatResolution {
  for (const key of PAT_ENV_VARS) {
    const value = process.env[key];
    if (value && value.trim()) {
      return { token: value.trim(), source: key };
    }
  }
  return { token: "", source: "" };
}

export function selectPatToken(): string {
  return resolvePatToken().token;
}

export function requirePatToken(opts?: { purpose?: string }): PatResolution {
  const resolution = resolvePatToken();
  if (!resolution.token) {
    const hint = PAT_ENV_VARS.join(" or ");
    const purpose = opts?.purpose ? ` for ${opts.purpose}` : "";
    throw new Error(`Missing PAT${purpose}. Set ${hint}.`);
  }
  return resolution;
}
