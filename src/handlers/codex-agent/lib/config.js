const PAT_ENV_VARS = ["USER_PAT_FULL", "PAT_FULL", "USER_PAT"];
export function resolvePatToken(_opts) {
    for (const key of PAT_ENV_VARS) {
        const value = process.env[key];
        if (value && value.trim()) {
            return { token: value.trim(), source: key };
        }
    }
    return { token: "", source: "" };
}
export function selectPatToken(opts) {
    return resolvePatToken(opts).token;
}
export function requirePatToken(opts) {
    const resolution = resolvePatToken(opts);
    if (!resolution.token) {
        const hint = PAT_ENV_VARS.join(" or ");
        throw new Error(`Missing PAT${opts.purpose ? ` for ${opts.purpose}` : ""}. Set ${hint}.`);
    }
    return resolution;
}
export function selectWriteToken() {
    return requirePatToken({ isSelf: true, purpose: "write operations" }).token;
}
