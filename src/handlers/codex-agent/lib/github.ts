import { getEnvNumber, getEnvString, getReplyMarker, selectReadToken, selectWriteToken } from "./config";
import { safeText, toNumber, toObject, toStringOrUndefined } from "./utils";

export type IssueContext = {
  issue: {
    number: number;
    title?: string;
    state?: string;
    author?: string;
    labels: string[];
    body?: string;
    created_at?: string;
    updated_at?: string;
    url?: string;
  };
  comments: Array<{ author?: string; created_at?: string; body?: string; url?: string }>;
  pr: {
    merged: boolean;
    draft: boolean;
    head?: string;
    base?: string;
    additions?: number;
    deletions?: number;
    changed_files?: number;
    url?: string;
  } | null;
};

export type StyleExample = {
  body: string;
  createdAt: string;
  url?: string;
  repo?: string;
};

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

function buildHeaders(token: string): Record<string, string> {
  return {
    authorization: `Bearer ${token}`,
    accept: "application/vnd.github+json",
    "content-type": "application/json",
    "x-github-api-version": "2022-11-28",
  };
}

function stripMarker(body: string | undefined, marker: string): string | undefined {
  if (!body) return body;
  if (!marker) return body;
  return body.replace(marker, "").trim();
}

function truncate(value: string | undefined, maxChars: number): string | undefined {
  if (!value) return value;
  if (value.length <= maxChars) return value;
  return value.slice(0, maxChars).trimEnd() + "...";
}

function appendStyleExamples(nodes: StyleNode[], examples: StyleExample[], limit: number, marker: string): void {
  for (const node of nodes) {
    const body = (node?.body ?? "").trim();
    if (!body) continue;
    if (marker && body.includes(marker)) continue;
    if (body.length < 40) continue;
    examples.push({
      body,
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
    logger.info("[personalAgent] Style fetch failed (non-fatal)", { status: resp.status, body: txt.slice(0, 500) });
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
  logger: { info: (...args: unknown[]) => unknown };
}): Promise<StyleExample[]> {
  const { login, from, to, headers, limit, marker, logger } = params;
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
    appendStyleExamples(page.nodes, examples, limit, marker);
    hasNext = Boolean(page.pageInfo.hasNextPage);
    cursor = page.pageInfo.endCursor ?? null;
  }

  return examples.slice(0, limit);
}

export function resolveReadToken(contextAuthToken: string | undefined): string {
  return selectReadToken() || String(contextAuthToken || "").trim();
}

export function resolveWriteToken(contextAuthToken: string | undefined): string {
  const pat = selectWriteToken();
  if (pat) return pat;
  const isAppPostAllowed = getEnvString("UOS_ALLOW_APP_POST", "0") === "1";
  return isAppPostAllowed ? String(contextAuthToken || "").trim() : "";
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
    headers: buildHeaders(token),
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
    logger.info("[personalAgent] Created comment", { id });
    return { id };
  } catch {
    return null;
  }
}

