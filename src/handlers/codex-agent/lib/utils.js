export function toObject(v) {
    return v && typeof v === "object" ? v : {};
}
export function toNumber(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
}
export function toStringOrUndefined(v) {
    if (typeof v === "string")
        return v;
    if (v != null)
        return String(v);
    return undefined;
}
export async function safeText(resp) {
    try {
        return await resp.text();
    }
    catch {
        return "";
    }
}
export function safeStringify(obj) {
    try {
        return JSON.stringify(obj);
    }
    catch {
        return String(obj);
    }
}
export function stripUrlFields(value) {
    // Remove only keys that end with "_url" (e.g., html_url, forks_url),
    // but keep keys named exactly "url".
    const redundantUrlKey = /_url$/i;
    if (Array.isArray(value)) {
        return value.map(stripUrlFields);
    }
    if (value && typeof value === "object") {
        const out = {};
        for (const [k, v] of Object.entries(value)) {
            if (redundantUrlKey.test(k))
                continue; // strip *_url
            out[k] = stripUrlFields(v);
        }
        return out;
    }
    return value;
}
