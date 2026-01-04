const http = require("node:http");
const { Readable } = require("node:stream");

const port = Number.parseInt(process.env.PORT || "4010", 10);
const baseUrl = process.env.AI_BASE_URL || "https://ai-ubq-fi.deno.dev";

const tokenFile = String(process.env.UOS_TOKEN_FILE || "").trim();
const initialAuthToken = String(process.env.AUTH_TOKEN || "").trim();
const initialKernelToken = String(process.env.KERNEL_TOKEN || "").trim();
const owner = String(process.env.GH_OWNER || "").trim();
const repo = String(process.env.GH_REPO || "").trim();
const installationId = String(process.env.GH_INSTALLATION_ID || "").trim();

if (!owner || !repo) {
  console.error("Missing GH_OWNER/GH_REPO");
  process.exit(1);
}

const readTokens = () => {
  if (tokenFile) {
    try {
      const raw = require("node:fs").readFileSync(tokenFile, "utf8");
      const data = JSON.parse(raw);
      const authToken = typeof data.authToken === "string" ? data.authToken.trim() : "";
      const kernelToken = typeof data.kernelToken === "string" ? data.kernelToken.trim() : "";
      if (authToken) return { authToken, kernelToken };
    } catch {
      // ignore and fall back to initial
    }
  }
  return { authToken: initialAuthToken, kernelToken: initialKernelToken };
};

const toInputText = (text) => ({ type: "input_text", text });
const toMessage = (text) => ({ type: "message", role: "user", content: [toInputText(text)] });

const normalizeInputText = (value) => (typeof value === "string" ? value : "");

const buildToolCallText = (item) => {
  const name = normalizeInputText(item.name);
  const args = normalizeInputText(item.arguments);
  const callId = normalizeInputText(item.call_id);
  const parts = ["Tool call", name && `name=${name}`, callId && `id=${callId}`, args && `args=${args}`].filter(Boolean);
  return parts.join(" ") || "Tool call";
};

const buildToolOutputText = (item) => {
  const callId = normalizeInputText(item.call_id);
  const output = normalizeInputText(item.output);
  const label = callId ? `Tool output (id=${callId})` : "Tool output";
  if (!output) return label;
  return `${label}:\n${output}`;
};

const buildReasoningText = (item) => {
  const summary = normalizeInputText(item.summary);
  const content = normalizeInputText(item.content);
  return summary || content || "";
};

