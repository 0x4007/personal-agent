# Personal Agent — Handoff Notes (Pi + CI)

This document hands off the current debugging state, tooling, and workflow for the GitHub personal agent that talks to the Raspberry Pi server at `pi.local:3000`.

## TL;DR

- CI executes the committed bundle in `dist/` directly. Do not install deps or build in `compute.yml`.
- The plugin sends a request to the Pi server’s `/api/codex`. The server then either:
  - runs `codex exec <prompt>` and posts to GitHub itself; or
  - directly posts a provided raw comment (`comment` or `raw_comment`).
- We added a “local-run” harness and a Pi sync runner to test the post‑decompression path locally and on the Pi.
- “Code 143” responses come from the Codex CLI process (terminated/timeout). A shorter “minimal prompt” path avoids this.

## What’s in the repo now

- CI policy: `AGENTS.md` documents that `compute.yml` must NOT install deps or build; it must run the committed bundle only.
- Bundling: `tsup` compiles `src/action.ts` to `dist/action.js`.
- Local harness: `scripts/local-run.ts` compiles to `dist/local-run.js` (skips Actions’ decoding/decompression and calls `runPlugin` directly).
- Pi helpers: `scripts/pi-dev.sh` provides `pi:all/sync/run/curl/probe` utilities for rapid Pi-side iteration and API probing.
- Request tuning in `src/handlers/codex-agent.ts` via env:
  - `PI_URL` (default `http://pi.local:3000`)
  - `PI_TIMEOUT_MS` (server timeout payload)
  - `PI_POST` (boolean – whether the server should post to GH)
  - `PI_MINIMAL=1` (switches to a shorter prompt body)

## The Pi server contract

File: `~/repos/pi-agent/server/kv_server.ts`

- Route: `POST /api/codex`
- Accepts JSON:
  - `prompt: string` → executes `codex exec <prompt>` and uses stdout as `output`
  - `comment` or `raw_comment: string` → bypasses codex and uses this string as `output`
  - `repo: "OWNER/REPO"`, `issue: number` or `pr: number` → provides posting target
  - `post: boolean` → defaults true when target present
  - `timeout_ms: number` → optional; enforced via `AbortController`
  - `mention: string|false` → mention prefix when posting (defaults to `@AGENT_OWNER`/`@0x4007`)
- Response: `{ ok, code, output, error, posted, gh }`
  - `code` is the subprocess exit code for `codex exec` (0 is success). `143` indicates termination/timeout.

Key observations:
- `{"prompt":"hi"}` returns quickly (200 OK).
- `{"comment":"@0x4007 hi"}` or `{"raw_comment":"@0x4007 hi"}` returns 200 and can post.
- Heavier “rich” prompts can lead to `code=143` (terminated) — tighten prompts or raise timeouts.

## Local + Pi workflows

Local harness (stubbed fetch by default):
- Build: `npm run bundle:local`
- Run against stub: `npm run dev:local`
- Run against Pi: `npm run dev:pi` (sets REAL_PI=1 and defaults for OWNER/REPO/ISSUE/BODY)

Pi remote tooling (rsync + run on Pi):
- All-in-one: `npm run pi:all` (bundle, rsync, run on Pi)
- Separate: `npm run pi:sync` then `npm run pi:run`
- Probe API: `npm run pi:probe` (tests `/`, `/api/codex` options, and POST shapes)
- Raw curl: `npm run pi:curl` (builds JSON safely and POSTs via ssh)

Environment toggles used by the harness / plugin:
- `AGENT_OWNER` → login expected in the issue comment (`@AGENT_OWNER`)
- `OWNER`, `REPO`, `ISSUE`, `BODY` → GitHub target and comment body; `BODY` must start with `@AGENT_OWNER`
- `PI_URL` → `http://pi.local:3000` by default in local harness
- Timeouts: `FETCH_TIMEOUT_MS` (client wrapper) and `PI_TIMEOUT_MS` (payload to server)
- Posting: `PI_POST=false` to avoid posting while testing
- Prompt minimalization: `PI_MINIMAL=1` to switch to a compact prompt body

## Prompt strategy for “Hello World” verification

There are two viable approaches to verifiably post a known comment:

1) Server‑posted comment (recommended)
- Send a prompt that returns exactly `Hello world` (or similar) and include target `repo` + `issue`.
- The server will post `output` to GitHub using its own `gh` invocation.
- Example request body to Pi:
  - `{ "prompt": "Hello world", "repo": "OWNER/REPO", "issue": 22, "post": true }`
- This avoids asking Codex to do any auth; the server already has `gh` and handles it.

2) Codex‑executed `gh` auth + post (if you explicitly want Codex to do it)
- Craft the prompt to instruct the Codex toolchain to:
  - authenticate with `gh` (e.g., `gh auth login --with-token`), using an environment variable provided by the runner
  - post `Hello world` with `gh issue comment ...`
- Notes:
  - You must supply a token to the process that `codex exec` can reach (e.g., `GH_TOKEN` env) and allow shell/tool execution in the Codex runtime.
  - Our current Pi server already posts via `gh`; duplicating this inside Codex is not necessary and may conflict.
  - If you proceed, disable server posting (`post: false`) so you only validate Codex’s path.

Suggested minimal prompt text to yield a known output that the server will post:

> Hello world

If you absolutely require the Codex path to perform `gh` auth + post, a sample instruction prompt:

> Authenticate with `gh` using the token provided in the environment as `GH_TOKEN`, then post a GitHub issue comment that contains exactly:
> 
> Hello world
> 
> Do not include any extra words or formatting in the comment body.

Again, this is only relevant if you’re testing Codex’s own ability to run shell tools; the server already does posting.

## Current plugin behavior (src/handlers/codex-agent.ts)

- Mentioned env:
  - `PI_URL`, `PI_TIMEOUT_MS`, `PI_POST`, `PI_MINIMAL`
- Minimal mode prompt is the issue comment’s command text (no extra wrapper). This proved to avoid Codex CLI timeouts while still returning quickly.
- Minimal mode request body: `{ prompt, timeout_ms, post }`
- Full mode body includes `repo` + `issue`/`pr` to have the server post the output itself.

## Next steps / open items

- If you want to always force a “Hello world” post for verification during E2E, consider a `TEST_HELLO=1` env to bypass Codex entirely and call Pi with `comment: "Hello world"`.
- If you must exercise Codex’s `gh` path, plumb `GH_TOKEN` into the Codex runtime (via the Pi server) and set `post: false` in the payload so the server doesn’t also post.
- Optionally raise `PI_TIMEOUT_MS` for heavier prompts, but favor shorter prompts to avoid `code=143` from the Codex process.
- Add more server logging when `code !== 0` (include captured `stderr`) to speed diagnosis of Codex failures.

## Known pitfalls

- CI must never install deps or build. Changes are committed to `dist/`.
- On the Pi, Node may be lazy-loaded via nvm; the remote runner sources nvm and PATH before invoking `node`.
- The server expects `comment` or `raw_comment` – not `raw`.
- `code=143` from the server indicates the Codex subprocess was terminated (timeout or signal). Tighten prompt or adjust timeouts.

