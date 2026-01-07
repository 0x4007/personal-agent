import { selectPatToken } from "./config";
import { toNumber, toObject, toStringOrUndefined, safeText, safeStringify } from "./utils";
export async function maybePrefetchContext(args) {
    const { logger, isSelf, owner, repo, issueNumber, isPr } = args;
    const isPrefetchEnabled = (process.env.PROMPT_FETCH_ISSUE ?? "1") === "1";
    if (!isPrefetchEnabled)
        return null;
    try {
        const token = selectPatToken({ isSelf: Boolean(isSelf) });
        return await fetchIssueContext({ owner, repo, issueNumber, isPr, token });
    }
    catch (e) {
        logger.info("[codexAgent] Prefetch failed (non-fatal)", { error: String(e) });
        return null;
    }
}
export async function createGithubComment(params, logger) {
    const { owner, repo, issueNumber, body, token } = params;
    if (!token)
        throw new Error("Missing GitHub token to create comment");
    const url = `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/comments`;
    const resp = await fetch(url, {
        method: "POST",
        headers: {
            authorization: `Bearer ${token}`,
            accept: "application/vnd.github+json",
            "content-type": "application/json",
            "x-github-api-version": "2022-11-28",
        },
        body: JSON.stringify({ body }),
    });
    if (!resp.ok) {
        const txt = await safeText(resp);
        throw new Error(`GitHub comment HTTP ${resp.status}: ${txt}`);
    }
    try {
        const json = (await resp.json());
        const id = Number(json.id);
        if (!Number.isFinite(id))
            return null;
        logger.info("[codexAgent] Created comment", { id });
        return { id };
    }
    catch {
        return null;
    }
}
export async function maybeCreatePlaceholderComment(args) {
    const { logger, isSelf, owner, repo, issueNumber } = args;
    try {
        const token = selectPatToken({ isSelf: Boolean(isSelf) });
        const placeholder = "Thinking...";
        const created = await createGithubComment({
            owner,
            repo,
            issueNumber,
            body: placeholder,
            token,
        }, logger);
        const id = created?.id ?? null;
        logger.info("[codexAgent] Created placeholder comment", { id });
        return id;
    }
    catch (e) {
        logger.info("[codexAgent] Placeholder comment creation failed (non-fatal)", { error: String(e) });
        return null;
    }
}
export async function fetchIssueContext(params) {
    const { owner, repo, issueNumber, isPr, token } = params;
    if (!token)
        throw new Error("Missing token for GitHub context fetch");
    const base = `https://api.github.com/repos/${owner}/${repo}`;
    const headers = {
        authorization: `Bearer ${token}`,
        accept: "application/vnd.github+json",
        "x-github-api-version": "2022-11-28",
    };
    async function getJson(url) {
        const r = await fetch(url, { headers });
        if (!r.ok)
            throw new Error(`${url} -> HTTP ${r.status}`);
        return r.json();
    }
    const issue = await getJson(`${base}/issues/${issueNumber}`);
    // comments can be many; fetch first page only to keep prompt small
    const comments = await getJson(`${base}/issues/${issueNumber}/comments?per_page=50`);
    let pr = null;
    if (isPr) {
        try {
            pr = await getJson(`${base}/pulls/${issueNumber}`);
        }
        catch {
            /* ignore */
        }
    }
    // Keep only concise fields
    const issueObj = toObject(issue);
    const slimIssue = {
        number: toNumber(issueObj.number) ?? issueNumber,
        title: toStringOrUndefined(issueObj.title),
        state: toStringOrUndefined(issueObj.state),
        author: toObject(issueObj.user).login,
        labels: Array.isArray(issueObj.labels)
            ? issueObj.labels.map((l) => (typeof l === "string" ? l : toStringOrUndefined(toObject(l).name))).filter((v) => Boolean(v))
            : [],
        body: toStringOrUndefined(issueObj.body),
        created_at: toStringOrUndefined(issueObj.created_at),
        updated_at: toStringOrUndefined(issueObj.updated_at),
        url: toStringOrUndefined(issueObj.url),
    };
    const slimComments = Array.isArray(comments)
        ? comments.map((c) => {
            const obj = toObject(c);
            return {
                author: toStringOrUndefined(toObject(obj.user).login),
                created_at: toStringOrUndefined(obj.created_at),
                body: toStringOrUndefined(obj.body),
                url: toStringOrUndefined(obj.url),
            };
        })
        : [];
    const prObj = pr && typeof pr === "object" ? pr : null;
    const slimPr = prObj
        ? {
            merged: Boolean(prObj.merged_at),
            draft: Boolean(prObj.draft),
            head: toStringOrUndefined(toObject(prObj.head).ref),
            base: toStringOrUndefined(toObject(prObj.base).ref),
            additions: toNumber(prObj.additions) ?? undefined,
            deletions: toNumber(prObj.deletions) ?? undefined,
            changed_files: toNumber(prObj.changed_files) ?? undefined,
            url: toStringOrUndefined(prObj.url),
        }
        : null;
    return { issue: slimIssue, comments: slimComments, pr: slimPr };
}
export async function fetchRepoLabels(params) {
    const { owner, repo, token } = params;
    const headers = {
        authorization: `Bearer ${token}`,
        accept: "application/vnd.github+json",
        "x-github-api-version": "2022-11-28",
    };
    const base = `https://api.github.com/repos/${owner}/${repo}/labels`;
    const out = [];
    let page = 1;
    for (let i = 0; i < 3; i++) {
        // fetch up to about 300 labels max
        const url = `${base}?per_page=100&page=${page}`;
        const r = await fetch(url, { headers });
        if (!r.ok)
            break;
        const arr = (await r.json());
        for (const l of arr) {
            const obj = toObject(l);
            out.push({ name: String(obj.name ?? ""), color: obj.color, description: obj.description });
        }
        if (arr.length < 100)
            break;
        page++;
    }
    // dedupe by name
    const seen = new Set();
    return out
        .filter((l) => {
        const key = l.name.toLowerCase();
        if (seen.has(key))
            return false;
        seen.add(key);
        return true;
    })
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
}
const STYLE_CACHE_VERSION = 1;
const DEFAULT_STYLE_CACHE_MARKER = "pa:style-cache";
const DEFAULT_REPLY_MARKER = "pa:ai";
const SENSITIVE_PATTERNS = [/-----BEGIN [A-Z ]*PRIVATE KEY-----/i, /private_key/i];
const STYLE_QUERY = `query($login: String!, $cursor: String) {
  user(login: $login) {
    issueComments(first: 50, after: $cursor, orderBy: { field: UPDATED_AT, direction: DESC }) {
      nodes { body createdAt updatedAt url repository { nameWithOwner } }
      pageInfo { hasNextPage endCursor }
    }
  }
}`;
function getEnvString(keys, fallback) {
    for (const key of keys) {
        const value = process.env[key];
        if (value !== undefined && value !== "")
            return value;
    }
    return fallback;
}
function getEnvNumber(keys, fallback) {
    const value = getEnvString(keys);
    if (value == null)
        return fallback;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}
