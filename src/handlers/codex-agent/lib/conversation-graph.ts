import { getKvClient, type KvKey, type KvLike, type LoggerLike } from "./kv-client";

type ConversationNodeType = "Issue" | "PullRequest";
type ReferenceKind = ConversationNodeType | "Unknown";

type OutboundReference = Readonly<{
  owner: string;
  repo: string;
  number: number;
  kind: ReferenceKind;
}>;

export type ConversationNode = Readonly<{
  id: string;
  type: ConversationNodeType;
  createdAt: string;
  url: string;
  owner: string;
  repo: string;
  number?: number;
  title?: string;
}>;

type ConversationNodeRecord = ConversationNode & Readonly<{ key: string; updatedAt: string }>;

type ConversationSnapshot = Readonly<{
  root: ConversationNode;
  linked: ConversationNode[];
}>;

export type ConversationKeyResult = Readonly<{
  key: string;
  root: ConversationNode;
  linked: ConversationNode[];
}>;

type GraphqlRequest = (query: string, variables?: Record<string, unknown>) => Promise<unknown>;

type OctokitLike = Readonly<{
  rest: {
    issues: {
      get: (params: { owner: string; repo: string; issue_number: number; headers?: Record<string, string> }) => Promise<{ data: Record<string, unknown> }>;
      listComments: (params: {
        owner: string;
        repo: string;
        issue_number: number;
        per_page?: number;
        page?: number;
        sort?: string;
        direction?: string;
        headers?: Record<string, string>;
      }) => Promise<{ data: Array<Record<string, unknown>> }>;
    };
    pulls: {
      get: (params: { owner: string; repo: string; pull_number: number }) => Promise<{ data: Record<string, unknown> }>;
      listReviewComments: (params: {
        owner: string;
        repo: string;
        pull_number: number;
        per_page?: number;
        page?: number;
        sort?: string;
        direction?: string;
        headers?: Record<string, string>;
      }) => Promise<{ data: Array<Record<string, unknown>> }>;
      listReviews: (params: {
        owner: string;
        repo: string;
        pull_number: number;
        per_page?: number;
        page?: number;
        headers?: Record<string, string>;
      }) => Promise<{ data: Array<Record<string, unknown>> }>;
    };
  };
  graphql?: GraphqlRequest;
  request?: (route: string, options?: Record<string, unknown>) => Promise<{ data?: unknown }>;
}>;

export type AgentContext = Readonly<{
  octokit: OctokitLike;
  payload: Record<string, unknown>;
  logger: LoggerLike;
}>;

type SimpleGraph = Readonly<{
  nodes: Map<string, ConversationNode>;
  edges: Set<string>;
}>;

const KV_ROOT: KvKey = ["ubiquityos", "agent", "conversation"];
const LIST_PAGE_SIZE = 200;
const MAX_ALIAS_DEPTH = 6;
const TIMELINE_PAGE_SIZE = 100;
const CLOSING_PAGE_SIZE = 50;
const OUTBOUND_COMMENT_LIMIT = 30;
const OUTBOUND_REFERENCE_LIMIT = 25;

const aliasCache = new Map<string, string>();

function createGraph(): SimpleGraph {
  return { nodes: new Map<string, ConversationNode>(), edges: new Set<string>() };
}

function edgeKey(a: string, b: string): string {
  return [a, b].sort((left, right) => left.localeCompare(right)).join("|");
}

function addNode(graph: SimpleGraph, id: string, node: ConversationNode): void {
  graph.nodes.set(id, node);
}

function hasNode(graph: SimpleGraph, id: string): boolean {
  return graph.nodes.has(id);
}

function addEdge(graph: SimpleGraph, a: string, b: string): void {
  graph.edges.add(edgeKey(a, b));
}

function hasEdge(graph: SimpleGraph, a: string, b: string): boolean {
  return graph.edges.has(edgeKey(a, b));
}

function listNodeIds(graph: SimpleGraph): string[] {
  return [...graph.nodes.keys()];
}

function getNodeAttributes(graph: SimpleGraph, id: string): ConversationNode | null {
  return graph.nodes.get(id) ?? null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  return undefined;
}

function nodeKey(nodeId: string): KvKey {
  return [...KV_ROOT, "node", nodeId];
}

function aliasKey(key: string): KvKey {
  return [...KV_ROOT, "alias", key];
}

