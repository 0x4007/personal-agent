import { selectPatToken } from "./config";
import { toNumber, toObject, toStringOrUndefined, safeText, safeStringify } from "./utils";

export type StyleExample = {
  body: string;
  createdAt?: string;
  url?: string;
  repo?: string;
};

export async function maybePrefetchContext(args: {
  logger: { info: (...args: unknown[]) => unknown };
  isSelf: boolean | null | undefined;
  owner: string;
  repo: string;
  issueNumber: number;
  isPr: boolean;
}): Promise<unknown> {
  const { logger, isSelf, owner, repo, issueNumber, isPr } = args;
  const isPrefetchEnabled = (process.env.PROMPT_FETCH_ISSUE ?? "1") === "1";
  if (!isPrefetchEnabled) return null;
  try {
    const token = selectPatToken({ isSelf: Boolean(isSelf) });
    return await fetchIssueContext({ owner, repo, issueNumber, isPr, token });
  } catch (e) {
    logger.info("[codexAgent] Prefetch failed (non-fatal)", { error: String(e) });
    return null;
  }
}

export async function createGithubComment(
  params: { owner: string; repo: string; issueNumber: number; body: string; token: string },
  logger: { info: (...args: unknown[]) => unknown }
): Promise<{ id: number } | null> {
  const { owner, repo, issueNumber, body, token } = params;
  if (!token) throw new Error("Missing GitHub token to create comment");
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
    const txt = await safeText(resp as unknown as Response);
    throw new Error(`GitHub comment HTTP ${resp.status}: ${txt}`);
  }
  try {
    const json = (await resp.json()) as unknown;
    const id = Number((json as { id?: unknown }).id);
    if (!Number.isFinite(id)) return null;
    logger.info("[codexAgent] Created comment", { id });
    return { id };
  } catch {
    return null;
  }
}

export async function maybeCreatePlaceholderComment(args: {
  logger: { info: (...a: unknown[]) => unknown };
  isSelf: boolean | null | undefined;
  owner: string;
  repo: string;
  issueNumber: number;
}): Promise<number | null> {
  const { logger, isSelf, owner, repo, issueNumber } = args;
  try {
    const token = selectPatToken({ isSelf: Boolean(isSelf) });
    const placeholder = "Thinking...";
    const created = await createGithubComment(
      {
        owner,
        repo,
        issueNumber,
        body: placeholder,
        token,
      },
      logger
    );
    const id = created?.id ?? null;
    logger.info("[codexAgent] Created placeholder comment", { id });
    return id;
  } catch (e) {
    logger.info("[codexAgent] Placeholder comment creation failed (non-fatal)", { error: String(e) });
    return null;
  }
}

