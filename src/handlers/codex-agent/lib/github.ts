import { selectPatToken } from "./config";
import { toNumber, toObject, toStringOrUndefined, safeText } from "./utils";

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