function keyNodesPrefix(key: string): KvKey {
  return [...KV_ROOT, "key", key, "nodes"];
}

function keyNodeKey(key: string, nodeId: string): KvKey {
  return [...keyNodesPrefix(key), nodeId];
}

function parseNodeRecord(value: unknown): ConversationNodeRecord | null {
  if (!isRecord(value)) return null;
  const id = normalizeString(value.id);
  const key = normalizeString(value.key);
  const type = normalizeString(value.type) as ConversationNodeType;
  const createdAt = normalizeString(value.createdAt);
  const url = normalizeString(value.url);
  const owner = normalizeString(value.owner);
  const repo = normalizeString(value.repo);
  if (!id || !key || !type || !createdAt || !url || !owner || !repo) return null;
  const number = normalizeNumber(value.number);
  const title = normalizeString(value.title) || undefined;
  const updatedAt = normalizeString(value.updatedAt) || new Date().toISOString();
  return {
    id,
    key,
    type,
    createdAt,
    url,
    owner,
    repo,
    number,
    title,
    updatedAt,
  };
}

function parseConversationNode(value: unknown): ConversationNode | null {
  if (!isRecord(value)) return null;
  const type = normalizeString(value.__typename) as ConversationNodeType;
  if (type !== "Issue" && type !== "PullRequest") return null;
  const id = normalizeString(value.id);
  const createdAt = normalizeString(value.createdAt);
  const url = normalizeString(value.url);
  const { owner, repo } = extractOwnerRepo(value, url);
  if (!id || !createdAt || !url || !owner || !repo) return null;
  const number = normalizeNumber(value.number);
  const title = normalizeString(value.title) || undefined;
  return {
    id,
    type,
    createdAt,
    url,
    owner,
    repo,
    number,
    title,
  };
}

function extractOwnerRepo(value: Record<string, unknown>, url: string): { owner: string; repo: string } {
  const result = { owner: "", repo: "" };
  if (isRecord(value.repository)) {
    const repoName = normalizeString(value.repository.name);
    const ownerLogin = isRecord(value.repository.owner) ? normalizeString(value.repository.owner.login) : "";
    result.owner = ownerLogin;
    result.repo = repoName;
  }
  if ((!result.owner || !result.repo) && url) {
    const parsed = parseOwnerRepoFromUrl(url);
    result.owner = result.owner || parsed.owner;
    result.repo = result.repo || parsed.repo;
  }
  return result;
}

function parseOwnerRepoFromUrl(url: string): { owner: string; repo: string } {
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split("/").filter(Boolean);
    if (parts.length >= 2) {
      return { owner: parts[0], repo: parts[1] };
    }
  } catch {
    return { owner: "", repo: "" };
  }
  return { owner: "", repo: "" };
}

function parseGithubReferenceUrl(raw: string): OutboundReference | null {
  try {
    const parsed = new URL(raw, "https://github.com");
    if (parsed.hostname.toLowerCase() !== "github.com") return null;
    const parts = parsed.pathname.split("/").filter(Boolean);
    if (parts.length < 4) return null;
    const owner = normalizeString(parts[0]);
    const repo = normalizeString(parts[1]);
    const segment = normalizeString(parts[2]).toLowerCase();
    const number = normalizeNumber(Number(parts[3]));
    if (!owner || !repo || number === undefined) return null;
    if (segment === "issues") {
      return { owner, repo, number, kind: "Issue" };
    }
    if (segment === "pull" || segment === "pulls") {
      return { owner, repo, number, kind: "PullRequest" };
    }
    return null;
  } catch {
    return null;
  }
}

function extractReferencesFromHtml(html: string): OutboundReference[] {
  const out: OutboundReference[] = [];
  const trimmed = html.trim();
  if (!trimmed) return out;
  const hrefRegex = /href="([^"]+)"/gi;
  for (const match of trimmed.matchAll(hrefRegex)) {
    const href = normalizeString(match[1]);
    if (!href) continue;
    const ref = parseGithubReferenceUrl(href);
    if (ref) out.push(ref);
  }
  return out;
}