export async function fetchIssueContext(params: { owner: string; repo: string; issueNumber: number; isPr: boolean; token: string }): Promise<IssueContext> {
  const { owner, repo, issueNumber, isPr, token } = params;
  if (!token) throw new Error("Missing token for GitHub context fetch");

  const marker = getReplyMarker();
  const commentLimit = Math.max(1, Math.min(50, Math.floor(getEnvNumber("UOS_CONTEXT_COMMENT_LIMIT", 20) ?? 20)));
  const commentMaxChars = Math.max(120, Math.min(4000, Math.floor(getEnvNumber("UOS_CONTEXT_COMMENT_MAX_CHARS", 800) ?? 800)));
  const issueBodyMaxChars = Math.max(200, Math.min(8000, Math.floor(getEnvNumber("UOS_CONTEXT_ISSUE_MAX_CHARS", 2000) ?? 2000)));

  const base = `https://api.github.com/repos/${owner}/${repo}`;
  const headers = buildHeaders(token);

  async function getJson(url: string): Promise<unknown> {
    const r = await fetch(url, { headers });
    if (!r.ok) throw new Error(`${url} -> HTTP ${r.status}`);
    return r.json();
  }

  const issue = await getJson(`${base}/issues/${issueNumber}`);
  const comments = await getJson(`${base}/issues/${issueNumber}/comments?per_page=${commentLimit}`);
  let pr: unknown = null;
  if (isPr) {
    try {
      pr = await getJson(`${base}/pulls/${issueNumber}`);
    } catch {
      /* ignore */
    }
  }

  const issueObj = toObject(issue);
  const slimIssue = {
    number: toNumber(issueObj.number) ?? issueNumber,
    title: toStringOrUndefined(issueObj.title),
    state: toStringOrUndefined(issueObj.state),
    author: toObject(issueObj.user).login as string | undefined,
    labels: Array.isArray(issueObj.labels)
      ? (issueObj.labels as unknown[]).map((l) => (typeof l === "string" ? l : toStringOrUndefined(toObject(l).name))).filter((v): v is string => Boolean(v))
      : [],
    body: truncate(stripMarker(toStringOrUndefined(issueObj.body), marker), issueBodyMaxChars),
    created_at: toStringOrUndefined(issueObj.created_at),
    updated_at: toStringOrUndefined(issueObj.updated_at),
    url: toStringOrUndefined(issueObj.url),
  };

  const slimComments = Array.isArray(comments)
    ? (comments as unknown[])
        .map((c) => {
          const obj = toObject(c);
          return {
            author: toStringOrUndefined(toObject(obj.user).login),
            created_at: toStringOrUndefined(obj.created_at),
            body: truncate(stripMarker(toStringOrUndefined(obj.body), marker), commentMaxChars),
            url: toStringOrUndefined(obj.url),
          };
        })
        .filter((c) => Boolean(c.body))
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

export async function fetchStyleExamples(params: { login: string; token: string; logger: { info: (...args: unknown[]) => unknown } }): Promise<StyleExample[]> {
  const { login, token, logger } = params;
  if (!token) return [];

  const limit = Math.max(0, Math.min(20, Math.floor(getEnvNumber("UOS_STYLE_EXAMPLES", 6) ?? 6)));
  if (limit === 0) return [];

  const lookbackDays = Math.max(30, Math.min(3650, Math.floor(getEnvNumber("UOS_STYLE_LOOKBACK_DAYS", 365) ?? 365)));
  const maxDateRaw = getEnvString("UOS_STYLE_MAX_DATE");
  let maxDate = maxDateRaw ? new Date(maxDateRaw) : new Date();
  if (Number.isNaN(maxDate.getTime())) maxDate = new Date();
  const from = new Date(maxDate.getTime() - lookbackDays * 24 * 60 * 60 * 1000);
  const marker = getReplyMarker();

  const headers = buildHeaders(token);
  return collectStyleExamples({
    login,
    from,
    to: maxDate,
    headers,
    limit,
    marker,
    logger,
  });
}

export async function maybeFetchIssueContext(args: {
  owner: string;
  repo: string;
  issueNumber: number;
  isPr: boolean;
  token: string;
  logger: { info: (...args: unknown[]) => unknown };
}): Promise<IssueContext | null> {
  const { owner, repo, issueNumber, isPr, token, logger } = args;
  const isContextFetchEnabled = (getEnvString("UOS_CONTEXT_FETCH", "1") ?? "1") === "1";
  if (!isContextFetchEnabled) return null;
  try {
    return await fetchIssueContext({ owner, repo, issueNumber, isPr, token });
  } catch (error) {
    logger.info("[personalAgent] Issue context fetch failed (non-fatal)", { error: String(error) });
    return null;
  }
}

export async function maybeFetchStyleExamples(args: {
  login: string;
  token: string;
  logger: { info: (...args: unknown[]) => unknown };
}): Promise<StyleExample[]> {
  const { login, token, logger } = args;
  const isStyleFetchEnabled = (getEnvString("UOS_STYLE_FETCH", "1") ?? "1") === "1";
  if (!isStyleFetchEnabled) return [];
  try {
    return await fetchStyleExamples({ login, token, logger });
  } catch (error) {
    logger.info("[personalAgent] Style fetch failed (non-fatal)", { error: String(error) });
    return [];
  }
}
