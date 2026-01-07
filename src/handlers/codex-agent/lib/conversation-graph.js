/* eslint-disable sonarjs/cognitive-complexity */
import { getKvClient } from "./kv-client";
const KV_ROOT = ["ubiquityos", "agent", "conversation"];
const LIST_PAGE_SIZE = 200;
const MAX_ALIAS_DEPTH = 6;
const TIMELINE_PAGE_SIZE = 100;
const CLOSING_PAGE_SIZE = 50;
const OUTBOUND_COMMENT_LIMIT = 30;
const OUTBOUND_REFERENCE_LIMIT = 25;
const aliasCache = new Map();
function createGraph() {
    return { nodes: new Map(), edges: new Set() };
}
function edgeKey(a, b) {
    return [a, b].sort((left, right) => left.localeCompare(right)).join("|");
}
function addNode(graph, id, node) {
    graph.nodes.set(id, node);
}
function hasNode(graph, id) {
    return graph.nodes.has(id);
}
function addEdge(graph, a, b) {
    graph.edges.add(edgeKey(a, b));
}
function hasEdge(graph, a, b) {
    return graph.edges.has(edgeKey(a, b));
}
function listNodeIds(graph) {
    return [...graph.nodes.keys()];
}
function getNodeAttributes(graph, id) {
    return graph.nodes.get(id) ?? null;
}
function isRecord(value) {
    return typeof value === "object" && value !== null;
}
function normalizeString(value) {
    return typeof value === "string" ? value.trim() : "";
}
function normalizeNumber(value) {
    if (typeof value === "number" && Number.isFinite(value))
        return Math.trunc(value);
    return undefined;
}
function nodeKey(nodeId) {
    return [...KV_ROOT, "node", nodeId];
}
function aliasKey(key) {
    return [...KV_ROOT, "alias", key];
}
function keyNodesPrefix(key) {
    return [...KV_ROOT, "key", key, "nodes"];
}
function keyNodeKey(key, nodeId) {
    return [...keyNodesPrefix(key), nodeId];
}
function parseNodeRecord(value) {
    if (!isRecord(value))
        return null;
    const id = normalizeString(value.id);
    const key = normalizeString(value.key);
    const type = normalizeString(value.type);
    const createdAt = normalizeString(value.createdAt);
    const url = normalizeString(value.url);
    const owner = normalizeString(value.owner);
    const repo = normalizeString(value.repo);
    if (!id || !key || !type || !createdAt || !url || !owner || !repo)
        return null;
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
function parseConversationNode(value) {
    if (!isRecord(value))
        return null;
    const type = normalizeString(value.__typename);
    if (type !== "Issue" && type !== "PullRequest")
        return null;
    const id = normalizeString(value.id);
    const createdAt = normalizeString(value.createdAt);
    const url = normalizeString(value.url);
    let owner = "";
    let repo = "";
    if (isRecord(value.repository)) {
        const repoName = normalizeString(value.repository.name);
        const ownerLogin = isRecord(value.repository.owner) ? normalizeString(value.repository.owner.login) : "";
        owner = ownerLogin;
        repo = repoName;
    }
    if ((!owner || !repo) && url) {
        const parsed = parseOwnerRepoFromUrl(url);
        owner = owner || parsed.owner;
        repo = repo || parsed.repo;
    }
    if (!id || !createdAt || !url || !owner || !repo)
        return null;
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
function parseOwnerRepoFromUrl(url) {
    try {
        const parsed = new URL(url);
        const parts = parsed.pathname.split("/").filter(Boolean);
        if (parts.length >= 2) {
            return { owner: parts[0], repo: parts[1] };
        }
    }
    catch {
        return { owner: "", repo: "" };
    }
    return { owner: "", repo: "" };
}
function parseGithubReferenceUrl(raw) {
    try {
        const parsed = new URL(raw, "https://github.com");
        if (parsed.hostname.toLowerCase() !== "github.com")
            return null;
        const parts = parsed.pathname.split("/").filter(Boolean);
        if (parts.length < 4)
            return null;
        const owner = normalizeString(parts[0]);
        const repo = normalizeString(parts[1]);
        const segment = normalizeString(parts[2]).toLowerCase();
        const number = normalizeNumber(Number(parts[3]));
        if (!owner || !repo || number === undefined)
            return null;
        if (segment === "issues") {
            return { owner, repo, number, kind: "Issue" };
        }
        if (segment === "pull" || segment === "pulls") {
            return { owner, repo, number, kind: "PullRequest" };
        }
        return null;
    }
    catch {
        return null;
    }
}
function extractReferencesFromHtml(html) {
    const out = [];
    const trimmed = html.trim();
    if (!trimmed)
        return out;
    const hrefRegex = /href="([^"]+)"/gi;
    for (const match of trimmed.matchAll(hrefRegex)) {
        const href = normalizeString(match[1]);
        if (!href)
            continue;
        const ref = parseGithubReferenceUrl(href);
        if (ref)
            out.push(ref);
    }
    return out;
}
function extractReferencesFromText(text) {
    const out = [];
    const trimmed = text.trim();
    if (!trimmed)
        return out;
    const urlRegex = /https?:\/\/github\.com\/([^/]+)\/([^/]+)\/(issues|pull|pulls)\/(\d+)/gi;
    for (const match of trimmed.matchAll(urlRegex)) {
        const owner = normalizeString(match[1]);
        const repo = normalizeString(match[2]);
        const number = normalizeNumber(Number(match[4]));
        if (!owner || !repo || number === undefined)
            continue;
        const segment = normalizeString(match[3]).toLowerCase();
        const kind = segment === "pull" || segment === "pulls" ? "PullRequest" : "Issue";
        out.push({ owner, repo, number, kind });
    }
    const repoRegex = /\b([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)#(\d+)\b/g;
    for (const match of trimmed.matchAll(repoRegex)) {
        const owner = normalizeString(match[1]);
        const repo = normalizeString(match[2]);
        const number = normalizeNumber(Number(match[3]));
        if (!owner || !repo || number === undefined)
            continue;
        out.push({ owner, repo, number, kind: "Unknown" });
    }
    return out;
}
function dedupeReferences(references) {
    const map = new Map();
    for (const ref of references) {
        const key = `${ref.owner.toLowerCase()}/${ref.repo.toLowerCase()}#${ref.number}`;
        const current = map.get(key);
        if (!current || (current.kind === "Unknown" && ref.kind !== "Unknown")) {
            map.set(key, ref);
        }
    }
    return [...map.values()];
}
function isSameReference(root, ref) {
    if (root.number === undefined)
        return false;
    return root.owner.toLowerCase() === ref.owner.toLowerCase() && root.repo.toLowerCase() === ref.repo.toLowerCase() && root.number === ref.number;
}
function getGraphqlClient(context) {
    const octokit = context.octokit;
    if (typeof octokit.graphql === "function") {
        return octokit.graphql;
    }
    const request = octokit.request;
    if (typeof request !== "function") {
        return null;
    }
    return async (query, variables) => {
        const response = await request("POST /graphql", { query, variables });
        return response.data ?? response;
    };
}
async function fetchIssueNode(context, owner, repo, number) {
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
async function fetchPullRequestNode(context, owner, repo, number) {
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
async function fetchReferenceNode(context, reference) {
    const owner = normalizeString(reference.owner);
    const repo = normalizeString(reference.repo);
    if (!owner || !repo || !Number.isFinite(reference.number))
        return null;
    const number = Math.trunc(reference.number);
    try {
        if (reference.kind === "PullRequest") {
            return await fetchPullRequestNode(context, owner, repo, number);
        }
        if (reference.kind === "Issue") {
            return await fetchIssueNode(context, owner, repo, number);
        }
        return await fetchIssueNode(context, owner, repo, number);
    }
    catch (error) {
        context.logger.debug({ err: error, owner, repo, number }, "Failed to resolve outbound reference (non-fatal)");
        return null;
    }
}
async function fetchOutboundReferences(context, root) {
    const owner = normalizeString(root.owner);
    const repo = normalizeString(root.repo);
    const issueNumber = root.number;
    if (!owner || !repo || issueNumber === undefined)
        return [];
    let body = "";
    let bodyHtml = "";
    try {
        const { data } = await context.octokit.rest.issues.get({
            owner,
            repo,
            issue_number: issueNumber,
            headers: { accept: "application/vnd.github.v3.html+json" },
        });
        body = typeof data.body === "string" ? data.body : "";
        bodyHtml = typeof data.body_html === "string" ? data.body_html : "";
    }
    catch (error) {
        context.logger.debug({ err: error, owner, repo, issueNumber }, "Failed to fetch issue body for outbound references (non-fatal)");
        return [];
    }
    const rawReferences = bodyHtml ? extractReferencesFromHtml(bodyHtml) : extractReferencesFromText(body);
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
                rawReferences.push(...extractReferencesFromHtml(html));
            }
            else if (text) {
                rawReferences.push(...extractReferencesFromText(text));
            }
        }
    }
    catch (error) {
        context.logger.debug({ err: error, owner, repo, issueNumber }, "Failed to fetch issue comments for outbound references (non-fatal)");
    }
    const references = dedupeReferences(rawReferences)
        .filter((ref) => !isSameReference(root, ref))
        .slice(0, OUTBOUND_REFERENCE_LIMIT);
    const nodes = [];
    for (const ref of references) {
        const node = await fetchReferenceNode(context, ref);
        if (node && node.id !== root.id)
            nodes.push(node);
    }
    return nodes;
}
async function fetchConversationSnapshot(context, nodeId) {
    const graphql = getGraphqlClient(context);
    if (!graphql)
        return null;
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
        const data = (await graphql(`
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
      `, {
            nodeId,
            timelineCount: TIMELINE_PAGE_SIZE,
            closingCount: CLOSING_PAGE_SIZE,
        }));
        const root = parseConversationNode(data.node);
        if (!root)
            return null;
        const linked = [];
        const timelineItems = isRecord(data.node?.timelineItems) ? data.node?.timelineItems : null;
        if (timelineItems && Array.isArray(timelineItems.nodes)) {
            for (const item of timelineItems.nodes) {
                if (!isRecord(item))
                    continue;
                for (const candidate of [item.source, item.subject, item.target]) {
                    const parsed = parseConversationNode(candidate);
                    if (parsed && parsed.id !== root.id)
                        linked.push(parsed);
                }
            }
        }
        if (isRecord(data.node?.closingIssuesReferences) && Array.isArray(data.node?.closingIssuesReferences.nodes)) {
            for (const node of data.node?.closingIssuesReferences.nodes ?? []) {
                const parsed = parseConversationNode(node);
                if (parsed && parsed.id !== root.id)
                    linked.push(parsed);
            }
        }
        return { root, linked };
    }
    catch (error) {
        context.logger.debug({ err: error }, "Failed to fetch conversation links (non-fatal)");
        return null;
    }
}
async function getSubjectNode(context) {
    const payload = context.payload;
    const repository = payload.repository;
    const owner = normalizeString(repository?.owner?.login);
    const repo = normalizeString(repository?.name);
    if ("pull_request" in payload && isRecord(payload.pull_request)) {
        const pr = payload.pull_request;
        const node = parseConversationNode({
            __typename: "PullRequest",
            id: pr.node_id,
            number: pr.number,
            title: pr.title,
            url: pr.html_url ?? pr.url,
            createdAt: pr.created_at,
            repository: { name: repo, owner: { login: owner } },
        });
        if (node)
            return node;
    }
    if ("issue" in payload && isRecord(payload.issue)) {
        const issue = payload.issue;
        const isPullRequest = Boolean(issue.pull_request);
        if (isPullRequest && owner && repo && typeof issue.number === "number") {
            try {
                const { data } = await context.octokit.rest.pulls.get({
                    owner,
                    repo,
                    pull_number: issue.number,
                });
                const node = parseConversationNode({
                    __typename: "PullRequest",
                    id: data.node_id,
                    number: data.number,
                    title: data.title,
                    url: data.html_url ?? data.url,
                    createdAt: data.created_at,
                    repository: { name: repo, owner: { login: owner } },
                });
                if (node)
                    return node;
            }
            catch (error) {
                context.logger.debug({ err: error }, "Failed to hydrate PR node for issue comment (non-fatal)");
            }
        }
        const node = parseConversationNode({
            __typename: "Issue",
            id: issue.node_id,
            number: issue.number,
            title: issue.title,
            url: issue.html_url ?? issue.url,
            createdAt: issue.created_at,
            repository: { name: repo, owner: { login: owner } },
        });
        if (node)
            return node;
    }
    return null;
}
async function resolveAliasKey(kv, key) {
    if (aliasCache.has(key))
        return aliasCache.get(key) ?? key;
    let current = key;
    for (let i = 0; i < MAX_ALIAS_DEPTH; i += 1) {
        const { value } = await kv.get(aliasKey(current));
        const next = normalizeString(value);
        if (!next)
            break;
        current = next;
    }
    aliasCache.set(key, current);
    return current;
}
async function getNodeRecord(kv, nodeId) {
    const { value } = await kv.get(nodeKey(nodeId));
    return parseNodeRecord(value);
}
function pickCanonicalNode(nodes) {
    return [...nodes].sort((a, b) => compareNodes(a, b))[0] ?? nodes[0];
}
function compareNodes(a, b) {
    const typeRank = (node) => (node.type === "Issue" ? 0 : 1);
    const rankDiff = typeRank(a) - typeRank(b);
    if (rankDiff !== 0)
        return rankDiff;
    const aTime = Date.parse(a.createdAt);
    const bTime = Date.parse(b.createdAt);
    const aScore = Number.isFinite(aTime) ? aTime : Number.MAX_SAFE_INTEGER;
    const bScore = Number.isFinite(bTime) ? bTime : Number.MAX_SAFE_INTEGER;
    if (aScore !== bScore)
        return aScore - bScore;
    return a.id.localeCompare(b.id);
}
async function listNodesForKey(kv, key) {
    const prefix = keyNodesPrefix(key);
    const nodeIds = [];
    let cursor;
    try {
        do {
            const iterator = kv.list({ prefix }, { limit: LIST_PAGE_SIZE, cursor });
            for await (const entry of iterator) {
                const parts = entry.key;
                const nodeId = parts[parts.length - 1];
                if (typeof nodeId === "string" && nodeId.trim())
                    nodeIds.push(nodeId);
            }
            cursor = iterator.cursor ? String(iterator.cursor) : "";
        } while (cursor);
    }
    catch {
        return nodeIds;
    }
    return nodeIds;
}
async function persistNode(kv, node, key) {
    const updatedAt = new Date().toISOString();
    const record = { ...node, key, updatedAt };
    await kv.set(nodeKey(node.id), record);
    await kv.set(keyNodeKey(key, node.id), 1);
}
async function mergeKeys(kv, fromKey, toKey) {
    if (fromKey === toKey)
        return;
    await kv.set(aliasKey(fromKey), toKey);
    const nodeIds = await listNodesForKey(kv, fromKey);
    for (const nodeId of nodeIds) {
        const record = await getNodeRecord(kv, nodeId);
        if (!record)
            continue;
        await persistNode(kv, { ...record, id: nodeId, type: record.type, createdAt: record.createdAt, url: record.url, owner: record.owner, repo: record.repo }, toKey);
    }
}
function buildGraph(root, linked) {
    const graph = createGraph();
    addNode(graph, root.id, root);
    for (const node of linked) {
        if (!hasNode(graph, node.id))
            addNode(graph, node.id, node);
        if (!hasEdge(graph, root.id, node.id)) {
            addEdge(graph, root.id, node.id);
        }
    }
    return graph;
}
function dedupeNodes(nodes) {
    const seen = new Set();
    const out = [];
    for (const node of nodes) {
        if (seen.has(node.id))
            continue;
        seen.add(node.id);
        out.push(node);
    }
    return out;
}
export async function resolveConversationKeyForContext(context, logger) {
    const subject = await getSubjectNode(context);
    if (!subject)
        return null;
    const snapshot = (await fetchConversationSnapshot(context, subject.id)) ?? { root: subject, linked: [] };
    const outbound = await fetchOutboundReferences(context, snapshot.root);
    const linked = dedupeNodes([...snapshot.linked, ...outbound]);
    const graph = buildGraph(snapshot.root, linked);
    const nodes = listNodeIds(graph)
        .map((id) => getNodeAttributes(graph, id))
        .filter((node) => Boolean(node));
    const kv = await getKvClient(logger ?? context.logger);
    if (!kv) {
        return { key: snapshot.root.id, root: snapshot.root, linked: snapshot.linked };
    }
    const candidateNodes = [...nodes];
    const existingKeys = new Set();
    for (const node of nodes) {
        const record = await getNodeRecord(kv, node.id);
        if (record) {
            const resolvedKey = await resolveAliasKey(kv, record.key);
            existingKeys.add(resolvedKey);
            candidateNodes.push({
                id: record.id,
                type: record.type,
                createdAt: record.createdAt,
                url: record.url,
                owner: record.owner,
                repo: record.repo,
                number: record.number,
                title: record.title,
            });
        }
    }
    for (const key of existingKeys) {
        const record = await getNodeRecord(kv, key);
        if (record) {
            candidateNodes.push({
                id: record.id,
                type: record.type,
                createdAt: record.createdAt,
                url: record.url,
                owner: record.owner,
                repo: record.repo,
                number: record.number,
                title: record.title,
            });
        }
    }
    const canonical = pickCanonicalNode(dedupeNodes(candidateNodes));
    const canonicalKey = canonical.id;
    if (!hasNode(graph, canonicalKey)) {
        addNode(graph, canonicalKey, canonical);
    }
    for (const key of existingKeys) {
        const resolvedKey = await resolveAliasKey(kv, key);
        if (resolvedKey !== canonicalKey) {
            await mergeKeys(kv, resolvedKey, canonicalKey);
        }
    }
    for (const node of nodes) {
        await persistNode(kv, node, canonicalKey);
    }
    await persistNode(kv, canonical, canonicalKey);
    return { key: canonicalKey, root: snapshot.root, linked };
}
export async function listConversationNodesForKey(context, key, limit = 40, logger) {
    const trimmedKey = normalizeString(key);
    if (!trimmedKey)
        return [];
    const kv = await getKvClient(logger ?? context.logger);
    if (!kv)
        return [];
    const nodeIds = await listNodesForKey(kv, trimmedKey);
    const uniqueIds = [...new Set(nodeIds)].slice(0, Math.max(0, limit));
    const nodes = [];
    for (const nodeId of uniqueIds) {
        const record = await getNodeRecord(kv, nodeId);
        if (!record)
            continue;
        nodes.push({
            id: record.id,
            type: record.type,
            createdAt: record.createdAt,
            url: record.url,
            owner: record.owner,
            repo: record.repo,
            number: record.number,
            title: record.title,
        });
    }
    return nodes;
}