function extractReferencesFromText(text: string): OutboundReference[] {
  const out: OutboundReference[] = [];
  const trimmed = text.trim();
  if (!trimmed) return out;

  const urlRegex = /https?:\/\/github\.com\/([^/]+)\/([^/]+)\/(issues|pull|pulls)\/(\d+)/gi;
  for (const match of trimmed.matchAll(urlRegex)) {
    const owner = normalizeString(match[1]);
    const repo = normalizeString(match[2]);
    const number = normalizeNumber(Number(match[4]));
    if (!owner || !repo || number === undefined) continue;
    const segment = normalizeString(match[3]).toLowerCase();
    const kind: ReferenceKind = segment === "pull" || segment === "pulls" ? "PullRequest" : "Issue";
    out.push({ owner, repo, number, kind });
  }

  const repoRegex = /\b([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)#(\d+)\b/g;
  for (const match of trimmed.matchAll(repoRegex)) {
    const owner = normalizeString(match[1]);
    const repo = normalizeString(match[2]);
    const number = normalizeNumber(Number(match[3]));
    if (!owner || !repo || number === undefined) continue;
    out.push({ owner, repo, number, kind: "Unknown" });
  }
  return out;
}

function dedupeReferences(references: OutboundReference[]): OutboundReference[] {
  const map = new Map<string, OutboundReference>();
  for (const ref of references) {
    const key = `${ref.owner.toLowerCase()}/${ref.repo.toLowerCase()}#${ref.number}`;
    const current = map.get(key);
    if (!current || (current.kind === "Unknown" && ref.kind !== "Unknown")) {
      map.set(key, ref);
    }
  }
  return [...map.values()];
}

function isSameReference(root: ConversationNode, ref: OutboundReference): boolean {
  if (root.number === undefined) return false;
  return root.owner.toLowerCase() === ref.owner.toLowerCase() && root.repo.toLowerCase() === ref.repo.toLowerCase() && root.number === ref.number;
}

function getGraphqlClient(context: AgentContext): GraphqlRequest | null {
  const octokit = context.octokit as {
    graphql?: GraphqlRequest;
    request?: (route: string, options?: Record<string, unknown>) => Promise<{ data?: unknown }>;
  };
  if (typeof octokit.graphql === "function") {
    return octokit.graphql;
  }
  const request = octokit.request;
  if (typeof request !== "function") {
    return null;
  }
  return async function (query: string, variables?: Record<string, unknown>) {
    const response = await request("POST /graphql", { query, variables });
    return (response as { data?: unknown }).data ?? response;
  };
}

async function fetchIssueNode(context: AgentContext, owner: string, repo: string, number: number): Promise<ConversationNode | null> {
  const { data } = await context.octokit.rest.issues.get({ owner, repo, issue_number: number });
  if (data.pull_request) {
    return fetchPullRequestNode(context, owner, repo, number);
  }
  return parseConversationNode({
    __typename: "Issue",
    id: data.node_id,
    number: data.number,
    title: data.title,
    url: data.html_url ?? data.url,
    createdAt: data.created_at,
    repository: { name: repo, owner: { login: owner } },
  });
}

async function fetchPullRequestNode(context: AgentContext, owner: string, repo: string, number: number): Promise<ConversationNode | null> {
  const { data } = await context.octokit.rest.pulls.get({ owner, repo, pull_number: number });
  return parseConversationNode({
    __typename: "PullRequest",
    id: data.node_id,
    number: data.number,
    title: data.title,
    url: data.html_url ?? data.url,
    createdAt: data.created_at,
    repository: { name: repo, owner: { login: owner } },
  });
}

async function fetchReferenceNode(context: AgentContext, reference: OutboundReference): Promise<ConversationNode | null> {
  const owner = normalizeString(reference.owner);
  const repo = normalizeString(reference.repo);
  if (!owner || !repo || !Number.isFinite(reference.number)) return null;
  const number = Math.trunc(reference.number);
  try {
    if (reference.kind === "PullRequest") {
      return await fetchPullRequestNode(context, owner, repo, number);
    }
    return await fetchIssueNode(context, owner, repo, number);
  } catch (error) {
    context.logger.debug?.("Failed to resolve outbound reference (non-fatal)", { err: error, owner, repo, number });
    return null;
  }
}

async function fetchOutboundReferences(context: AgentContext, root: ConversationNode): Promise<ConversationNode[]> {
  const owner = normalizeString(root.owner);
  const repo = normalizeString(root.repo);
  const issueNumber = root.number;
  if (!owner || !repo || issueNumber === undefined) return [];

  const rawReferences: OutboundReference[] = [];
  const bodyResult = await fetchIssueBodyAndReferences(context, owner, repo, issueNumber);
  if (!bodyResult) return [];
  rawReferences.push(...bodyResult);

  const commentReferences = await fetchCommentReferences(context, owner, repo, issueNumber);
  rawReferences.push(...commentReferences);

  const references = dedupeReferences(rawReferences)
    .filter((ref) => !isSameReference(root, ref))
    .slice(0, OUTBOUND_REFERENCE_LIMIT);
  const nodes: ConversationNode[] = [];
  for (const ref of references) {
    const node = await fetchReferenceNode(context, ref);
    if (node && node.id !== root.id) nodes.push(node);
  }
  return nodes;
}

async function fetchIssueBodyAndReferences(context: AgentContext, owner: string, repo: string, issueNumber: number): Promise<OutboundReference[] | null> {
  try {
    const { data } = await context.octokit.rest.issues.get({
      owner,
      repo,
      issue_number: issueNumber,
      headers: { accept: "application/vnd.github.v3.html+json" },
    });
    const body = typeof data.body === "string" ? data.body : "";
    const bodyHtml = typeof data.body_html === "string" ? data.body_html : "";
    return bodyHtml ? extractReferencesFromHtml(bodyHtml) : extractReferencesFromText(body);
  } catch (error) {
    context.logger.debug?.("Failed to fetch issue body for outbound references (non-fatal)", { err: error, owner, repo, issueNumber });
    return null;
  }
}

async function fetchCommentReferences(context: AgentContext, owner: string, repo: string, issueNumber: number): Promise<OutboundReference[]> {
  const out: OutboundReference[] = [];
  try {
    const { data: comments } = await context.octokit.rest.issues.listComments({
      owner,
      repo,
      issue_number: issueNumber,
      per_page: OUTBOUND_COMMENT_LIMIT,
      sort: "created",
      direction: "desc",
      headers: { accept: "application/vnd.github.v3.html+json" },
    });
    for (const comment of comments ?? []) {
      const html = typeof comment?.body_html === "string" ? comment.body_html : "";
      const text = typeof comment?.body === "string" ? comment.body : "";
      if (html) {
        out.push(...extractReferencesFromHtml(html));
      } else if (text) {
        out.push(...extractReferencesFromText(text));
      }
    }
  } catch (error) {
    context.logger.debug?.("Failed to fetch issue comments for outbound references (non-fatal)", { err: error, owner, repo, issueNumber });
  }
  return out;
}

async function fetchConversationSnapshot(context: AgentContext, nodeId: string): Promise<ConversationSnapshot | null> {
  const graphql = getGraphqlClient(context);
  if (!graphql) return null;
  const issueOrPullFields = `
                __typename
                ... on Issue {
                  id
                  number
                  title
                  url
                  createdAt
                  repository {
                    name
                    owner {
                      login
                    }
                  }
                }
                ... on PullRequest {
                  id
                  number
                  title
                  url
                  createdAt
                  repository {
                    name
                    owner {
                      login
                    }
                  }
                }
              `;
  try {
    const data = (await graphql(
      `
        query ($nodeId: ID!, $timelineCount: Int!, $closingCount: Int!) {
          node(id: $nodeId) {
            __typename
            ... on Issue {
              id
              number
              title
              url
              createdAt
              repository {
                name
                owner {
                  login
                }
              }
              timelineItems(first: $timelineCount, itemTypes: [CROSS_REFERENCED_EVENT, CONNECTED_EVENT]) {
                nodes {
                  ... on CrossReferencedEvent {
                    source {${issueOrPullFields}}
                    target {${issueOrPullFields}}
                  }
                  ... on ConnectedEvent {
                    source {${issueOrPullFields}}
                    subject {${issueOrPullFields}}
                  }
                }
              }
            }
            ... on PullRequest {
              id
              number
              title
              url
              createdAt
              repository {
                name
                owner {
                  login
                }
              }
              closingIssuesReferences(first: $closingCount) {
                nodes {
                  __typename
                  id
                  number
                  title
                  url
                  createdAt
                  repository {
                    name
                    owner {
                      login
                    }
                  }
                }
              }
              timelineItems(first: $timelineCount, itemTypes: [CROSS_REFERENCED_EVENT, CONNECTED_EVENT]) {
                nodes {
                  ... on CrossReferencedEvent {
                    source {${issueOrPullFields}}
                    target {${issueOrPullFields}}
                  }
                  ... on ConnectedEvent {
                    source {${issueOrPullFields}}
                    subject {${issueOrPullFields}}
                  }
                }
              }
            }
          }
        }
      `,
      {
        nodeId,
        timelineCount: TIMELINE_PAGE_SIZE,
        closingCount: CLOSING_PAGE_SIZE,
      }
    )) as {
      node?: Record<string, unknown>;
    };

    const root = parseConversationNode(data.node);
    if (!root) return null;

    const linked: ConversationNode[] = [];
    extractTimelineNodes(data.node, root.id, linked);
    extractClosingNodes(data.node, root.id, linked);

    return { root, linked };
  } catch (error) {
    context.logger.debug?.("Failed to fetch conversation links (non-fatal)", { err: error });
    return null;
  }
}

function extractTimelineNodes(node: Record<string, unknown> | undefined, rootId: string, out: ConversationNode[]) {
  const timelineItems = isRecord(node?.timelineItems) ? node?.timelineItems : null;
  if (!timelineItems || !Array.isArray(timelineItems.nodes)) return;

  for (const item of timelineItems.nodes) {
    if (isRecord(item)) {
      addCandidateNodes(item, rootId, out);
    }
  }
}

function addCandidateNodes(item: Record<string, unknown>, rootId: string, out: ConversationNode[]) {
  for (const candidate of [item.source, item.subject, item.target]) {
    const parsed = parseConversationNode(candidate);
    if (parsed && parsed.id !== rootId) {
      out.push(parsed);
    }
  }
}

function extractClosingNodes(node: Record<string, unknown> | undefined, rootId: string, out: ConversationNode[]) {
  if (isRecord(node?.closingIssuesReferences) && Array.isArray(node?.closingIssuesReferences.nodes)) {
    for (const item of node?.closingIssuesReferences.nodes ?? []) {
      const parsed = parseConversationNode(item);
      if (parsed && parsed.id !== rootId) out.push(parsed);
    }
  }
}

async function getSubjectNode(context: AgentContext): Promise<ConversationNode | null> {
  const payload = context.payload as Record<string, unknown>;
  const repository = payload.repository as { owner?: { login?: string }; name?: string } | undefined;
  const owner = normalizeString(repository?.owner?.login);
  const repo = normalizeString(repository?.name);

  if ("pull_request" in payload && isRecord(payload.pull_request)) {
    return parseSubjectPullRequest(payload.pull_request as Record<string, unknown>, owner, repo);
  }

  if ("issue" in payload && isRecord(payload.issue)) {
    return await parseSubjectIssue(context, payload.issue as Record<string, unknown>, owner, repo);
  }

  return null;
}

function parseSubjectPullRequest(pr: Record<string, unknown>, owner: string, repo: string): ConversationNode | null {
  return parseConversationNode({
    __typename: "PullRequest",
    id: pr.node_id,
    number: pr.number,
    title: pr.title,
    url: pr.html_url ?? pr.url,
    createdAt: pr.created_at,
    repository: { name: repo, owner: { login: owner } },
  });
}

async function parseSubjectIssue(context: AgentContext, issue: Record<string, unknown>, owner: string, repo: string): Promise<ConversationNode | null> {
  if (issue.pull_request && owner && repo && typeof issue.number === "number") {
    try {
      const { data } = await context.octokit.rest.pulls.get({
        owner,
        repo,
        pull_number: issue.number,
      });
      const node = parseSubjectPullRequest(data as Record<string, unknown>, owner, repo);
      if (node) return node;
    } catch (error) {
      context.logger.debug?.("Failed to hydrate PR node for issue comment (non-fatal)", { err: error });
    }
  }

  return parseConversationNode({
    __typename: "Issue",
    id: issue.node_id,
    number: issue.number,
    title: issue.title,
    url: issue.html_url ?? issue.url,
    createdAt: issue.created_at,
    repository: { name: repo, owner: { login: owner } },
  });
}

async function resolveAliasKey(kv: KvLike, key: string): Promise<string> {
  if (aliasCache.has(key)) return aliasCache.get(key) ?? key;
  let current = key;
  for (let i = 0; i < MAX_ALIAS_DEPTH; i += 1) {
    const { value } = await kv.get(aliasKey(current));
    const next = normalizeString(value);
    if (!next) break;
    current = next;
  }
  aliasCache.set(key, current);
  return current;
}

async function getNodeRecord(kv: KvLike, nodeId: string): Promise<ConversationNodeRecord | null> {
  const { value } = await kv.get(nodeKey(nodeId));
  return parseNodeRecord(value);
}

function pickCanonicalNode(nodes: ConversationNode[]): ConversationNode {
  return [...nodes].sort((a, b) => compareNodes(a, b))[0] ?? nodes[0];
}

function compareNodes(a: ConversationNode, b: ConversationNode): number {
  function getTypeRank(node: ConversationNode) {
    return node.type === "Issue" ? 0 : 1;
  }
  const rankDiff = getTypeRank(a) - getTypeRank(b);
  if (rankDiff !== 0) return rankDiff;
  const aTime = Date.parse(a.createdAt);
  const bTime = Date.parse(b.createdAt);
  const aScore = Number.isFinite(aTime) ? aTime : Number.MAX_SAFE_INTEGER;
  const bScore = Number.isFinite(bTime) ? bTime : Number.MAX_SAFE_INTEGER;
  if (aScore !== bScore) return aScore - bScore;
  return a.id.localeCompare(b.id);
}

async function listNodesForKey(kv: KvLike, key: string): Promise<string[]> {
  const prefix = keyNodesPrefix(key);
  const nodeIds: string[] = [];
  let cursor: string | undefined;
  try {
    do {
      const iterator = kv.list({ prefix }, { limit: LIST_PAGE_SIZE, cursor });
      for await (const entry of iterator) {
        const parts = entry.key;
        const nodeId = parts[parts.length - 1];
        if (typeof nodeId === "string" && nodeId.trim()) nodeIds.push(nodeId);
      }
      cursor = iterator.cursor ? String(iterator.cursor) : "";
    } while (cursor);
  } catch {
    return nodeIds;
  }
  return nodeIds;
}

async function persistNode(kv: KvLike, node: ConversationNode, key: string): Promise<void> {
  const updatedAt = new Date().toISOString();
  const record: ConversationNodeRecord = { ...node, key, updatedAt };
  await kv.set(nodeKey(node.id), record);
  await kv.set(keyNodeKey(key, node.id), 1);
}

async function mergeKeys(kv: KvLike, fromKey: string, toKey: string): Promise<void> {
  if (fromKey === toKey) return;
  await kv.set(aliasKey(fromKey), toKey);
  const nodeIds = await listNodesForKey(kv, fromKey);
  for (const nodeId of nodeIds) {
    const record = await getNodeRecord(kv, nodeId);
    if (!record) continue;
    await persistNode(
      kv,
      { ...record, id: nodeId, type: record.type, createdAt: record.createdAt, url: record.url, owner: record.owner, repo: record.repo },
      toKey
    );
  }
}

function buildGraph(root: ConversationNode, linked: ConversationNode[]): SimpleGraph {
  const graph = createGraph();
  addNode(graph, root.id, root);
  for (const node of linked) {
    if (!hasNode(graph, node.id)) addNode(graph, node.id, node);
    if (!hasEdge(graph, root.id, node.id)) {
      addEdge(graph, root.id, node.id);
    }
  }
  return graph;
}

function dedupeNodes(nodes: ConversationNode[]): ConversationNode[] {
  const seen = new Set<string>();
  const out: ConversationNode[] = [];
  for (const node of nodes) {
    if (seen.has(node.id)) continue;
    seen.add(node.id);
    out.push(node);
  }
  return out;
}

export async function resolveConversationKeyForContext(context: AgentContext, logger?: LoggerLike): Promise<ConversationKeyResult | null> {
  const snapshotData = await getConversationNodes(context);
  if (!snapshotData) return null;

  const kv = await getKvClient(logger ?? context.logger);
  if (!kv) return { key: snapshotData.root.id, root: snapshotData.root, linked: snapshotData.linked };

  return await resolveConversationKeyWithKv(kv, snapshotData);
}

async function resolveConversationKeyWithKv(
  kv: KvLike,
  snapshotData: NonNullable<Awaited<ReturnType<typeof getConversationNodes>>>
): Promise<ConversationKeyResult> {
  const { nodes, graph } = snapshotData;
  const { existingKeys, canonical, canonicalKey } = await collectAndPickCanonical(kv, nodes);
  ensureCanonicalInGraph(graph, canonical, canonicalKey);
  await applyKeyResolutionEdits(kv, nodes, existingKeys, canonical, canonicalKey);
  return { key: canonicalKey, root: snapshotData.root, linked: snapshotData.linked };
}

async function applyKeyResolutionEdits(kv: KvLike, nodes: ConversationNode[], existingKeys: Set<string>, canonical: ConversationNode, canonicalKey: string) {
  await mergeExistingKeys(kv, existingKeys, canonicalKey);
  await persistNodes(kv, nodes, canonical, canonicalKey);
}

async function collectAndPickCanonical(kv: KvLike, nodes: ConversationNode[]) {
  const existingKeys = new Set<string>();
  const candidateNodes: ConversationNode[] = await collectCandidateNodes(kv, nodes, existingKeys);

  const canonical = pickCanonicalNode(dedupeNodes(candidateNodes));
  const canonicalKey = canonical.id;

  return { existingKeys, canonical, canonicalKey };
}

function ensureCanonicalInGraph(graph: SimpleGraph, canonical: ConversationNode, canonicalKey: string) {
  if (!hasNode(graph, canonicalKey)) {
    addNode(graph, canonicalKey, canonical);
  }
}

async function getConversationNodes(context: AgentContext) {
  const subject = await getSubjectNode(context);
  if (!subject) return null;

  const snapshot = (await fetchConversationSnapshot(context, subject.id)) ?? { root: subject, linked: [] };
  const outbound = await fetchOutboundReferences(context, snapshot.root);
  const linked = dedupeNodes([...snapshot.linked, ...outbound]);
  const graph = buildGraph(snapshot.root, linked);
  const nodes = listNodeIds(graph)
    .map((id) => getNodeAttributes(graph, id))
    .filter((node): node is ConversationNode => Boolean(node));
  return { root: snapshot.root, linked, nodes, graph };
}

async function persistNodes(kv: KvLike, nodes: ConversationNode[], canonical: ConversationNode, canonicalKey: string) {
  for (const node of nodes) {
    await persistNode(kv, node, canonicalKey);
  }
  await persistNode(kv, canonical, canonicalKey);
}

async function mergeExistingKeys(kv: KvLike, existingKeys: Set<string>, canonicalKey: string) {
  for (const key of existingKeys) {
    const resolvedKey = await resolveAliasKey(kv, key);
    if (resolvedKey !== canonicalKey) await mergeKeys(kv, resolvedKey, canonicalKey);
  }
}

async function collectCandidateNodes(kv: KvLike, nodes: ConversationNode[], outExistingKeys: Set<string>): Promise<ConversationNode[]> {
  const outCandidateNodes: ConversationNode[] = [...nodes];
  for (const node of nodes) {
    const record = await getNodeRecord(kv, node.id);
    if (record) {
      const resolvedKey = await resolveAliasKey(kv, record.key);
      outExistingKeys.add(resolvedKey);
      outCandidateNodes.push(recordToNode(record));
    }
  }
  await collectExistingKeyRecords(kv, outExistingKeys, outCandidateNodes);
  return outCandidateNodes;
}

async function collectExistingKeyRecords(kv: KvLike, existingKeys: Set<string>, outCandidateNodes: ConversationNode[]) {
  for (const key of existingKeys) {
    const record = await getNodeRecord(kv, key);
    if (record) outCandidateNodes.push(recordToNode(record));
  }
}

function recordToNode(record: ConversationNodeRecord): ConversationNode {
  return {
    id: record.id,
    type: record.type,
    createdAt: record.createdAt,
    url: record.url,
    owner: record.owner,
    repo: record.repo,
    number: record.number,
    title: record.title,
  };
}

export async function listConversationNodesForKey(context: AgentContext, key: string, limit = 40, logger?: LoggerLike): Promise<ConversationNode[]> {
  const trimmedKey = normalizeString(key);
  if (!trimmedKey) return [];
  const kv = await getKvClient(logger ?? context.logger);
  if (!kv) return [];
  const nodeIds = await listNodesForKey(kv, trimmedKey);
  const uniqueIds = [...new Set(nodeIds)].slice(0, Math.max(0, limit));
  const nodes: ConversationNode[] = [];
  for (const nodeId of uniqueIds) {
    const record = await getNodeRecord(kv, nodeId);
    if (!record) continue;
    nodes.push(recordToNode(record));
  }
  return nodes;
}
