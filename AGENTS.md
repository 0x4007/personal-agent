# Agent Instructions (Repository‑Wide)

This repository is optimized for instant cold‑boot CI. Follow these rules strictly.

## Purpose

- Build a generalized personal agent/assistant — not a collection of special‑case tools.
- Near‑term primary scope: GitHub operations.
  - Examples: review pull requests, summarize/triage issues, answer questions about the codebase, propose changes, and draft comments.
  - The agent should prefer live reads (via `gh` or GitHub API) over guessing, and return clean GitHub‑flavored Markdown replies.
- Beyond GitHub: we will later connect the same generalized core to other systems/channels (e.g., Telegram, Google Drive, etc.). Keep the design channel‑agnostic so adapters can be added without forking logic.
- Do NOT add “fast paths” or command‑specific branches — improve the prompt/context or execution environment instead.

## Compute Workflow Rules

- DO NOT install dependencies in `.github/workflows/compute.yml`.
- DO NOT build/bundle in `.github/workflows/compute.yml`.
- The compute job must execute the committed bundle from `dist/` directly.
- Keep the compute job minimal: checkout, set up Node, run `node dist/index.js`.
- Never add steps like `npm ci`, `npm install`, `pnpm install`, `yarn install`, `npm run build`, or `npm run bundle` to the compute workflow.

Rationale: We commit the compiled artifact to ensure zero network waits and sub‑second startup in CI.

## Local Development and Bundling

- NEVER build/bundle in development. Local development MUST use Bun to run TS directly.
  - `npm run dev:local` → `bun scripts/local-run.ts`
  - `npm run dev:pi` → `REAL_PI=1 bun scripts/local-run.ts`
  - Do not run `npm run bundle`, `tsup`, `tsc`, or any build locally.
- Bundling happens automatically in CI only.
  - Auto-bundle workflow (`.github/workflows/bundle-dist.yml`) runs on every push and commits `dist/index.js` and `dist/index.js.map` if changed.

## Entry Points

- GitHub Actions entry: `dist/index.js` (ESM, single file).
- Source map: `dist/index.js.map`.

ONLY these two files are accepted compile outputs. Nothing more, nothing less.
They MUST be committed and present in every commit on the GitHub repo so that
Actions can directly invoke `node dist/index.js` without installing dependencies
or building.

Local development

- Use Bun to run TypeScript directly; no local bundling.
- Examples:
  - `npm run dev:local` → `bun scripts/local-run.ts` (stubbed Pi by default)
  - `npm run dev:pi` → `REAL_PI=1 bun scripts/local-run.ts` (talks to the Pi)

Notes:

- Do not commit any artifacts other than `dist/index.js` and `dist/index.js.map`.

## Tooling (debugging and Pi integration)

- `scripts/local-run.ts` → local harness run directly with Bun.
  - Skips Actions input decoding/compression and calls `runPlugin` directly.
  - Env: `REAL_PI` toggles real fetch to Pi; `FETCH_TIMEOUT_MS` controls client timeout; `PI_URL` defaults to `http://pi.local:3000`.

- `scripts/pi-git.sh` → Git-based sync on the Raspberry Pi (preferred).
  - `npm run pi:setup` → clone repo on Pi if missing.
  - `npm run pi:pull` → fetch/reset to origin for the current branch on Pi.
  - `npm run pi:run` → run the local harness on the Pi via Bun (REAL_PI=1)
  - `npm run pi:pull-run` → pull then run

- `scripts/pi-dev.sh` → Pi API probes only (no file sync).
  - `npm run pi:probe` → probes `/`, `/api`, `/api/codex` with multiple payloads.
  - `npm run pi:curl` → crafts JSON safely and POSTs via ssh (base64 to avoid quoting issues).

- `scripts/pi-agent-git.sh` → Git-based sync for the Raspberry Pi server repo (pi-agent).
  - Defaults: repo `https://github.com/0x4007/pi-agent.git`, dir `/home/pi/repos/pi-agent`, branch `main`.
  - Branch selection: if `BRANCH` is set, it is used. Otherwise, if `PI_AGENT_LOCAL_DIR` points to a local `pi-agent` clone, the current branch from that repo is used. If neither is provided, falls back to `main`.
  - Commands:
    - `npm run pi-agent:setup` → clone on Pi if missing, checkout/reset to branch.
    - `npm run pi-agent:pull` → fetch/reset to `origin/<branch>` if it exists; otherwise stays/creates the local branch.
    - `npm run pi-agent:restart` → best‑effort restart of `pi-agent-deno.service`.

- Husky pre-push (local-only): `.husky/pre-push`
  - Hardcoded to the maintainer’s LAN setup:
    - Local pi-agent path: `/Users/nv/repos/pi-agent`
    - Remote: `origin`
    - Pi host: `pi@pi.local`
  - Behavior: after a push completes (detected via `git ls-remote` seeing the new SHA), it pulls the same branch on the Pi using `scripts/pi-agent-git.sh pull` with `BRANCH=<current>`, then restarts the `pi-agent-deno.service` (best‑effort). Non‑blocking.
  - To disable temporarily: `DISABLE_PI_AGENT_SYNC=1 git push`.

## Posting & Access Control

- Invocation gate: the comment must begin with `@${AGENT_OWNER}` or it is ignored.
- Who may post replies:
  - Owner (comment author matches `AGENT_OWNER`, case‑insensitive): compute posts the (sanitized) reply.
  - Others: read‑only; no posting.
- Token selection for posting (compute only):
  - Owner: `PAT_FULL` (exposed to code as `USER_PAT_FULL`).
  - Others: `PAT_READ` (exposed to code as `USER_PAT_READ`).
  - Fallbacks (last resorts): `PLUGIN_GITHUB_TOKEN`, then `GITHUB_TOKEN`.
