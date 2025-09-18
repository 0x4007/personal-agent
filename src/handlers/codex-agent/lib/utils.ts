export function toObject(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

export function toNumber(v: unknown): number | undefined {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

export function toStringOrUndefined(v: unknown): string | undefined {
  if (typeof v === "string") return v;
  if (v != null) return String(v);
  return undefined;
}

export async function safeText(resp: Response): Promise<string> {
  try {
    return await resp.text();
  } catch {
    return "";
  }
}

export function safeStringify(obj: unknown): string {
  try {
    return JSON.stringify(obj);
  } catch {
    return String(obj);
  }
}

export function stripUrlFields(value: unknown): unknown {
  // Remove only keys that end with "_url" (e.g., html_url, forks_url),
  // but keep keys named exactly "url".
  const redundantUrlKey = /_url$/i;
  if (Array.isArray(value)) {
    return value.map(stripUrlFields);
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (redundantUrlKey.test(k)) continue; // strip *_url
      out[k] = stripUrlFields(v);
    }
    return out;
  }
  return value;
}
