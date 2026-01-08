import { ConversationNode, ConversationKeyResult, listConversationNodesForKey, type AgentContext } from "./conversation-graph";
import {
  fetchVectorDocument,
  fetchVectorDocuments,
  fetchVectorDocumentsByParentId,
  findSimilarComments,
  findSimilarIssues,
  getVectorDbConfig,
  VectorDocument,
} from "./vector-db";

const DEFAULT_MAX_ITEMS = 10;
const DEFAULT_MAX_CHARS = 4000;
const DEFAULT_MAX_COMMENTS = 8;
const DEFAULT_MAX_COMMENT_CHARS = 256;
const DEFAULT_SIMILARITY_THRESHOLD = 0.8;
const DEFAULT_SIMILARITY_TOP_K = 5;
const DEFAULT_AUTHOR_BOOST = 0.07;
const DEFAULT_OWNER_BOOST = 0.04;
const DEFAULT_RECENCY_BOOST = 0.06;
const DEFAULT_SELECTOR_MAX_BODY_CHARS = 900;
const DEFAULT_SELECTOR_MAX_COMMENT_CHARS = 280;
const DEFAULT_SELECTOR_MAX_COMMENTS = 6;
const DEFAULT_GITHUB_CONCURRENCY = 4;
const DEFAULT_VECTOR_CONCURRENCY = 6;
const COMMENT_DOC_TYPES = ["issue_comment", "review_comment", "pull_request_review"];

function clampText(value: string, maxChars: number): string {
  const text = value.trim();
  if (!text) return "";
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)}...`;
}

async function mapWithConcurrency<TItem, TResult>(items: TItem[], limit: number, handler: (item: TItem) => Promise<TResult>): Promise<TResult[]> {
  if (items.length === 0) return [];
  const concurrency = Math.max(1, Math.trunc(limit));
  const results: TResult[] = new Array(items.length);
  let index = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (index < items.length) {
      const current = index;
      index += 1;
      results[current] = await handler(items[current]);
    }
  });
  await Promise.all(workers);
  return results;
}

function formatNodeLine(node: ConversationNode): string {
  const typeLabel = node.type === "Issue" ? "Issue" : "PR";
  const repoLabel = node.owner && node.repo ? `${node.owner}/${node.repo}` : "unknown";
  const numberLabel = typeof node.number === "number" ? `#${node.number}` : "";
  const title = node.title ? ` - ${node.title}` : "";
  return `- [${typeLabel}] ${repoLabel}${numberLabel}${title}`;
}

type CommentKind = "IssueComment" | "ReviewComment" | "Review";

type CommentEntry = Readonly<{
  id: string;
  kind: CommentKind;
  author: string;
  createdAt: string;
  url: string;
  body: string;
}>;

type DocumentKind = "Issue" | "PullRequest" | "IssueComment" | "ReviewComment" | "PullRequestReview";

type SelectionCandidate = Readonly<{
  id: string;
  kind: DocumentKind;
  source: "graph" | "semantic";
  owner: string;
  repo: string;
  number?: number;
  title?: string;
  url: string;
  createdAt?: string;
  body?: string;
  comments?: Array<{ author: string; date: string; body: string }>;
}>;

function indentBlock(text: string, indent: string): string {
  return text
    .split("\n")
    .map((line) => `${indent}${line}`)
    .join("\n");
}

function normalizeMarkdown(markdown: string | null): string {
  if (!markdown) return "";
  return markdown.trim();
}

function formatDateLabel(value: string): string {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return "";
  return new Date(parsed).toISOString().slice(0, 10);
}

function getCommentKindLabel(kind: CommentKind): string {
  if (kind === "IssueComment") return "Issue Comment";
  if (kind === "ReviewComment") return "Review Comment";
  return "Review";
}