const rewriteResponsesBody = (body) => {
  if (!body.length) return { body, rewrote: false };
  let parsed;
  try {
    parsed = JSON.parse(body.toString("utf8"));
  } catch {
    throw new Error("Invalid JSON body");
  }
  if (!parsed || typeof parsed !== "object") return { body, rewrote: false };
  if (!Array.isArray(parsed.input)) return { body, rewrote: false };

  const stats = {
    function_call: 0,
    function_call_output: 0,
    reasoning: 0,
    input_text: 0,
    input_image: 0,
  };

  const normalized = [];
  for (const item of parsed.input) {
    if (!item || typeof item !== "object") {
      throw new Error("Invalid responses input item");
    }
    const type = typeof item.type === "string" ? item.type : "";
    if (!type || type === "message") {
      normalized.push(item);
      continue;
    }
    if (type === "input_text" || type === "text") {
      const text = normalizeInputText(item.text);
      if (!text) throw new Error("Invalid input_text item");
      normalized.push({ type: "message", role: "user", content: [toInputText(text)] });
      stats.input_text += 1;
      continue;
    }
    if (type === "input_image" || type === "image_url") {
      let url = "";
      if (type === "input_image") {
        url = normalizeInputText(item.image_url);
      } else {
        const image = item.image_url && typeof item.image_url === "object" ? item.image_url : null;
        url = image && typeof image.url === "string" ? image.url : "";
      }
      if (!url) throw new Error("Invalid input_image item");
      normalized.push({ type: "message", role: "user", content: [{ type: "input_image", image_url: url }] });
      stats.input_image += 1;
      continue;
    }
    if (type === "function_call") {
      normalized.push(toMessage(buildToolCallText(item)));
      stats.function_call += 1;
      continue;
    }
    if (type === "function_call_output") {
      normalized.push(toMessage(buildToolOutputText(item)));
      stats.function_call_output += 1;
      continue;
    }
    if (type === "reasoning") {
      const text = buildReasoningText(item);
      if (!text) throw new Error("Invalid reasoning item");
      normalized.push(toMessage(`Reasoning: ${text}`));
      stats.reasoning += 1;
      continue;
    }
    throw new Error(`Unsupported responses input item type: ${type || "unknown"}`);
  }

  parsed.input = normalized;
  return { body: Buffer.from(JSON.stringify(parsed)), rewrote: true, stats };
};

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", "http://127.0.0.1");
    if (req.method === "GET" && url.pathname === "/health") {
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("ok");
      return;
    }

    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = Buffer.concat(chunks);

    const upstreamUrl = new URL(url.pathname + url.search, baseUrl);

    const logInputShape = () => {
      if (url.pathname !== "/v1/responses") return;
      if (!body.length) return;
      try {
        const parsed = JSON.parse(body.toString("utf8"));
        const input = parsed && typeof parsed === "object" ? parsed.input : undefined;
        const summary = {
          model: typeof parsed?.model === "string" ? parsed.model : undefined,
          input_type: typeof input,
          input_is_array: Array.isArray(input),
          input_length: Array.isArray(input) ? input.length : null,
        };
        if (Array.isArray(input)) {
          const describeItem = (entry) => {
            if (!entry || typeof entry !== "object") return { kind: typeof entry };
            const info = {
              kind: typeof entry.type === "string" ? entry.type : "object",
              keys: Object.keys(entry).slice(0, 6),
            };
            if (typeof entry.role === "string") info.role = entry.role;
            if (Array.isArray(entry.content)) {
              info.content_types = entry.content.map((contentItem) => {
                if (!contentItem || typeof contentItem !== "object") return typeof contentItem;
                return typeof contentItem.type === "string" ? contentItem.type : "object";
              });
            }
            return info;
          };
          summary.items = input.slice(0, 10).map(describeItem);
        }
        console.log("[ubq-forwarder] responses input shape:", JSON.stringify(summary));
      } catch (error) {
        const message = error && typeof error === "object" && "message" in error ? error.message : String(error);
        console.log("[ubq-forwarder] responses input shape parse failed:", message);
      }
    };
    logInputShape();

    let bodyForUpstream = body;
    if (url.pathname === "/v1/responses") {
      try {
        const rewritten = rewriteResponsesBody(body);
        bodyForUpstream = rewritten.body;
        if (rewritten.rewrote) {
          console.log("[ubq-forwarder] responses input normalized:", JSON.stringify(rewritten.stats));
        }
      } catch (error) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "text/plain");
        res.end(String(error?.message || error || "Invalid responses input"));
        return;
      }
    }

    const { authToken, kernelToken } = readTokens();
    if (!authToken) {
      res.statusCode = 401;
      res.setHeader("Content-Type", "text/plain");
      res.end("Missing auth token");
      return;
    }
    if (authToken.startsWith("gh") && !kernelToken) {
      res.statusCode = 401;
      res.setHeader("Content-Type", "text/plain");
      res.end("Missing kernel token");
      return;
    }

    const headers = {
      Authorization: `Bearer ${authToken}`,
      "Content-Type": req.headers["content-type"] || "application/json",
      "X-GitHub-Owner": owner,
      "X-GitHub-Repo": repo,
    };
    if (installationId) headers["X-GitHub-Installation-Id"] = installationId;
    if (kernelToken) headers["X-Ubiquity-Kernel-Token"] = kernelToken;

    const upstream = await fetch(upstreamUrl, {
      method: req.method || "POST",
      headers,
      body: bodyForUpstream.length ? bodyForUpstream : undefined,
    });

    res.statusCode = upstream.status;

    const passthroughHeaders = ["content-type", "cache-control", "x-request-id", "x-ubq-upstream"];
    for (const key of passthroughHeaders) {
      const value = upstream.headers.get(key);
      if (value) res.setHeader(key, value);
    }

    if (!upstream.body) {
      const text = await upstream.text().catch(() => "");
      res.end(text);
      return;
    }

    Readable.fromWeb(upstream.body).pipe(res);
  } catch (error) {
    res.statusCode = 502;
    res.setHeader("Content-Type", "text/plain");
    res.end(String(error?.message || error || "upstream error"));
  }
});

server.listen(port, "127.0.0.1", () => {
  process.stdout.write(`ubq-responses-forwarder listening on 127.0.0.1:${port}\n`);
});