- Server posting is disabled in requests (we send `post:false`) to avoid any server‑side auto‑mentioning. We also send `mention:false` explicitly to signal “no mention”.

## Loop Prevention & Sanitization

- We aggressively sanitize the model output before posting:
  - Strip any `@${AGENT_OWNER}` mentions anywhere to avoid re‑triggering.
  - Remove transcript/log lines: banners, `OpenAI Codex v…`, separators, `workdir:`, `model:`, `provider:`, `approval:`, `sandbox:`, `reasoning…`, timestamps, `thinking`, `codex`, shell exec lines, “User instructions/request”, and “Planned fetch/Command I’d run”.
  - Keep only the last assistant‑like section if present, then limit to the last two sentences; hard cap ~600 chars.
  - File: `src/handlers/codex-agent.ts` (function `sanitizeOutput`).

## Prompt Context Size

- Optional event embedding: when enabled, we include the raw GitHub event JSON in the prompt for full context, but:
  - We strip all `*_url` fields while preserving the literal `url` key to shrink size.
  - Toggles (off by default in compute): `PROMPT_INCLUDE_EVENT=1`, `PROMPT_STRIP_URLS=1`.
  - Logs record raw vs sanitized lengths when enabled.

## Runtime Artifacts

- The plugin can write runtime files to `runtime-logs/` and upload them as a workflow artifact:
  - `prompt-<run_id>.txt` → exact prompt string used.
  - `pi-request-<run_id>.json` → the body posted to `/api/codex` (includes `timeout_ms`, `post:false`, `mention:false`).
  - `event-<run_id>.json` → decoded GitHub event (when `WRITE_EVENT_FILE=1`).
  - `event-sanitized-<run_id>.json` → event with `*_url` removed (when event embedding is enabled).
- compute.yml enables only `WRITE_PROMPT_FILE=1` and `WRITE_EVENT_FILE=1` by default to keep cold start minimal.

## Defaults & Test Target

- Timeout forwarded to Pi: `PI_TIMEOUT_MS=900000` (15 minutes).
- Test issue default moved to `#23` for a cleaner thread.

- `scripts/pi-agent-git.sh` → Git-based sync for the Raspberry Pi server repo (pi-agent).
  - Defaults: repo `https://github.com/0x4007/pi-agent.git`, dir `/home/pi/repos/pi-agent`, branch `main`.
  - Branch selection: if `BRANCH` is set, it is used. Otherwise, if `PI_AGENT_LOCAL_DIR` points to a local `pi-agent` clone, the current branch from that repo is used. If neither is provided, falls back to `main`.
  - Commands:
    - `npm run pi-agent:setup` → clone on Pi if missing, checkout/reset to branch.
    - `npm run pi-agent:pull` → fetch/reset to `origin/<branch>` if it exists; otherwise stays/creates the local branch.
    - `npm run pi-agent:restart` → best‑effort restart of `pi-agent-deno.service`.

- `scripts/push-pi-agent.sh` → Optional CLI to push local pi-agent then trigger Pi pull (post-push style).
  - Defaults are fine; no env required on maintainer’s machine.
  - Rationale: Git has no native post-push hook client-side. The Husky pre-push hook below is preferred.

- Husky pre-push (local only): `.husky/pre-push`
  - Hardcoded for the maintainer’s LAN setup:
    - Local pi-agent path: `/Users/nv/repos/pi-agent`
    - Remote: `origin`
    - Pi host: `pi@pi.local`
  - Behavior: after a push completes (detected via `ls-remote` seeing the new SHA), it pulls the same branch on the Pi using `scripts/pi-agent-git.sh pull` with `BRANCH=<current>`, then restarts the `pi-agent-deno.service` (best‑effort).
  - Non-blocking and silent if local path isn’t present. Set `DISABLE_PI_AGENT_SYNC=1` to skip.

## Pi Server Contract (for reference)

- Route: `POST /api/codex` accepts JSON:
  - `prompt` (runs `codex exec <prompt>`) or `comment`/`raw_comment` (bypass codex).
  - Optional `repo`, `issue` or `pr`, `post` (server uses `gh` to comment), `timeout_ms`, `mention`.
- Response: `{ ok, code, output, error, posted, gh }` (note `code=143` from codex means timeout/termination).

## Plugin runtime knobs

- `PI_URL` → base URL to the Pi server.
- `PI_TIMEOUT_MS` → forwarded as `timeout_ms` in the Pi payload.
- `PI_POST` → boolean; server posting on/off.
- `PI_MINIMAL=1` → switch to a compact prompt body (reduces Codex timeouts).
- `PROMPT_FETCH_ISSUE=1` → prefetch issue/PR + comments (default on).
- `PROMPT_FETCH_LABELS=1` → prefetch repository labels and embed into prompt (default on). Also enables a fast path.

## Deterministic Fast Paths (skip Pi/Codex)

Do NOT add any special‑case fast paths. This project must remain a generalized system. All requests flow through the same Codex path (with optional prefetched context like the issue/PR + comments). If you need better accuracy, improve the prompt or context — do not branch behavior based on the command.

## Prompt Guidance for “Hello world” verification

- Preferred: let the server post. Send a prompt that yields exactly `Hello world` and include `repo` + `issue` → the server posts via `gh`.
- If you must force Codex to auth+post itself, craft a prompt that instructs `gh auth login` and `gh issue comment` and set `post: false`. You will need to provide `GH_TOKEN` to the Codex process; this is not the default path.

## Notes

- `actions/setup-node` is permitted to provision Node, but no package installs or builds are allowed.
- If the workflow requires input normalization (e.g., payload compression), implement it in code, not in CI steps.