function parseBool(value, fallback) {
    if (value == null || value === "")
        return fallback;
    const normalized = value.trim().toLowerCase();
    if (!normalized)
        return fallback;
    return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}
function parseOwnerRepo(value) {
    const trimmed = value.trim();
    if (!trimmed)
        return null;
    const parts = trimmed.split("/");
    if (parts.length < 2)
        return null;
    const owner = parts[0].trim();
    const repo = parts[1].trim();
    if (!owner || !repo)
        return null;
    return { owner, repo };
}
function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function safeJsonParse(value) {
    try {
        return JSON.parse(value);
    }
    catch {
        return null;
    }
}
function truncate(value, maxChars) {
    if (!value)
        return value;
    if (value.length <= maxChars)
        return value;
    return value.slice(0, maxChars).trimEnd() + "...";
}
function looksSensitive(value) {
    return SENSITIVE_PATTERNS.some((pattern) => pattern.test(value));
}
function parseDateMs(value) {
    if (!value)
        return null;
    const ms = Date.parse(value);
    return Number.isFinite(ms) ? ms : null;
}
function isPastLookback(updatedAtMs, minUpdatedAtMs) {
    if (minUpdatedAtMs === null || updatedAtMs === null)
        return false;
    return updatedAtMs < minUpdatedAtMs;
}
function shouldSkipStyleBody(body, markers) {
    if (markers.some((marker) => marker && body.includes(marker)))
        return true;
    return looksSensitive(body);
}
function normalizeStyleBody(body, maxChars) {
    const normalized = body.replace(/\s+/g, " ").trim();
    if (normalized.length < 40)
        return null;
    const trimmed = truncate(normalized, maxChars);
    return trimmed || null;
}
function normalizeStyleExamples(raw, maxChars) {
    if (!Array.isArray(raw))
        return [];
    const max = Math.max(120, Math.min(800, Math.floor(maxChars)));
    const examples = [];
    for (const item of raw) {
        const obj = toObject(item);
        const bodyRaw = toStringOrUndefined(obj.body);
        if (!bodyRaw)
            continue;
        const normalized = bodyRaw.replace(/\s+/g, " ").trim();
        if (!normalized)
            continue;
        const body = truncate(normalized, max);
        if (!body)
            continue;
        examples.push({
            body,
            createdAt: toStringOrUndefined(obj.createdAt) ?? "",
            url: toStringOrUndefined(obj.url),
            repo: toStringOrUndefined(obj.repo),
        });
    }
    return examples;
}
function buildHeaders(token) {
    return {
        authorization: `Bearer ${token}`,
        accept: "application/vnd.github+json",
        "content-type": "application/json",
        "x-github-api-version": "2022-11-28",
    };
}
function normalizeStyleSource(value) {
    if (!value)
        return null;
    const normalized = value.trim().toLowerCase();
    if (normalized === "vector-db" || normalized === "vector" || normalized === "vectordb")
        return "vector-db";
    if (normalized === "github" || normalized === "gh")
        return "github";
    return null;
}
function normalizeRepoKey(value) {
    return (value ?? "").trim().toLowerCase();
}
function isSameRepo(params) {
    const { owner, repo, candidateFull, candidateOwner, candidateName } = params;
    const target = normalizeRepoKey(`${owner}/${repo}`);
    return ((candidateFull && normalizeRepoKey(candidateFull) === target) ||
        (candidateOwner && candidateName && normalizeRepoKey(`${candidateOwner}/${candidateName}`) === target));
}
function getStyleSourceOrder() {
    const raw = (getEnvString(["PROMPT_STYLE_SOURCE", "UOS_STYLE_SOURCE"], "github") ?? "github").trim().toLowerCase();
    if (raw === "auto")
        return { order: ["vector-db", "github"], raw };
    const normalized = normalizeStyleSource(raw);
    if (normalized)
        return { order: [normalized], raw: normalized };
    return { order: ["github"], raw: "github" };
}
function getVectorDbConfig() {
    const rawUrl = getEnvString(["UOS_VECTOR_DB_URL", "SUPABASE_URL"]);
    const rawKey = getEnvString(["UOS_VECTOR_DB_KEY", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_KEY", "SUPABASE_ANON_KEY"]);
    const projectId = getEnvString(["SUPABASE_PROJECT_ID"]);
    const trimmedUrl = rawUrl?.trim() ?? "";
    const trimmedProject = projectId?.trim() ?? "";
    let url = "";
    if (trimmedUrl) {
        url = trimmedUrl.replace(/\/+$/, "");
    }
    else if (trimmedProject) {
        url = `https://${trimmedProject}.supabase.co`;
    }
    const key = rawKey?.trim() ?? "";
    if (!url || !key)
        return null;
    return { url, key };
}
function buildVectorDbHeaders(config) {
    return {
        apikey: config.key,
        Authorization: `Bearer ${config.key}`,
        "Content-Type": "application/json",
    };
}
function buildVectorDbUrl(params) {
    const { config, authorId, docTypes, from, maxDate, limit, offset } = params;
    const select = "id,doc_type,markdown,author_id,created_at,modified_at,payload";
    const query = [];
    query.push(`select=${encodeURIComponent(select)}`);
    query.push(`author_id=eq.${encodeURIComponent(String(authorId))}`);
    if (docTypes.length > 0) {
        const inList = docTypes.map((docType) => encodeURIComponent(docType)).join(",");
        query.push(`doc_type=in.(${inList})`);
    }
    query.push("deleted_at=is.null");
    query.push("markdown=not.is.null");
    if (Number.isFinite(from.getTime())) {
        query.push(`modified_at=gte.${encodeURIComponent(from.toISOString())}`);
    }
    if (Number.isFinite(maxDate.getTime())) {
        query.push(`modified_at=lte.${encodeURIComponent(maxDate.toISOString())}`);
    }
    query.push("order=modified_at.desc");
    query.push(`limit=${Math.max(1, Math.min(200, Math.floor(limit)))}`);
    query.push(`offset=${Math.max(0, Math.floor(offset))}`);
    return `${config.url}/rest/v1/documents?${query.join("&")}`;
}
async function fetchGithubUserId(params) {
    const { login, token, logger } = params;
    const trimmed = login.trim();
    if (!trimmed || !token)
        return null;
    const url = `https://api.github.com/users/${encodeURIComponent(trimmed)}`;
    const resp = await fetch(url, { headers: buildHeaders(token) });
    if (!resp.ok) {
        const txt = await safeText(resp);
        logger.info("[codexAgent] Style author lookup failed (non-fatal)", { status: resp.status, body: txt.slice(0, 200) });
        return null;
    }
    const json = (await resp.json());
    const id = Number(json?.id);
    if (!Number.isFinite(id))
        return null;
    return id;
}
function extractRepoFromPayload(payload) {
    const info = extractRepoInfoFromPayload(payload);
    if (info.fullName)
        return info.fullName;
    if (info.owner && info.name)
        return `${info.owner}/${info.name}`;
    return info.name;
}
function extractUrlFromPayload(payload) {
    const comment = toObject(toObject(payload).comment);
    const issue = toObject(toObject(payload).issue);
    return toStringOrUndefined(comment.html_url) ?? toStringOrUndefined(issue.html_url) ?? toStringOrUndefined(toObject(payload).url);
}
function extractRepoInfoFromPayload(payload) {
    const repo = toObject(toObject(payload).repository);
    const fullName = toStringOrUndefined(repo.full_name) ?? toStringOrUndefined(repo.nameWithOwner);
    const name = toStringOrUndefined(repo.name);
    const owner = toStringOrUndefined(toObject(repo.owner).login) ?? toStringOrUndefined(toObject(repo.owner).name);
    return { fullName, name, owner };
}
function getStyleCacheConfig() {
    const issueNumber = Math.floor(getEnvNumber(["PROMPT_STYLE_CACHE_ISSUE", "UOS_STYLE_CACHE_ISSUE"], 0));
    if (!Number.isFinite(issueNumber) || issueNumber <= 0)
        return null;
    const repoRaw = getEnvString(["PROMPT_STYLE_CACHE_REPO", "UOS_STYLE_CACHE_REPO"]) || process.env.GITHUB_REPOSITORY;
    if (!repoRaw)
        return null;
    const repo = parseOwnerRepo(repoRaw);
    if (!repo)
        return null;
    const markerLabel = getEnvString(["PROMPT_STYLE_CACHE_MARKER", "UOS_STYLE_CACHE_MARKER"], DEFAULT_STYLE_CACHE_MARKER) ?? DEFAULT_STYLE_CACHE_MARKER;
    const markerRegex = new RegExp(`<!--\\s*${escapeRegExp(markerLabel)}\\s*([\\s\\S]*?)\\s*-->`, "i");
    const ttlHours = Math.max(1, Math.min(168, Math.floor(getEnvNumber(["PROMPT_STYLE_CACHE_TTL_HOURS", "UOS_STYLE_CACHE_TTL_HOURS"], 24))));
    const shouldWriteCache = parseBool(getEnvString(["PROMPT_STYLE_CACHE_WRITE", "UOS_STYLE_CACHE_WRITE"], "1"), true);
    return {
        owner: repo.owner,
        repo: repo.repo,
        issueNumber,
        markerLabel,
        markerRegex,
        ttlMs: ttlHours * 60 * 60 * 1000,
        shouldWriteCache,
    };
}
function isStyleNodeInRepo(node, repoFilter) {
    const repoName = node?.repository?.nameWithOwner;
    return !repoFilter || isSameRepo({ owner: repoFilter.owner, repo: repoFilter.repo, candidateFull: repoName });
}
function getStyleNodeBody(node, markers, maxChars) {
    const body = (node?.body ?? "").trim();
    if (!body)
        return null;
    if (shouldSkipStyleBody(body, markers))
        return null;
    return normalizeStyleBody(body, maxChars);
}
function getVectorRowBody(row, markers, maxChars) {
    const body = typeof row.markdown === "string" ? row.markdown.trim() : "";
    if (!body)
        return null;
    if (shouldSkipStyleBody(body, markers))
        return null;
    return normalizeStyleBody(body, maxChars);
}
function isVectorRowInRepo(row, repoFilter) {
    const info = extractRepoInfoFromPayload(row.payload);
    return (!repoFilter ||
        isSameRepo({ owner: repoFilter.owner, repo: repoFilter.repo, candidateFull: info.fullName, candidateOwner: info.owner, candidateName: info.name }));
}
function isUpdatedWithinBounds(updatedAtMs, minUpdatedAtMs, maxUpdatedAtMs) {
    return !((minUpdatedAtMs !== null && updatedAtMs !== null && updatedAtMs < minUpdatedAtMs) ||
        (maxUpdatedAtMs !== null && updatedAtMs !== null && updatedAtMs > maxUpdatedAtMs));
}
function appendStyleExamples(nodes, examples, limit, markers, maxChars, minUpdatedAtMs, repoFilter) {
    let hasReachedLookback = false;
    for (const node of nodes) {
        const updatedAtMs = parseDateMs(node?.updatedAt) ?? parseDateMs(node?.createdAt);
        if (isPastLookback(updatedAtMs, minUpdatedAtMs)) {
            hasReachedLookback = true;
            continue;
        }
        if (!isStyleNodeInRepo(node, repoFilter))
            continue;
        const trimmed = getStyleNodeBody(node, markers, maxChars);
        if (!trimmed)
            continue;
        examples.push({
            body: trimmed,
            createdAt: String(node?.createdAt ?? ""),
            url: node?.url,
            repo: node?.repository?.nameWithOwner,
        });
        if (examples.length >= limit)
            break;
    }
    return { hasReachedLookback };
}
async function fetchStylePage(params) {
    const { headers, variables, logger } = params;
    const resp = await fetch("https://api.github.com/graphql", {
        method: "POST",
        headers,
        body: JSON.stringify({ query: STYLE_QUERY, variables }),
    });
    if (!resp.ok) {
        const txt = await safeText(resp);
        logger.info("[codexAgent] Style fetch failed (non-fatal)", { status: resp.status, body: txt.slice(0, 500) });
        return null;
    }
    const json = (await resp.json());
    const issueComments = json.data?.user?.issueComments;
    return {
        nodes: issueComments?.nodes ?? [],
        pageInfo: issueComments?.pageInfo ?? {},
    };
}
async function collectStyleExamples(params) {
    const { login, from, headers, limit, marker, maxChars, repoFilter, logger } = params;
    const examples = [];
    let cursor = null;
    let hasNext = true;
    const markers = [marker, DEFAULT_REPLY_MARKER].filter(Boolean);
    const minUpdatedAtMs = Number.isFinite(from.getTime()) ? from.getTime() : null;
    while (hasNext && examples.length < limit) {
        const page = await fetchStylePage({
            headers,
            variables: {
                login,
                cursor,
            },
            logger,
        });
        if (!page)
            return examples;
        const { hasReachedLookback } = appendStyleExamples(page.nodes, examples, limit, markers, maxChars, minUpdatedAtMs, repoFilter);
        hasNext = Boolean(page.pageInfo.hasNextPage);
        cursor = page.pageInfo.endCursor ?? null;
        if (hasReachedLookback)
            break;
    }
    return examples.slice(0, limit);
}
function parseVectorDbRow(value) {
    if (!value || typeof value !== "object")
        return null;
    const obj = toObject(value);
    const markdown = typeof obj.markdown === "string" ? obj.markdown : null;
    return {
        id: toStringOrUndefined(obj.id),
        markdown,
        created_at: toStringOrUndefined(obj.created_at),
        modified_at: toStringOrUndefined(obj.modified_at),
        payload: obj.payload ?? null,
    };
}
function appendVectorStyleExamples(params) {
    const { rows, examples, limit, markers, maxChars, minUpdatedAtMs, maxUpdatedAtMs, repoFilter } = params;
    for (const row of rows) {
        if (examples.length >= limit)
            break;
        const trimmed = getVectorRowBody(row, markers, maxChars);
        if (!trimmed)
            continue;
        if (!isVectorRowInRepo(row, repoFilter))
            continue;
        const updatedAt = row.modified_at ?? row.created_at;
        const updatedAtMs = parseDateMs(updatedAt);
        if (!isUpdatedWithinBounds(updatedAtMs, minUpdatedAtMs, maxUpdatedAtMs))
            continue;
        examples.push({
            body: trimmed,
            createdAt: updatedAt,
            url: extractUrlFromPayload(row.payload),
            repo: extractRepoFromPayload(row.payload),
        });
    }
}
async function collectStyleExamplesFromVectorDb(params) {
    const { login, token, config, from, maxDate, limit, marker, maxChars, repoFilter, logger } = params;
    const authorId = await fetchGithubUserId({ login, token, logger });
    if (!authorId)
        return [];
    const docTypes = ["issue_comment", "review_comment", "pull_request_review"];
    const pageSize = Math.max(25, Math.min(200, Math.floor(limit * 4)));
    const examples = [];
    const markers = [marker, DEFAULT_REPLY_MARKER].filter(Boolean);
    const minUpdatedAtMs = Number.isFinite(from.getTime()) ? from.getTime() : null;
    const maxUpdatedAtMs = Number.isFinite(maxDate.getTime()) ? maxDate.getTime() : null;
    let offset = 0;
    while (examples.length < limit) {
        const url = buildVectorDbUrl({
            config,
            authorId,
            docTypes,
            from,
            maxDate,
            limit: pageSize,
            offset,
        });
        const resp = await fetch(url, { headers: buildVectorDbHeaders(config) });
        if (!resp.ok) {
            const txt = await safeText(resp);
            logger.info("[codexAgent] Vector DB style fetch failed (non-fatal)", { status: resp.status, body: txt.slice(0, 200) });
            break;
        }
        const json = (await resp.json());
        if (!Array.isArray(json) || json.length === 0)
            break;
        const rows = json.map(parseVectorDbRow).filter((row) => Boolean(row));
        appendVectorStyleExamples({
            rows,
            examples,
            limit,
            markers,
            maxChars,
            minUpdatedAtMs,
            maxUpdatedAtMs,
            repoFilter,
        });
        offset += json.length;
        if (json.length < pageSize)
            break;
    }
    return examples.slice(0, limit);
}
async function fetchIssueComments(params) {
    const { owner, repo, issueNumber, token, logger } = params;
    const url = `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/comments?per_page=100`;
    const resp = await fetch(url, {
        method: "GET",
        headers: buildHeaders(token),
    });
    if (!resp.ok) {
        const txt = await safeText(resp);
        logger.info("[codexAgent] Style cache read failed (non-fatal)", { status: resp.status, body: txt.slice(0, 500) });
        return [];
    }
    const json = (await resp.json());
    if (!Array.isArray(json))
        return [];
    return json.map((comment) => {
        const obj = toObject(comment);
        return {
            id: toNumber(obj.id),
            body: toStringOrUndefined(obj.body),
            created_at: toStringOrUndefined(obj.created_at),
            updated_at: toStringOrUndefined(obj.updated_at),
        };
    });
}
function findStyleCacheComment(comments, markerRegex) {
    for (const comment of comments) {
        const body = typeof comment.body === "string" ? comment.body : "";
        if (body && markerRegex.test(body))
            return comment;
    }
    return null;
}
function parseStyleCacheComment(body, markerRegex, maxChars) {
    const match = markerRegex.exec(body);
    const raw = (match ? match[1] : body).trim();
    if (!raw)
        return null;
    const parsed = safeJsonParse(raw);
    if (!parsed || typeof parsed !== "object")
        return null;
    const obj = toObject(parsed);
    const examples = normalizeStyleExamples(obj.examples, maxChars);
    if (!examples.length)
        return null;
    const source = normalizeStyleSource(toStringOrUndefined(obj.source));
    return {
        version: toNumber(obj.version),
        updatedAt: toStringOrUndefined(obj.updatedAt),
        login: toStringOrUndefined(obj.login),
        repo: toStringOrUndefined(obj.repo),
        lookbackDays: toNumber(obj.lookbackDays),
        limit: toNumber(obj.limit),
        maxChars: toNumber(obj.maxChars),
        source: source ?? undefined,
        examples,
    };
}
function isStyleCacheUsable(cache, params) {
    const { login, repo, limit, lookbackDays, ttlMs, source } = params;
    if (!cache.updatedAt)
        return false;
    const updatedAt = new Date(cache.updatedAt);
    if (Number.isNaN(updatedAt.getTime()))
        return false;
    if (Date.now() - updatedAt.getTime() > ttlMs)
        return false;
    if (!cache.login || cache.login.toLowerCase() !== login.toLowerCase())
        return false;
    if (!cache.repo || normalizeRepoKey(cache.repo) !== normalizeRepoKey(repo))
        return false;
    if (!cache.lookbackDays || cache.lookbackDays !== lookbackDays)
        return false;
    if (!cache.limit || cache.limit < limit)
        return false;
    const cacheSource = cache.source ?? "github";
    if (cacheSource !== source)
        return false;
    return cache.examples.length > 0;
}
function buildStyleCacheBody(markerLabel, payload) {
    return `<!-- ${markerLabel} ${safeStringify(payload)} -->`;
}
async function upsertStyleCacheComment(params) {
    const { owner, repo, issueNumber, commentId, body, token, logger } = params;
    const headers = buildHeaders(token);
    if (commentId) {
        const url = `https://api.github.com/repos/${owner}/${repo}/issues/comments/${commentId}`;
        const resp = await fetch(url, {
            method: "PATCH",
            headers,
            body: JSON.stringify({ body }),
        });
        if (!resp.ok) {
            const txt = await safeText(resp);
            logger.info("[codexAgent] Style cache update failed (non-fatal)", { status: resp.status, body: txt.slice(0, 500) });
        }
        return;
    }
    const url = `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/comments`;
    const resp = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({ body }),
    });
    if (!resp.ok) {
        const txt = await safeText(resp);
        logger.info("[codexAgent] Style cache write failed (non-fatal)", { status: resp.status, body: txt.slice(0, 500) });
    }
}
function getStyleFetchSettings(params) {
    const { owner, repo } = params;
    const limit = Math.max(0, Math.min(50, Math.floor(getEnvNumber(["PROMPT_STYLE_EXAMPLES", "UOS_STYLE_EXAMPLES"], 12))));
    const maxChars = Math.max(120, Math.min(800, Math.floor(getEnvNumber(["PROMPT_STYLE_EXAMPLE_MAX_CHARS", "UOS_STYLE_EXAMPLE_MAX_CHARS"], 320))));
    const lookbackDays = Math.max(30, Math.min(3650, Math.floor(getEnvNumber(["PROMPT_STYLE_LOOKBACK_DAYS", "UOS_STYLE_LOOKBACK_DAYS"], 365))));
    const maxDateRaw = getEnvString(["PROMPT_STYLE_MAX_DATE", "UOS_STYLE_MAX_DATE"]);
    let maxDate = maxDateRaw ? new Date(maxDateRaw) : new Date();
    if (Number.isNaN(maxDate.getTime()))
        maxDate = new Date();
    const from = new Date(maxDate.getTime() - lookbackDays * 24 * 60 * 60 * 1000);
    const marker = getEnvString(["PROMPT_STYLE_CACHE_MARKER", "UOS_STYLE_CACHE_MARKER"], DEFAULT_STYLE_CACHE_MARKER) ?? DEFAULT_STYLE_CACHE_MARKER;
    const repoFilter = owner && repo ? { owner, repo } : undefined;
    const repoFullName = owner && repo ? `${owner}/${repo}` : "";
    return {
        limit,
        maxChars,
        lookbackDays,
        maxDate,
        from,
        marker,
        repoFilter,
        repoFullName,
    };
}
async function loadStyleCache(params) {
    const { token, maxChars, logger } = params;
    const cacheConfig = getStyleCacheConfig();
    if (!cacheConfig) {
        return { cacheConfig: null, cacheComment: null, cached: null };
    }
    const comments = await fetchIssueComments({
        owner: cacheConfig.owner,
        repo: cacheConfig.repo,
        issueNumber: cacheConfig.issueNumber,
        token,
        logger,
    });
    const cacheComment = findStyleCacheComment(comments, cacheConfig.markerRegex);
    const cached = cacheComment?.body ? parseStyleCacheComment(cacheComment.body, cacheConfig.markerRegex, maxChars) : null;
    return { cacheConfig, cacheComment, cached };
}
function getCachedStyleExamples(params) {
    const { cached, cacheConfig, repoFullName, login, limit, lookbackDays, source } = params;
    if (!cached || !cacheConfig || !repoFullName)
        return null;
    if (!isStyleCacheUsable(cached, { login, repo: repoFullName, limit, lookbackDays, ttlMs: cacheConfig.ttlMs, source }))
        return null;
    return cached.examples.slice(0, limit);
}
function canUseVectorDbSource(params) {
    const { source, vectorConfig, raw, logger } = params;
    if (source !== "vector-db")
        return true;
    if (vectorConfig)
        return true;
    if (raw === "vector-db") {
        logger.info("[codexAgent] Vector DB style fetch skipped: missing config", { source });
    }
    return false;
}
async function fetchExamplesForSource(params) {
    const { source, login, token, vectorConfig, from, maxDate, limit, marker, maxChars, repoFilter, headers, logger } = params;
    if (source === "vector-db") {
        if (!vectorConfig)
            return [];
        return collectStyleExamplesFromVectorDb({
            login,
            token,
            config: vectorConfig,
            from,
            maxDate,
            limit,
            marker,
            maxChars,
            repoFilter,
            logger,
        });
    }
    return collectStyleExamples({
        login,
        from,
        headers,
        limit,
        marker,
        maxChars,
        repoFilter,
        logger,
    });
}
async function maybeUpdateStyleCache(params) {
    const { cacheConfig, cacheComment, token, payload, logger } = params;
    if (!cacheConfig?.shouldWriteCache)
        return;
    await upsertStyleCacheComment({
        owner: cacheConfig.owner,
        repo: cacheConfig.repo,
        issueNumber: cacheConfig.issueNumber,
        commentId: cacheComment?.id,
        body: buildStyleCacheBody(cacheConfig.markerLabel, payload),
        token,
        logger,
    });
    logger.info("[codexAgent] Style cache updated", {
        count: payload.examples.length,
        issue: `${cacheConfig.owner}/${cacheConfig.repo}#${cacheConfig.issueNumber}`,
        source: payload.source,
    });
}
export async function fetchStyleExamples(params) {
    const { login, owner, repo, token, logger } = params;
    if (!token)
        return [];
    const settings = getStyleFetchSettings({ owner, repo });
    if (settings.limit === 0)
        return [];
    const { cacheConfig, cacheComment, cached } = await loadStyleCache({
        token,
        maxChars: settings.maxChars,
        logger,
    });
    const { order, raw } = getStyleSourceOrder();
    const vectorConfig = getVectorDbConfig();
    const headers = buildHeaders(token);
    for (const source of order) {
        if (!canUseVectorDbSource({ source, vectorConfig, raw, logger }))
            continue;
        const cachedExamples = getCachedStyleExamples({
            cached,
            cacheConfig,
            repoFullName: settings.repoFullName,
            login,
            limit: settings.limit,
            lookbackDays: settings.lookbackDays,
            source,
        });
        if (cachedExamples) {
            logger.info("[codexAgent] Style cache hit", {
                count: cachedExamples.length,
                issue: cacheConfig ? `${cacheConfig.owner}/${cacheConfig.repo}#${cacheConfig.issueNumber}` : "",
                source,
            });
            return cachedExamples;
        }
        const examples = await fetchExamplesForSource({
            source,
            login,
            token,
            vectorConfig,
            from: settings.from,
            maxDate: settings.maxDate,
            limit: settings.limit,
            marker: settings.marker,
            maxChars: settings.maxChars,
            repoFilter: settings.repoFilter,
            headers,
            logger,
        });
        if (!examples.length)
            continue;
        await maybeUpdateStyleCache({
            cacheConfig,
            cacheComment,
            token,
            payload: {
                version: STYLE_CACHE_VERSION,
                updatedAt: new Date().toISOString(),
                login,
                repo: settings.repoFullName || undefined,
                lookbackDays: settings.lookbackDays,
                limit: settings.limit,
                maxChars: settings.maxChars,
                source,
                examples,
            },
            logger,
        });
        return examples;
    }
    return [];
}
export async function maybeFetchStyleExamples(args) {
    const { login, owner, repo, logger } = args;
    const isStyleFetchEnabled = parseBool(getEnvString(["PROMPT_FETCH_STYLE", "UOS_STYLE_FETCH"], "1"), true);
    if (!isStyleFetchEnabled)
        return [];
    if (!login)
        return [];
    try {
        const token = selectPatToken({ isSelf: true });
        if (!token)
            return [];
        return await fetchStyleExamples({ login, owner, repo, token, logger });
    }
    catch (error) {
        logger.info("[codexAgent] Style fetch failed (non-fatal)", { error: String(error) });
        return [];
    }
}
