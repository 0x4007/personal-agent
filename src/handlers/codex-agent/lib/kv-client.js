let kvClientPromise = null;
function getEnvValue(key) {
    if (typeof process !== "undefined" && process.env) {
        const value = process.env[key];
        if (value !== undefined)
            return value;
    }
    const deno = globalThis.Deno;
    if (deno?.env?.get)
        return deno.env.get(key);
    return undefined;
}
function resolveKvUrl() {
    const raw = getEnvValue("UOS_AGENT_MEMORY_URL");
    if (!raw)
        return null;
    const trimmed = raw.trim().replace(/\/+$/, "");
    if (!trimmed)
        return null;
    return trimmed.endsWith("/kv") ? trimmed : `${trimmed}/kv`;
}
function isRecord(value) {
    return typeof value === "object" && value !== null;
}
function looksLikeKvLike(value) {
    if (!isRecord(value))
        return false;
    return typeof value.get === "function" && typeof value.set === "function" && typeof value.list === "function";
}
function encodeKeyPart(part) {
    if (typeof part === "string")
        return part;
    if (typeof part === "number" || typeof part === "bigint")
        return String(part);
    if (typeof part === "boolean")
        return part ? "true" : "false";
    return String(part);
}
function buildKeyPath(key) {
    return key.map((part) => encodeURIComponent(encodeKeyPart(part))).join("/");
}
function createPiKvClient(baseUrl) {
    const base = baseUrl.replace(/\/+$/, "");
    async function fetchJson(url, init) {
        const res = await fetch(url, {
            ...init,
            headers: {
                "content-type": "application/json",
                ...(init.headers ?? {}),
            },
        });
        if (!res.ok) {
            const text = await res.text().catch(() => "");
            throw new Error(`Pi KV request failed (${res.status}): ${text}`);
        }
        return (await res.json());
    }
    return {
        supportsReverse: false,
        async get(key) {
            const url = `${base}/${buildKeyPath(key)}`;
            const response = await fetchJson(url, { method: "GET" });
            const hasValue = Object.prototype.hasOwnProperty.call(response, "value");
            return { value: hasValue ? response.value : null };
        },
        async set(key, value, options) {
            const url = `${base}/${buildKeyPath(key)}`;
            const payload = { value };
            if (options?.expireIn !== undefined)
                payload.expireIn = options.expireIn;
            await fetchJson(url, { method: "POST", body: JSON.stringify(payload) });
            return null;
        },
        list(selector, options = {}) {
            if (options.reverse) {
                throw new Error("Pi KV does not support reverse iteration");
            }
            // Note: Pi KV list returns a single page; use iterator.cursor to paginate.
            const payload = {
                prefix: selector.prefix,
                limit: options.limit,
                cursor: options.cursor,
            };
            const url = `${base}/list`;
            const iterator = {
                cursor: "",
                async *[Symbol.asyncIterator]() {
                    const response = await fetchJson(url, {
                        method: "POST",
                        body: JSON.stringify(payload),
                    });
                    iterator.cursor = response.cursor ?? "";
                    for (const entry of response.entries ?? []) {
                        yield { key: entry.key, value: entry.value };
                    }
                },
            };
            return iterator;
        },
    };
}
export async function getKvClient(logger) {
    if (kvClientPromise)
        return kvClientPromise;
    kvClientPromise = (async () => {
        const memoryUrl = resolveKvUrl();
        if (memoryUrl) {
            return createPiKvClient(memoryUrl);
        }
        const deno = globalThis.Deno;
        if (!deno || typeof deno.openKv !== "function")
            return null;
        try {
            const kv = await deno.openKv();
            if (!looksLikeKvLike(kv))
                return null;
            return {
                get: kv.get.bind(kv),
                set: kv.set.bind(kv),
                list: kv.list.bind(kv),
                supportsReverse: true,
            };
        }
        catch (error) {
            if (logger?.debug)
                logger.debug({ err: error }, "Failed to open Deno KV (non-fatal)");
            return null;
        }
    })();
    return kvClientPromise;
}
