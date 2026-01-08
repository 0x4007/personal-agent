#!/usr/bin/env node
import fs from "node:fs";

/* global process, fetch */
function usage() {
  return `
Usage:
  node scripts/agent-bus.mjs post --agent <id> --body <text> [--channel <name>] [--kind <name>] [--metadata <json>] [--body-file <path>] [--base-url <url>]
  node scripts/agent-bus.mjs poll [--since <ms>] [--cursor <cursor>] [--since-file <path>] [--limit <n>] [--agent <id>] [--channel <name>] [--base-url <url>] [--out <path>]

Auth env:
  UOS_AGENT_AUTH_TOKEN (fallback GH_TOKEN)
  UOS_KERNEL_TOKEN (required only for GitHub tokens)
  UOS_GH_OWNER
  UOS_GH_REPO
  UOS_GH_INSTALLATION_ID
  UOS_AGENT_BUS_URL (default base url)
`.trim();
}

function parseArgs(argv) {
  const options = {};
  for (let i = 0; i < argv.length; ) {
    const arg = argv[i];
    if (!arg.startsWith("--")) {
      i += 1;
      continue;
    }
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith("--")) {
      options[key] = next;
      i += 2;
    } else {
      options[key] = true;
      i += 1;
    }
  }
  return options;
}

function readJsonFile(path) {
  try {
    const raw = fs.readFileSync(path, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeJsonFile(path, value) {
  fs.writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function parseIntSafe(value) {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return null;
  return Math.trunc(parsed);
}

function envOr(key, fallback = "") {
  return String(process.env[key] || fallback).trim();
}

function buildHeaders() {
  const token = envOr("UOS_AGENT_AUTH_TOKEN", envOr("GH_TOKEN"));
  const kernelToken = envOr("UOS_KERNEL_TOKEN");
  const owner = envOr("UOS_GH_OWNER");
  const repo = envOr("UOS_GH_REPO");
  const installationId = envOr("UOS_GH_INSTALLATION_ID");

  const missing = [];
  if (!token) missing.push("UOS_AGENT_AUTH_TOKEN/GH_TOKEN");
  if (!owner) missing.push("UOS_GH_OWNER");
  if (!repo) missing.push("UOS_GH_REPO");
  if (token.startsWith("gh") && !kernelToken) missing.push("UOS_KERNEL_TOKEN");
  if (missing.length > 0) {
    throw new Error(`Missing auth env: ${missing.join(", ")}`);
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "X-GitHub-Owner": owner,
    "X-GitHub-Repo": repo,
  };
  if (installationId) headers["X-GitHub-Installation-Id"] = installationId;
  if (kernelToken) headers["X-Ubiquity-Kernel-Token"] = kernelToken;
  return headers;
};

function hasOwn(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function baseUrl(override) {
  return String(override || envOr("UOS_AGENT_BUS_URL", "https://ai-ubq-fi.deno.dev/v1/agent-bus")).trim();
}

async function handlePost(options) {
  const agentId = String(options.agent || options["agent-id"] || "").trim();
  if (!agentId) throw new Error("Missing --agent");

  let body = String(options.body || "").trim();
  const bodyFile = String(options["body-file"] || "").trim();
  if (bodyFile) body = fs.readFileSync(bodyFile, "utf8");
  if (!body) throw new Error("Missing --body or --body-file");

  const payload = {
    agent_id: agentId,
    channel: options.channel ? String(options.channel).trim() : undefined,
    kind: options.kind ? String(options.kind).trim() : undefined,
    body,
  };

  if (options.metadata) {
    try {
      payload.metadata = JSON.parse(String(options.metadata));
    } catch {
      throw new Error("--metadata must be valid JSON");
    }
  }

  const res = await fetch(baseUrl(options["base-url"]), {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`POST failed (${res.status}): ${text}`);
  }
  process.stdout.write(`${text.trim()}\n`);
}

async function handlePoll(options) {
  const stateFile = options["since-file"] ? String(options["since-file"]).trim() : "";
  const state = stateFile ? readJsonFile(stateFile) : null;

  const cursor = String(options.cursor || state?.cursor || "").trim();
  const sinceRaw = options.since ?? state?.since;
  const since = parseIntSafe(sinceRaw !== undefined ? String(sinceRaw) : "");
  const limit = parseIntSafe(String(options.limit || "")) ?? 50;

  const url = new URL(baseUrl(options["base-url"]));
  if (cursor) {
    url.searchParams.set("cursor", cursor);
  } else if (since !== null) {
    url.searchParams.set("since", String(since));
  }
  if (limit) url.searchParams.set("limit", String(limit));
  if (options.agent) url.searchParams.set("agent_id", String(options.agent));
  if (options.channel) url.searchParams.set("channel", String(options.channel));

  const res = await fetch(url.toString(), { headers: buildHeaders() });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`GET failed (${res.status}): ${text}`);
  }

  if (stateFile) {
    updateStateFromFile(stateFile, text, state);
  }

  const outPath = options.out ? String(options.out).trim() : "";
  if (outPath) {
    fs.writeFileSync(outPath, `${text.trim()}\n`, "utf8");
    return;
  }

  process.stdout.write(`${text.trim()}\n`);
}

function updateStateFromFile(stateFile, text, state) {
  try {
    const data = JSON.parse(text);
    const nextState = {
      since: hasOwn(data, "next_since") ? data.next_since : state?.since ?? null,
      cursor: hasOwn(data, "next_cursor") ? data.next_cursor : state?.cursor ?? null,
    };
    writeJsonFile(stateFile, nextState);
  } catch {
    // ignore state updates when response isn't json
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    process.stdout.write(`${usage()}\n`);
    return;
  }

  const command = args[0];
  const options = parseArgs(args.slice(1));
  if (command === "post") {
    await handlePost(options);
    return;
  }
  if (command === "poll") {
    await handlePoll(options);
    return;
  }

  process.stderr.write(`Unknown command: ${command}\n${usage()}\n`);
  process.exit(1);
};

main().catch((error) => {
  process.stderr.write(`${error?.message || error}\n`);
  process.exit(1);
});
