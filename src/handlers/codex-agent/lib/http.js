export async function fetchWithTimeoutRetry(url, init, retries = 1) {
    const ctl = new AbortController();
    const t = init.timeout && init.timeout > 0 ? setTimeout(() => ctl.abort("timeout"), Math.floor(init.timeout)) : undefined;
    try {
        return await fetch(url, { ...init, signal: ctl.signal });
    }
    catch (err) {
        if (retries > 0) {
            const msg = String(err || "");
            // Retry only on network/timeout errors
            if (msg.includes("timeout") || msg.includes("fetch") || msg.includes("network")) {
                await new Promise((r) => setTimeout(r, 1000));
                return await fetchWithTimeoutRetry(url, init, retries - 1);
            }
        }
        throw err;
    }
    finally {
        if (t)
            clearTimeout(t);
    }
}