export async function fetchIssueContext(params: { owner: string; repo: string; issueNumber: number; isPr: boolean; token: string }): Promise<unknown> {
  const { owner, repo, issueNumber, isPr, token } = params;
  if (!token) throw new Error("Missing token for GitHub context fetch");
  const base = `https://api.github.com/repos/${owner}/${repo}`;
  const headers = {
    authorization: `Bearer ${token}`,
    accept: "application/vnd.github+json",
    "x-github-api-version": "2022-11-28",
  } as Record<string, string>;

  async function getJson(url: string): Promise<unknown> {
    const r = await fetch(url, { headers });
    if (!r.ok) throw new Error(`${url} -> HTTP ${r.status}`);
    return r.json();
  }

  const issue = await getJson(`${base}/issues/${issueNumber}`);
  // comments can be many; fetch first page only to keep prompt small
  const comments = await getJson(`${base}/issues/${issueNumber}/comments?per_page=50`);
  let pr: unknown = null;
  if (isPr) {
    try {
      pr = await getJson(`${base}/pulls/${issueNumber}`);
    } catch {
      /* ignore */
    }
  }

  // Keep only concise fields
  const issueObj = toObject(issue);
  const slimIssue = {
    number: toNumber(issueObj.number) ?? issueNumber,
    title: toStringOrUndefined(issueObj.title),
    state: toStringOrUndefined(issueObj.state),
    author: toObject(issueObj.user).login as string | undefined,
    labels: Array.isArray(issueObj.labels)
      ? (issueObj.labels as unknown[]).map((l) => (typeof l === "string" ? l : toStringOrUndefined(toObject(l).name))).filter((v): v is string => Boolean(v))
      : [],
    body: toStringOrUndefined(issueObj.body),
    created_at: toStringOrUndefined(issueObj.created_at),
    updated_at: toStringOrUndefined(issueObj.updated_at),
    url: toStringOrUndefined(issueObj.url),
  };
  const slimComments = Array.isArray(comments)
    ? (comments as unknown[]).map((c) => {
        const obj = toObject(c);
        return {
          author: toStringOrUndefined(toObject(obj.user).login),
          created_at: toStringOrUndefined(obj.created_at),
          body: toStringOrUndefined(obj.body),
          url: toStringOrUndefined(obj.url),
        };
      })
    : [];
  const prObj = pr && typeof pr === "object" ? (pr as Record<string, unknown>) : null;
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

export async function fetchRepoLabels(params: {
  owner: string;
  repo: string;
  token: string;
}): Promise<Array<{ name: string; color?: string; description?: string }>> {
  const { owner, repo, token } = params;
  const headers = {
    authorization: `Bearer ${token}`,
    accept: "application/vnd.github+json",
    "x-github-api-version": "2022-11-28",
  } as Record<string, string>;
  const base = `https://api.github.com/repos/${owner}/${repo}/labels`;
  const out: Array<{ name: string; color?: string; description?: string }> = [];
  let page = 1;
  for (let i = 0; i < 3; i++) {
    // fetch up to about 300 labels max
    const url = `${base}?per_page=100&page=${page}`;
    const r = await fetch(url, { headers });
    if (!r.ok) break;
    const arr = (await r.json()) as unknown[];
    for (const l of arr) {
      const obj = toObject(l);
      out.push({ name: String(obj.name ?? ""), color: obj.color as string | undefined, description: obj.description as string | undefined });
    }
    if (arr.length < 100) break;
    page++;
  }
  // dedupe by name
  const seen = new Set<string>();
  return out
    .filter((l) => {
      const key = l.name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
}

type StyleNode = {
  body?: string;
  createdAt?: string;
  url?: string;
  repository?: { nameWithOwner?: string };
};

type StylePage = {
  nodes: StyleNode[];
  pageInfo: { hasNextPage?: boolean; endCursor?: string | null };
};

type StyleCache = {
  version?: number;
  updatedAt?: string;
  login?: string;
  lookbackDays?: number;
  limit?: number;
  maxChars?: number;
  examples: StyleExample[];
};

type IssueComment = {
  id?: number;
  body?: string;
  created_at?: string;
  updated_at?: string;
};

const STYLE_CACHE_VERSION = 1;
const DEFAULT_STYLE_CACHE_MARKER = "pa:style-cache";

const STYLE_QUERY = `query($login: String!, $from: DateTime!, $to: DateTime!, $cursor: String) {
  user(login: $login) {
    contributionsCollection(from: $from, to: $to) {
      issueComments(first: 50, after: $cursor) {
        nodes { body createdAt url repository { nameWithOwner } }
        pageInfo { hasNextPage endCursor }
      }
    }
  }
}`;

function getEnvString(keys: string[], fallback?: string): string | undefined {
  for (const key of keys) {
    const value = process.env[key];
    if (value !== undefined && value !== "") return value;
  }
  return fallback;
}

function getEnvNumber(keys: string[], fallback: number): number {
  const value = getEnvString(keys);
  if (value == null) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseBool(value: string | undefined, fallback: boolean): boolean {
  if (value == null || value === "") return fallback;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return fallback;
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

function parseOwnerRepo(value: string): { owner: string; repo: string } | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parts = trimmed.split("/");
  if (parts.length < 2) return null;
  const owner = parts[0].trim();
  const repo = parts[1].trim();
  if (!owner || !repo) return null;
  return { owner, repo };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function safeJsonParse(value: string): unknown | null {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function truncate(value: string | undefined, maxChars: number): string | undefined {
  if (!value) return value;
  if (value.length <= maxChars) return value;
  return value.slice(0, maxChars).trimEnd() + "...";
}

function normalizeStyleExamples(raw: unknown, maxChars: number): StyleExample[] {
  if (!Array.isArray(raw)) return [];
  const max = Math.max(120, Math.min(800, Math.floor(maxChars)));
  const examples: StyleExample[] = [];
  for (const item of raw) {
    const obj = toObject(item);
    const bodyRaw = toStringOrUndefined(obj.body);
    if (!bodyRaw) continue;
    const normalized = bodyRaw.replace(/\s+/g, " ").trim();
    if (!normalized) continue;
    const body = truncate(normalized, max);
    if (!body) continue;
    examples.push({
      body,
      createdAt: toStringOrUndefined(obj.createdAt) ?? "",
      url: toStringOrUndefined(obj.url),
      repo: toStringOrUndefined(obj.repo),
    });
  }
  return examples;
}

function buildHeaders(token: string): Record<string, string> {
  return {
    authorization: `Bearer ${token}`,
    accept: "application/vnd.github+json",
    "content-type": "application/json",
    "x-github-api-version": "2022-11-28",
  };
}

function getStyleCacheConfig(): {
  owner: string;
  repo: string;
  issueNumber: number;
  markerLabel: string;
  markerRegex: RegExp;
  ttlMs: number;
  shouldWriteCache: boolean;
} | null {
  const issueNumber = Math.floor(getEnvNumber(["PROMPT_STYLE_CACHE_ISSUE", "UOS_STYLE_CACHE_ISSUE"], 0));
  if (!Number.isFinite(issueNumber) || issueNumber <= 0) return null;

  const repoRaw = getEnvString(["PROMPT_STYLE_CACHE_REPO", "UOS_STYLE_CACHE_REPO"]) || process.env.GITHUB_REPOSITORY;
  if (!repoRaw) return null;
  const repo = parseOwnerRepo(repoRaw);
  if (!repo) return null;

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

function appendStyleExamples(nodes: StyleNode[], examples: StyleExample[], limit: number, marker: string, maxChars: number): void {
  for (const node of nodes) {
    const body = (node?.body ?? "").trim();
    if (!body) continue;
    if (marker && body.includes(marker)) continue;
    const normalized = body.replace(/\s+/g, " ").trim();
    if (normalized.length < 40) continue;
    const trimmed = truncate(normalized, maxChars);
    if (!trimmed) continue;
    examples.push({
      body: trimmed,
      createdAt: String(node?.createdAt ?? ""),
      url: node?.url,
      repo: node?.repository?.nameWithOwner,
    });
    if (examples.length >= limit) break;
  }
}

async function fetchStylePage(params: {
  headers: Record<string, string>;
  variables: { login: string; from: string; to: string; cursor: string | null };
  logger: { info: (...args: unknown[]) => unknown };
}): Promise<StylePage | null> {
  const { headers, variables, logger } = params;
  const resp = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers,
    body: JSON.stringify({ query: STYLE_QUERY, variables }),
  });

  if (!resp.ok) {
    const txt = await safeText(resp as unknown as Response);
    logger.info("[codexAgent] Style fetch failed (non-fatal)", { status: resp.status, body: txt.slice(0, 500) });
    return null;
  }

  const json = (await resp.json()) as {
    data?: {
      user?: {
        contributionsCollection?: {
          issueComments?: {
            nodes?: StyleNode[];
            pageInfo?: { hasNextPage?: boolean; endCursor?: string | null };
          };
        };
      };
    };
  };

  const issueComments = json.data?.user?.contributionsCollection?.issueComments;
  return {
    nodes: issueComments?.nodes ?? [],
    pageInfo: issueComments?.pageInfo ?? {},
  };
}

async function collectStyleExamples(params: {
  login: string;
  from: Date;
  to: Date;
  headers: Record<string, string>;
  limit: number;
  marker: string;
  maxChars: number;
  logger: { info: (...args: unknown[]) => unknown };
}): Promise<StyleExample[]> {
  const { login, from, to, headers, limit, marker, maxChars, logger } = params;
  const examples: StyleExample[] = [];
  let cursor: string | null = null;
  let hasNext = true;

  while (hasNext && examples.length < limit) {
    const page = await fetchStylePage({
      headers,
      variables: {
        login,
        from: from.toISOString(),
        to: to.toISOString(),
        cursor,
      },
      logger,
    });
    if (!page) return examples;
    appendStyleExamples(page.nodes, examples, limit, marker, maxChars);
    hasNext = Boolean(page.pageInfo.hasNextPage);
    cursor = page.pageInfo.endCursor ?? null;
  }

  return examples.slice(0, limit);
}

async function fetchIssueComments(params: {
  owner: string;
  repo: string;
  issueNumber: number;
  token: string;
  logger: { info: (...args: unknown[]) => unknown };
}): Promise<IssueComment[]> {
  const { owner, repo, issueNumber, token, logger } = params;
  const url = `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/comments?per_page=100`;
  const resp = await fetch(url, {
    method: "GET",
    headers: buildHeaders(token),
  });
  if (!resp.ok) {
    const txt = await safeText(resp as unknown as Response);
    logger.info("[codexAgent] Style cache read failed (non-fatal)", { status: resp.status, body: txt.slice(0, 500) });
    return [];
  }
  const json = (await resp.json()) as unknown;
  if (!Array.isArray(json)) return [];
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

function findStyleCacheComment(comments: IssueComment[], markerRegex: RegExp): IssueComment | null {
  for (const comment of comments) {
    const body = typeof comment.body === "string" ? comment.body : "";
    if (body && markerRegex.test(body)) return comment;
  }
  return null;
}

function parseStyleCacheComment(body: string, markerRegex: RegExp, maxChars: number): StyleCache | null {
  const match = markerRegex.exec(body);
  const raw = (match ? match[1] : body).trim();
  if (!raw) return null;
  const parsed = safeJsonParse(raw);
  if (!parsed || typeof parsed !== "object") return null;
  const obj = toObject(parsed);
  const examples = normalizeStyleExamples(obj.examples, maxChars);
  if (!examples.length) return null;
  return {
    version: toNumber(obj.version),
    updatedAt: toStringOrUndefined(obj.updatedAt),
    login: toStringOrUndefined(obj.login),
    lookbackDays: toNumber(obj.lookbackDays),
    limit: toNumber(obj.limit),
    maxChars: toNumber(obj.maxChars),
    examples,
  };
}

function isStyleCacheUsable(cache: StyleCache, params: { login: string; limit: number; lookbackDays: number; ttlMs: number }): boolean {
  const { login, limit, lookbackDays, ttlMs } = params;
  if (!cache.updatedAt) return false;
  const updatedAt = new Date(cache.updatedAt);
  if (Number.isNaN(updatedAt.getTime())) return false;
  if (Date.now() - updatedAt.getTime() > ttlMs) return false;
  if (!cache.login || cache.login.toLowerCase() !== login.toLowerCase()) return false;
  if (!cache.lookbackDays || cache.lookbackDays !== lookbackDays) return false;
  if (!cache.limit || cache.limit < limit) return false;
  return cache.examples.length > 0;
}

function buildStyleCacheBody(markerLabel: string, payload: StyleCache): string {
  return `<!-- ${markerLabel} ${safeStringify(payload)} -->`;
}

async function upsertStyleCacheComment(params: {
  owner: string;
  repo: string;
  issueNumber: number;
  commentId?: number;
  body: string;
  token: string;
  logger: { info: (...args: unknown[]) => unknown };
}): Promise<void> {
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
      const txt = await safeText(resp as unknown as Response);
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
    const txt = await safeText(resp as unknown as Response);
    logger.info("[codexAgent] Style cache write failed (non-fatal)", { status: resp.status, body: txt.slice(0, 500) });
  }
}

export async function fetchStyleExamples(params: { login: string; token: string; logger: { info: (...args: unknown[]) => unknown } }): Promise<StyleExample[]> {
  const { login, token, logger } = params;
  if (!token) return [];

  const limit = Math.max(0, Math.min(50, Math.floor(getEnvNumber(["PROMPT_STYLE_EXAMPLES", "UOS_STYLE_EXAMPLES"], 12))));
  if (limit === 0) return [];

  const maxChars = Math.max(120, Math.min(800, Math.floor(getEnvNumber(["PROMPT_STYLE_EXAMPLE_MAX_CHARS", "UOS_STYLE_EXAMPLE_MAX_CHARS"], 320))));
  const lookbackDays = Math.max(30, Math.min(3650, Math.floor(getEnvNumber(["PROMPT_STYLE_LOOKBACK_DAYS", "UOS_STYLE_LOOKBACK_DAYS"], 365))));
  const maxDateRaw = getEnvString(["PROMPT_STYLE_MAX_DATE", "UOS_STYLE_MAX_DATE"]);
  let maxDate = maxDateRaw ? new Date(maxDateRaw) : new Date();
  if (Number.isNaN(maxDate.getTime())) maxDate = new Date();
  const from = new Date(maxDate.getTime() - lookbackDays * 24 * 60 * 60 * 1000);
  const marker = getEnvString(["PROMPT_STYLE_CACHE_MARKER", "UOS_STYLE_CACHE_MARKER"], DEFAULT_STYLE_CACHE_MARKER) ?? DEFAULT_STYLE_CACHE_MARKER;

  const cacheConfig = getStyleCacheConfig();
  let cacheComment: IssueComment | null = null;
  if (cacheConfig) {
    const comments = await fetchIssueComments({
      owner: cacheConfig.owner,
      repo: cacheConfig.repo,
      issueNumber: cacheConfig.issueNumber,
      token,
      logger,
    });
    cacheComment = findStyleCacheComment(comments, cacheConfig.markerRegex);
    if (cacheComment?.body) {
      const cached = parseStyleCacheComment(cacheComment.body, cacheConfig.markerRegex, maxChars);
      if (cached && isStyleCacheUsable(cached, { login, limit, lookbackDays, ttlMs: cacheConfig.ttlMs })) {
        logger.info("[codexAgent] Style cache hit", {
          count: cached.examples.length,
          issue: `${cacheConfig.owner}/${cacheConfig.repo}#${cacheConfig.issueNumber}`,
        });
        return cached.examples.slice(0, limit);
      }
    }
  }

  const headers = buildHeaders(token);
  const examples = await collectStyleExamples({
    login,
    from,
    to: maxDate,
    headers,
    limit,
    marker,
    maxChars,
    logger,
  });

  if (cacheConfig?.shouldWriteCache) {
    const payload: StyleCache = {
      version: STYLE_CACHE_VERSION,
      updatedAt: new Date().toISOString(),
      login,
      lookbackDays,
      limit,
      maxChars,
      examples,
    };
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
      count: examples.length,
      issue: `${cacheConfig.owner}/${cacheConfig.repo}#${cacheConfig.issueNumber}`,
    });
  }

  return examples;
}

export async function maybeFetchStyleExamples(args: { login: string; logger: { info: (...args: unknown[]) => unknown } }): Promise<StyleExample[]> {
  const { login, logger } = args;
  const isStyleFetchEnabled = parseBool(getEnvString(["PROMPT_FETCH_STYLE", "UOS_STYLE_FETCH"], "1"), true);
  if (!isStyleFetchEnabled) return [];
  if (!login) return [];
  try {
    const token = selectPatToken({ isSelf: true });
    if (!token) return [];
    return await fetchStyleExamples({ login, token, logger });
  } catch (error) {
    logger.info("[codexAgent] Style fetch failed (non-fatal)", { error: String(error) });
    return [];
  }
}