function formatCommentLine(comment: CommentEntry): string {
  const kindLabel = getCommentKindLabel(comment.kind);
  const author = comment.author ? `@${comment.author}` : "unknown";
  const date = formatDateLabel(comment.createdAt);
  const meta = [author, date].filter(Boolean).join(" ");
  return `- [${kindLabel}] ${meta}`.trim();
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

function dedupeComments(nodes: CommentEntry[]): CommentEntry[] {
  const seen = new Set<string>();
  const out: CommentEntry[] = [];
  for (const node of nodes) {
    const key = `${node.kind}:${node.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(node);
  }
  return out;
}

function sortCommentsByDate(nodes: CommentEntry[]): CommentEntry[] {
  return [...nodes].sort((a, b) => {
    const aTime = Date.parse(a.createdAt);
    const bTime = Date.parse(b.createdAt);
    const aScore = Number.isFinite(aTime) ? aTime : 0;
    const bScore = Number.isFinite(bTime) ? bTime : 0;
    return bScore - aScore;
  });
}

function collectParticipantIds(context: AgentContext): Set<number> {
  const ids = new Set<number>();
  const payload = context.payload as Record<string, unknown>;
  const candidates = [
    (isRecord(payload.issue) ? payload.issue.user : null) as Record<string, unknown> | null,
    (isRecord(payload.pull_request) ? payload.pull_request.user : null) as Record<string, unknown> | null,
    (isRecord(payload.comment) ? payload.comment.user : null) as Record<string, unknown> | null,
  ];
  for (const user of candidates) {
    if (isRecord(user) && typeof user.id === "number" && Number.isFinite(user.id)) {
      ids.add(Math.trunc(user.id));
    }
  }
  return ids;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function buildCommentEntry(kind: CommentKind, payload: Record<string, unknown>): CommentEntry | null {
  const id = getPayloadId(payload);
  const timestamp =
    (typeof payload.created_at === "string" ? payload.created_at : "") || (typeof payload.submitted_at === "string" ? payload.submitted_at : "");
  const url = (typeof payload.html_url === "string" ? payload.html_url : "") || (typeof payload.url === "string" ? payload.url : "");
  const user = isRecord(payload.user) ? payload.user : null;
  const author = typeof user?.login === "string" ? user.login.trim() : "";
  const rawBody = typeof payload.body === "string" ? payload.body : "";

  if (!id || !url || !timestamp || (kind === "Review" && !rawBody.trim())) return null;

  return { id, kind, createdAt: timestamp, url, author, body: rawBody };
}

function getPayloadId(payload: Record<string, unknown>): string {
  if (typeof payload.node_id === "string") return payload.node_id;
  if (typeof payload.id === "number") return String(payload.id);
  if (typeof payload.id === "string") return payload.id;
  return "";
}

function getRepositoryOwner(context: AgentContext): string {
  const payload = context.payload as Record<string, unknown>;
  const repository = isRecord(payload.repository) ? payload.repository : null;
  const owner = isRecord(repository?.owner) ? repository?.owner : null;
  return typeof owner?.login === "string" ? owner.login.trim().toLowerCase() : "";
}

async function fetchPagedItems<T>(fetchPage: (page: number, perPage: number) => Promise<T[]>, perPage: number, maxItems: number): Promise<T[]> {
  const items: T[] = [];
  let page = 1;
  while (items.length < maxItems) {
    const batch = await fetchPage(page, perPage);
    if (batch.length === 0) break;
    items.push(...batch);
    if (batch.length < perPage) break;
    page += 1;
    if (page > 2000) break;
  }
  return items.slice(0, maxItems);
}

async function fetchIssueComments(context: AgentContext, node: ConversationNode, maxComments: number): Promise<CommentEntry[]> {
  const issueNumber = node.number;
  if (issueNumber === undefined || maxComments <= 0) return [];
  const perPage = Math.min(100, Math.max(1, maxComments));
  return await fetchIssueCommentsBatch(context, node, perPage, maxComments);
}

async function fetchPullComments(context: AgentContext, node: ConversationNode, maxComments: number): Promise<CommentEntry[]> {
  const issueNumber = node.number;
  if (issueNumber === undefined || maxComments <= 0) return [];
  const perPage = Math.min(100, Math.max(1, maxComments));
  const entries: CommentEntry[] = [];

  const results = await Promise.allSettled([
    fetchIssueCommentsBatch(context, node, perPage, maxComments),
    fetchReviewCommentsBatch(context, node, perPage, maxComments),
    fetchReviewsBatch(context, node, perPage, maxComments),
  ]);

  for (const res of results) {
    if (res.status === "fulfilled") entries.push(...res.value);
  }
  return entries;
}

async function fetchIssueCommentsBatch(context: AgentContext, node: ConversationNode, perPage: number, maxComments: number): Promise<CommentEntry[]> {
  try {
    const raw = await fetchPagedItems(
      async (page, pageSize) => {
        const { data } = await context.octokit.rest.issues.listComments({
          owner: node.owner,
          repo: node.repo,
          issue_number: node.number as number,
          per_page: pageSize,
          page,
          sort: "created",
          direction: "desc",
        });
        return data ?? [];
      },
      perPage,
      maxComments
    );
    return raw.map((c) => (isRecord(c) ? buildCommentEntry("IssueComment", c) : null)).filter((c): c is CommentEntry => !!c);
  } catch (error) {
    if (context.logger.debug) context.logger.debug(String(error), { err: error, nodeId: node.id });
    return [];
  }
}

async function fetchReviewCommentsBatch(context: AgentContext, node: ConversationNode, perPage: number, maxComments: number): Promise<CommentEntry[]> {
  try {
    const raw = await fetchPagedItems(
      async (page, pageSize) => {
        const { data } = await context.octokit.rest.pulls.listReviewComments({
          owner: node.owner,
          repo: node.repo,
          pull_number: node.number as number,
          per_page: pageSize,
          page,
          sort: "created",
          direction: "desc",
        });
        return data ?? [];
      },
      perPage,
      maxComments
    );
    return raw.map((c) => (isRecord(c) ? buildCommentEntry("ReviewComment", c) : null)).filter((c): c is CommentEntry => !!c);
  } catch (error) {
    if (context.logger.debug) context.logger.debug(String(error), { err: error, nodeId: node.id });
    return [];
  }
}

async function fetchReviewsBatch(context: AgentContext, node: ConversationNode, perPage: number, maxComments: number): Promise<CommentEntry[]> {
  try {
    const raw = await fetchPagedItems(
      async (page, pageSize) => {
        const { data } = await context.octokit.rest.pulls.listReviews({
          owner: node.owner,
          repo: node.repo,
          pull_number: node.number as number,
          per_page: pageSize,
          page,
        });
        return data ?? [];
      },
      perPage,
      maxComments
    );
    return raw.map((r) => (isRecord(r) ? buildCommentEntry("Review", r) : null)).filter((r): r is CommentEntry => !!r);
  } catch (error) {
    if (context.logger.debug) context.logger.debug(String(error), { err: error, nodeId: node.id });
    return [];
  }
}

async function fetchCommentsForNode(context: AgentContext, node: ConversationNode, maxComments: number): Promise<CommentEntry[]> {
  if (maxComments <= 0) return [];
  const raw = node.type === "PullRequest" ? await fetchPullComments(context, node, maxComments) : await fetchIssueComments(context, node, maxComments);
  const deduped = dedupeComments(raw);
  const sorted = sortCommentsByDate(deduped);
  return sorted.slice(0, maxComments);
}

async function fetchCommentsForNodes(context: AgentContext, nodes: ConversationNode[], maxComments: number): Promise<Map<string, CommentEntry[]>> {
  const map = new Map<string, CommentEntry[]>();
  const entries = await mapWithConcurrency(nodes, DEFAULT_GITHUB_CONCURRENCY, async (node) => {
    const comments = await fetchCommentsForNode(context, node, maxComments);
    return { id: node.id, comments };
  });
  for (const entry of entries) {
    map.set(entry.id, entry.comments);
  }
  return map;
}

async function fetchNodeBodyMarkdown(context: AgentContext, node: ConversationNode): Promise<string> {
  const issueNumber = node.number;
  if (issueNumber === undefined) return "";
  try {
    if (node.type === "PullRequest") {
      const { data } = await context.octokit.rest.pulls.get({
        owner: node.owner,
        repo: node.repo,
        pull_number: issueNumber,
      });
      return typeof data.body === "string" ? data.body : "";
    }
    const { data } = await context.octokit.rest.issues.get({
      owner: node.owner,
      repo: node.repo,
      issue_number: issueNumber,
    });
    return typeof data.body === "string" ? data.body : "";
  } catch (error) {
    context.logger.debug?.(String(error), { err: error, nodeId: node.id });
    return "";
  }
}

function buildNodeFromDocument(doc: VectorDocument): ConversationNode | null {
  const payload = isRecord(doc.payload) ? (doc.payload as Record<string, unknown>) : null;
  if (!payload) return null;
  const repository = isRecord(payload.repository) ? payload.repository : null;
  const owner = isRecord(repository?.owner) ? String(repository.owner.login || "").trim() : "";
  const repo = typeof repository?.name === "string" ? repository.name : "";
  if (!owner || !repo) return null;

  const source = getDocSource(doc, payload);
  if (!source) return null;

  const createdAt = typeof source.created_at === "string" ? source.created_at : "";
  const url = (typeof source.html_url === "string" ? source.html_url : "") || (typeof source.url === "string" ? source.url : "");
  if (!createdAt || !url) return null;

  return {
    id: doc.id,
    type: doc.docType === "issue" ? "Issue" : "PullRequest",
    createdAt,
    url,
    owner,
    repo,
    number: typeof source.number === "number" ? source.number : undefined,
    title: typeof source.title === "string" ? source.title : undefined,
  };
}

function getDocSource(doc: VectorDocument, payload: Record<string, unknown>): Record<string, unknown> | null {
  if (doc.docType === "issue") return isRecord(payload.issue) ? payload.issue : null;
  if (doc.docType === "pull_request") return isRecord(payload.pull_request) ? payload.pull_request : null;
  return null;
}

type DocumentDescriptor = Readonly<{
  id: string;
  kind: DocumentKind;
  owner: string;
  repo: string;
  number?: number;
  title?: string;
  url: string;
  author?: string;
  createdAt?: string;
}>;

function buildDescriptorFromDocument(doc: VectorDocument): DocumentDescriptor | null {
  const payload = isRecord(doc.payload) ? (doc.payload as Record<string, unknown>) : null;
  if (!payload) return null;
  const repository = isRecord(payload.repository) ? payload.repository : null;
  const owner = isRecord(repository?.owner) ? String(repository.owner.login || "").trim() : "";
  const repo = typeof repository?.name === "string" ? repository.name : "";
  if (!owner || !repo) return null;

  if (doc.docType === "issue" || doc.docType === "pull_request") {
    return buildDocDescriptorFromNode(doc);
  }

  if (COMMENT_DOC_TYPES.includes(doc.docType)) {
    return buildDocDescriptorFromComment(doc, payload, owner, repo);
  }

  return null;
}

function buildDocDescriptorFromNode(doc: VectorDocument): DocumentDescriptor | null {
  const node = buildNodeFromDocument(doc);
  if (!node) return null;
  return {
    id: doc.id,
    kind: node.type === "Issue" ? "Issue" : "PullRequest",
    owner: node.owner,
    repo: node.repo,
    number: node.number,
    title: node.title,
    url: node.url,
    createdAt: node.createdAt,
  };
}

function buildDocDescriptorFromComment(doc: VectorDocument, payload: Record<string, unknown>, owner: string, repo: string): DocumentDescriptor | null {
  const source = getCommentSource(payload);
  if (!source) return null;

  const timestamp = (typeof source.created_at === "string" ? source.created_at : "") || (typeof source.submitted_at === "string" ? source.submitted_at : "");
  const url = (typeof source.html_url === "string" ? source.html_url : "") || (typeof source.url === "string" ? source.url : "");
  if (!url || !timestamp) return null;

  const user = isRecord(source.user) ? source.user : null;
  const author = typeof user?.login === "string" ? user.login.trim() : undefined;
  const issue = (isRecord(payload.issue) ? payload.issue : payload.pull_request) as Record<string, unknown> | null;
  const number = isRecord(issue) && typeof issue.number === "number" ? issue.number : undefined;

  return {
    id: doc.id,
    kind: getDescriptorKind(doc.docType),
    owner,
    repo,
    number,
    url,
    author,
    createdAt: timestamp,
  };
}

function getCommentSource(payload: Record<string, unknown>): Record<string, unknown> | null {
  if (isRecord(payload.comment)) return payload.comment;
  if (isRecord(payload.review)) return payload.review;
  return null;
}

function getDescriptorKind(docType: string): DocumentDescriptor["kind"] {
  if (docType === "issue_comment") return "IssueComment";
  if (docType === "review_comment") return "ReviewComment";
  return "PullRequestReview";
}

function formatDescriptorLine(descriptor: DocumentDescriptor, options: Readonly<{ similarity?: number }> = {}): string {
  let typeLabel = "Review";
  if (descriptor.kind === "Issue") {
    typeLabel = "Issue";
  } else if (descriptor.kind === "PullRequest") {
    typeLabel = "PR";
  } else if (descriptor.kind === "IssueComment") {
    typeLabel = "Issue Comment";
  } else if (descriptor.kind === "ReviewComment") {
    typeLabel = "Review Comment";
  }
  const repoLabel = descriptor.owner && descriptor.repo ? `${descriptor.owner}/${descriptor.repo}` : "unknown";
  const numberLabel = typeof descriptor.number === "number" ? `#${descriptor.number}` : "";
  const title = descriptor.title ? ` - ${descriptor.title}` : "";
  const author = descriptor.author ? ` @${descriptor.author}` : "";
  const score = typeof options.similarity === "number" ? ` (sim ${options.similarity.toFixed(2)})` : "";
  return `- [${typeLabel}] ${repoLabel}${numberLabel}${title}${author}${score}`;
}

function formatSeedLabel(doc: VectorDocument): string {
  const descriptor = buildDescriptorFromDocument(doc);
  if (!descriptor) return doc.id;
  return formatDescriptorLine(descriptor).replace(/^- /, "");
}

function formatMatchedBy(labels: string[]): string {
  if (labels.length === 0) return "";
  const trimmed = labels.slice(0, 3);
  const extra = labels.length - trimmed.length;
  const suffix = extra > 0 ? ` +${extra} more` : "";
  return `${trimmed.join("; ")}${suffix}`;
}

function getDocumentTimestamp(doc: VectorDocument): number | null {
  const payload = isRecord(doc.payload) ? (doc.payload as Record<string, unknown>) : null;
  if (!payload) return null;

  let source: Record<string, unknown> | null = null;
  if (doc.docType === "issue" || doc.docType === "pull_request") {
    source = getDocSource(doc, payload);
  } else if (COMMENT_DOC_TYPES.includes(doc.docType)) {
    source = getCommentSource(payload);
  }

  if (!source) return null;
  const timeStr =
    (typeof source.updated_at === "string" ? source.updated_at : "") ||
    (typeof source.submitted_at === "string" ? source.submitted_at : "") ||
    (typeof source.created_at === "string" ? source.created_at : "");
  const parsed = Date.parse(timeStr);
  return Number.isFinite(parsed) ? parsed : null;
}

async function findSimilarForDocument(config: ReturnType<typeof getVectorDbConfig>, doc: VectorDocument): Promise<{ id: string; similarity: number }[]> {
  if (!config) return [];
  const embedding = Array.isArray(doc.embedding) ? doc.embedding : [];
  if (embedding.length === 0) return [];
  const [issueResults, commentResults] = await Promise.all([
    findSimilarIssues(config, {
      currentId: doc.id,
      embedding,
      threshold: DEFAULT_SIMILARITY_THRESHOLD,
      topK: DEFAULT_SIMILARITY_TOP_K,
    }),
    findSimilarComments(config, {
      currentId: doc.id,
      embedding,
      threshold: DEFAULT_SIMILARITY_THRESHOLD,
      topK: DEFAULT_SIMILARITY_TOP_K,
    }),
  ]);
  const combined = [...issueResults, ...commentResults];
  combined.sort((a, b) => b.similarity - a.similarity);
  const seen = new Set<string>();
  const deduped: { id: string; similarity: number }[] = [];
  for (const item of combined) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    deduped.push(item);
    if (deduped.length >= DEFAULT_SIMILARITY_TOP_K) break;
  }
  return deduped;
}

function buildCandidateComments(comments: CommentEntry[], maxComments: number, maxChars: number): Array<{ author: string; date: string; body: string }> {
  const entries: Array<{ author: string; date: string; body: string }> = [];
  for (const comment of comments.slice(0, maxComments)) {
    const body = clampText(normalizeMarkdown(comment.body), maxChars);
    if (!body) continue;
    entries.push({
      author: comment.author || "unknown",
      date: formatDateLabel(comment.createdAt),
      body,
    });
  }
  return entries;
}

function buildSelectorCandidateFromNode(
  node: ConversationNode,
  body: string,
  comments: CommentEntry[],
  source: SelectionCandidate["source"]
): SelectionCandidate {
  return {
    id: node.id,
    kind: node.type,
    source,
    owner: node.owner,
    repo: node.repo,
    number: node.number,
    title: node.title,
    url: node.url,
    createdAt: node.createdAt,
    body: clampText(body, DEFAULT_SELECTOR_MAX_BODY_CHARS),
    comments: buildCandidateComments(comments, DEFAULT_SELECTOR_MAX_COMMENTS, DEFAULT_SELECTOR_MAX_COMMENT_CHARS),
  };
}

function buildSelectorCandidateFromSemantic(entry: { doc: VectorDocument; descriptor: DocumentDescriptor }): SelectionCandidate | null {
  const { descriptor, doc } = entry;
  if (!descriptor.url) return null;
  return {
    id: doc.id,
    kind: descriptor.kind,
    source: "semantic",
    owner: descriptor.owner,
    repo: descriptor.repo,
    number: descriptor.number,
    title: descriptor.title,
    url: descriptor.url,
    createdAt: descriptor.createdAt,
    body: clampText(normalizeMarkdown(doc.markdown ?? ""), DEFAULT_SELECTOR_MAX_BODY_CHARS),
    comments: [],
  };
}

async function selectConversationCandidates(
  params: Readonly<{
    context: AgentContext;
    query: string;
    root: SelectionCandidate;
    candidates: SelectionCandidate[];
    maxSelections: number;
  }>
): Promise<Set<string> | null> {
  const query = params.query.trim();
  if (!query) return null;
  if (params.candidates.length === 0) return new Set([params.root.id]);
  return null;
}

type ContextParams = Readonly<{
  context: AgentContext;
  conversation: ConversationKeyResult;
  maxItems?: number;
  maxChars?: number;
  shouldIncludeSemantic?: boolean;
  shouldIncludeComments?: boolean;
  maxComments?: number;
  maxCommentChars?: number;
  query?: string;
  shouldUseSelector?: boolean;
}>;

type ContextOptions = Readonly<{
  maxItems: number;
  maxChars: number;
  maxComments: number;
  maxCommentChars: number;
  shouldIncludeComments: boolean;
  shouldIncludeSemantic: boolean;
}>;

function parseContextOptions(params: ContextParams): ContextOptions {
  return {
    maxItems: typeof params.maxItems === "number" && Number.isFinite(params.maxItems) ? Math.max(1, Math.trunc(params.maxItems)) : DEFAULT_MAX_ITEMS,
    maxChars: typeof params.maxChars === "number" && Number.isFinite(params.maxChars) ? Math.max(200, Math.trunc(params.maxChars)) : DEFAULT_MAX_CHARS,
    maxComments:
      typeof params.maxComments === "number" && Number.isFinite(params.maxComments) ? Math.max(0, Math.trunc(params.maxComments)) : DEFAULT_MAX_COMMENTS,
    maxCommentChars:
      typeof params.maxCommentChars === "number" && Number.isFinite(params.maxCommentChars)
        ? Math.max(40, Math.trunc(params.maxCommentChars))
        : DEFAULT_MAX_COMMENT_CHARS,
    shouldIncludeComments: params.shouldIncludeComments !== false,
    shouldIncludeSemantic: params.shouldIncludeSemantic !== false,
  };
}

export async function buildConversationContext(params: ContextParams): Promise<string> {
  const options = parseContextOptions(params);
  const { context, conversation } = params;

  const keyNodes = await listConversationNodesForKey(context, conversation.key, options.maxItems * 2, context.logger);
  const explicitNodes = dedupeNodes([...conversation.linked, ...keyNodes]).filter((node) => node.id !== conversation.root.id);
  const threadNodes = [conversation.root, ...explicitNodes];

  const commentMap =
    options.shouldIncludeComments && options.maxComments > 0
      ? await fetchCommentsForNodes(context, threadNodes, options.maxComments)
      : new Map<string, CommentEntry[]>();

  const semanticData = await gatherSemanticData(params, threadNodes, explicitNodes, options);
  const nodeBodyMap = await gatherNodeBodies(context, threadNodes, semanticData.docMap);

  const selectionIds = await resolveSelections(params, threadNodes, semanticData, nodeBodyMap, commentMap, options);

  const lines = renderContextLines(params, threadNodes, semanticData, nodeBodyMap, commentMap, selectionIds, options);
  if (lines.length === 0) return "";
  return clampText(lines.join("\n"), options.maxChars);
}

async function gatherNodeBodies(context: AgentContext, nodes: ConversationNode[], docMap: Map<string, VectorDocument>) {
  const nodeBodyMap = new Map<string, string>();
  const bodyEntries = await mapWithConcurrency(nodes, DEFAULT_GITHUB_CONCURRENCY, async (node) => {
    const existing = normalizeMarkdown(docMap.get(node.id)?.markdown ?? null);
    if (existing) return { id: node.id, body: existing };
    return { id: node.id, body: normalizeMarkdown(await fetchNodeBodyMarkdown(context, node)) };
  });
  for (const entry of bodyEntries) nodeBodyMap.set(entry.id, entry.body);
  return nodeBodyMap;
}

type SemanticEntry = { doc: VectorDocument; descriptor: DocumentDescriptor; similarity: number; matchedBy: string };
type SemanticData = {
  docMap: Map<string, VectorDocument>;
  semanticByParent: Map<string, SemanticEntry[]>;
};

async function gatherSemanticData(
  params: ContextParams,
  threadNodes: ConversationNode[],
  explicitNodes: ConversationNode[],
  options: ContextOptions
): Promise<SemanticData> {
  const { context, conversation } = params;
  const config = options.shouldIncludeSemantic ? getVectorDbConfig(context.logger) : null;
  const docMap = new Map<string, VectorDocument>();
  const semanticByParent = new Map<string, SemanticEntry[]>();
  if (!config) return { docMap, semanticByParent };

  const graphDocIds = new Set<string>([conversation.root.id]);
  const seedParentMap = new Map<string, string>();

  await populateGraphDocs(config, explicitNodes, conversation.root.id, docMap, graphDocIds, seedParentMap);
  await populateCommentDocs(config, threadNodes, options.maxComments, docMap, graphDocIds, seedParentMap);

  const similarityById = await gatherSimilarityResults(config, docMap, graphDocIds);
  await populateScoredCandidates(params, config, similarityById, docMap, seedParentMap, semanticByParent);

  return { docMap, semanticByParent };
}

async function populateGraphDocs(
  config: NonNullable<ReturnType<typeof getVectorDbConfig>>,
  explicitNodes: ConversationNode[],
  rootId: string,
  docMap: Map<string, VectorDocument>,
  graphDocIds: Set<string>,
  seedParentMap: Map<string, string>
) {
  const explicitDocs = await fetchVectorDocuments(
    config,
    explicitNodes.map((node) => node.id),
    { includeEmbedding: true }
  );
  for (const doc of explicitDocs) {
    docMap.set(doc.id, doc);
    graphDocIds.add(doc.id);
    seedParentMap.set(doc.id, doc.id);
  }

  const rootDoc = await fetchVectorDocument(config, rootId);
  if (rootDoc) {
    docMap.set(rootDoc.id, rootDoc);
    graphDocIds.add(rootDoc.id);
    seedParentMap.set(rootDoc.id, rootId);
  }
}

async function populateCommentDocs(
  config: NonNullable<ReturnType<typeof getVectorDbConfig>>,
  threadNodes: ConversationNode[],
  maxComments: number,
  docMap: Map<string, VectorDocument>,
  graphDocIds: Set<string>,
  seedParentMap: Map<string, string>
) {
  const commentSeedLimit = Math.max(DEFAULT_MAX_COMMENTS, maxComments);
  const results = await mapWithConcurrency(threadNodes, DEFAULT_VECTOR_CONCURRENCY, async (node) => {
    return {
      nodeId: node.id,
      comments: await fetchVectorDocumentsByParentId(config, node.id, {
        includeEmbedding: true,
        maxPerParent: commentSeedLimit,
        docTypes: COMMENT_DOC_TYPES,
      }),
    };
  });
  for (const entry of results) {
    for (const doc of entry.comments) {
      docMap.set(doc.id, doc);
      graphDocIds.add(doc.id);
      seedParentMap.set(doc.id, entry.nodeId);
    }
  }
}

async function gatherSimilarityResults(
  config: NonNullable<ReturnType<typeof getVectorDbConfig>>,
  docMap: Map<string, VectorDocument>,
  graphDocIds: Set<string>
) {
  const seedDocs = [...docMap.values()].filter((doc) => doc.embedding && doc.embedding.length > 0);
  const similarityById = new Map<string, { similarity: number; sources: Set<string> }>();
  const results = await mapWithConcurrency(seedDocs, DEFAULT_VECTOR_CONCURRENCY, async (doc) => {
    return { docId: doc.id, matches: await findSimilarForDocument(config, doc) };
  });
  for (const result of results) {
    updateSimilarityMap(result.matches, result.docId, graphDocIds, similarityById);
  }
  return similarityById;
}

function updateSimilarityMap(
  matches: { id: string; similarity: number }[],
  docId: string,
  graphDocIds: Set<string>,
  similarityById: Map<string, { similarity: number; sources: Set<string> }>
) {
  for (const match of matches) {
    if (graphDocIds.has(match.id)) continue;
    const existing = similarityById.get(match.id);
    if (existing) {
      existing.sources.add(docId);
      if (match.similarity > existing.similarity) existing.similarity = match.similarity;
    } else {
      similarityById.set(match.id, { similarity: match.similarity, sources: new Set([docId]) });
    }
  }
}

async function populateScoredCandidates(
  params: ContextParams,
  config: NonNullable<ReturnType<typeof getVectorDbConfig>>,
  similarityById: Map<string, { similarity: number; sources: Set<string> }>,
  docMap: Map<string, VectorDocument>,
  seedParentMap: Map<string, string>,
  semanticByParent: Map<string, SemanticEntry[]>
) {
  const candidateIds = [...similarityById.keys()];
  if (candidateIds.length === 0) return;

  const candidateDocs = await fetchVectorDocuments(config, candidateIds);
  for (const doc of candidateDocs) docMap.set(doc.id, doc);
  const scored = scoreCandidates(params, candidateDocs, similarityById);
  populateSemanticByParent(scored, similarityById, docMap, seedParentMap, semanticByParent);
}

function scoreCandidates(params: ContextParams, docs: VectorDocument[], similarityById: Map<string, { similarity: number; sources: Set<string> }>) {
  const candidates = docs
    .map((doc) => {
      const descriptor = buildDescriptorFromDocument(doc);
      const meta = similarityById.get(doc.id);
      if (!descriptor || !meta) return null;
      return { descriptor, doc, similarity: meta.similarity, timestampMs: getDocumentTimestamp(doc) };
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row));

  const participants = collectParticipantIds(params.context);
  const repoOwner = getRepositoryOwner(params.context);
  const timeValues = candidates.map((row) => row.timestampMs).filter((v): v is number => typeof v === "number");
  const minTime = timeValues.length ? Math.min(...timeValues) : null;
  const maxTime = timeValues.length ? Math.max(...timeValues) : null;
  const timeRange = minTime !== null && maxTime !== null ? maxTime - minTime : 0;

  return candidates.sort((a, b) => {
    const authorBoostA = a.doc.authorId !== null && participants.has(a.doc.authorId) ? DEFAULT_AUTHOR_BOOST : 0;
    const authorBoostB = b.doc.authorId !== null && participants.has(b.doc.authorId) ? DEFAULT_AUTHOR_BOOST : 0;
    const ownerBoostA = repoOwner && a.descriptor.owner.toLowerCase() === repoOwner ? DEFAULT_OWNER_BOOST : 0;
    const ownerBoostB = repoOwner && b.descriptor.owner.toLowerCase() === repoOwner ? DEFAULT_OWNER_BOOST : 0;
    const recencyA = timeRange > 0 && typeof a.timestampMs === "number" && minTime !== null ? (a.timestampMs - minTime) / timeRange : 1;
    const recencyB = timeRange > 0 && typeof b.timestampMs === "number" && minTime !== null ? (b.timestampMs - minTime) / timeRange : 1;
    const scoreA = a.similarity + authorBoostA + ownerBoostA + recencyA * DEFAULT_RECENCY_BOOST;
    const scoreB = b.similarity + authorBoostB + ownerBoostB + recencyB * DEFAULT_RECENCY_BOOST;
    return scoreB - scoreA;
  });
}

function populateSemanticByParent(
  candidates: Array<{ descriptor: DocumentDescriptor; doc: VectorDocument; similarity: number }>,
  similarityById: Map<string, { similarity: number; sources: Set<string> }>,
  docMap: Map<string, VectorDocument>,
  seedParentMap: Map<string, string>,
  out: Map<string, SemanticEntry[]>
) {
  const seenByParent = new Map<string, Set<string>>();
  for (const row of candidates) {
    const meta = similarityById.get(row.doc.id);
    if (!meta) continue;
    const matchedBy = formatMatchedBy([...meta.sources].map((id) => formatSeedLabel(docMap.get(id) as VectorDocument)));
    const entry = { doc: row.doc, descriptor: row.descriptor, similarity: row.similarity, matchedBy };
    for (const sourceId of meta.sources) {
      const parentId = seedParentMap.get(sourceId);
      if (!parentId) continue;
      const seen = seenByParent.get(parentId) ?? new Set<string>();
      if (seen.has(row.doc.id)) continue;
      seen.add(row.doc.id);
      seenByParent.set(parentId, seen);
      const list = out.get(parentId) ?? [];
      list.push(entry);
      out.set(parentId, list);
    }
  }
}

async function resolveSelections(
  params: ContextParams,
  threadNodes: ConversationNode[],
  semanticData: SemanticData,
  nodeBodyMap: Map<string, string>,
  commentMap: Map<string, CommentEntry[]>,
  options: ContextOptions
): Promise<Set<string> | null> {
  const query = typeof params.query === "string" ? params.query.trim() : "";
  if (!query || params.shouldUseSelector === false) return null;

  const rootComments = commentMap.get(params.conversation.root.id) ?? [];
  const rootCandidate = buildSelectorCandidateFromNode(params.conversation.root, nodeBodyMap.get(params.conversation.root.id) ?? "", rootComments, "graph");
  const candidateById = new Map<string, SelectionCandidate>();
  for (const node of threadNodes) {
    if (node.id === params.conversation.root.id) continue;
    candidateById.set(node.id, buildSelectorCandidateFromNode(node, nodeBodyMap.get(node.id) ?? "", commentMap.get(node.id) ?? [], "graph"));
  }
  for (const entries of semanticData.semanticByParent.values()) {
    for (const entry of entries) {
      const candidate = buildSelectorCandidateFromSemantic(entry);
      if (candidate && candidate.id !== params.conversation.root.id && !candidateById.has(candidate.id)) candidateById.set(candidate.id, candidate);
    }
  }
  return await selectConversationCandidates({
    context: params.context,
    query,
    root: rootCandidate,
    candidates: [...candidateById.values()],
    maxSelections: options.maxItems,
  });
}

function renderContextLines(
  params: ContextParams,
  threadNodes: ConversationNode[],
  semanticData: SemanticData,
  nodeBodyMap: Map<string, string>,
  commentMap: Map<string, CommentEntry[]>,
  selectionIds: Set<string> | null,
  options: ContextOptions
): string[] {
  const { semanticByParent } = semanticData;
  let filteredExplicitNodes = threadNodes.slice(1);
  let filteredSemanticByParent = semanticByParent;
  if (selectionIds && selectionIds.size > 0) {
    filteredSemanticByParent = new Map<string, SemanticEntry[]>();
    for (const [parentId, entries] of semanticByParent.entries()) {
      const filtered = entries.filter((entry) => selectionIds.has(entry.doc.id));
      if (filtered.length > 0) filteredSemanticByParent.set(parentId, filtered);
    }
    filteredExplicitNodes = filteredExplicitNodes.filter((node) => selectionIds.has(node.id) || filteredSemanticByParent.has(node.id));
  }

  const lines: string[] = [];
  const rootId = params.conversation.root.id;
  const rootContent = renderNodeContent(
    params.conversation.root,
    nodeBodyMap.get(rootId) || "",
    commentMap.get(rootId) || [],
    filteredSemanticByParent.get(rootId) || [],
    options
  );
  if (rootContent.length > 0) {
    lines.push("Current thread:");
    lines.push(...rootContent);
  }

  if (filteredExplicitNodes.length > 0) {
    if (lines.length > 0) lines.push("");
    lines.push("Conversation links (auto-merged):");
    for (const node of filteredExplicitNodes.slice(0, options.maxItems)) {
      lines.push(
        ...renderNodeContent(node, nodeBodyMap.get(node.id) || "", commentMap.get(node.id) || [], filteredSemanticByParent.get(node.id) || [], options)
      );
    }
  }
  return lines;
}

function renderNodeContent(node: ConversationNode, body: string, comments: CommentEntry[], semantic: SemanticEntry[], options: ContextOptions): string[] {
  const lines: string[] = [formatNodeLine(node)];
  if (node.url) lines.push(`  ${node.url}`);
  if (body) lines.push(indentBlock(body, "  "));

  if (comments.length > 0) {
    lines.push("  Comments:");
    lines.push(...renderCommentList(comments, options.maxCommentChars));
  }

  if (semantic.length > 0) {
    lines.push("  Similar (semantic):");
    lines.push(...renderSemanticList(semantic));
  }
  return lines;
}

function renderCommentList(comments: CommentEntry[], maxChars: number): string[] {
  const lines: string[] = [];
  for (const comment of comments) {
    lines.push(`  ${formatCommentLine(comment)}`);
    if (comment.url) lines.push(`    ${comment.url}`);
    const cBody = clampText(normalizeMarkdown(comment.body), maxChars);
    if (cBody) lines.push(indentBlock(cBody, "    "));
  }
  return lines;
}

function renderSemanticList(semantic: SemanticEntry[]): string[] {
  const entries = [...semantic].sort((a, b) => b.similarity - a.similarity).slice(0, DEFAULT_SIMILARITY_TOP_K);
  const lines: string[] = [];
  for (const entry of entries) {
    lines.push(`  ${formatDescriptorLine(entry.descriptor, { similarity: entry.similarity })}`);
    if (entry.descriptor.url) lines.push(`    ${entry.descriptor.url}`);
    if (entry.matchedBy) lines.push(`    matched by: ${entry.matchedBy}`);
    const sBody = normalizeMarkdown(entry.doc.markdown);
    if (sBody) lines.push(indentBlock(sBody, "    "));
  }
  return lines;
}
