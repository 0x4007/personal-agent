# Personal Agent — Handoff (CI + Pi + Bun)

This document hands off the current state, goals, and quick commands to continue the same task with a new LLM session.

## TL;DR

- CI executes only the committed bundle: `dist/index.js` (+ `dist/index.js.map`). Never install deps or build in compute.
- Local dev uses Bun to run TS directly (no local bundling).
- Pi sync is done via GitHub (clone/pull) for revision integrity; remote runs also use Bun.
- Codex rich prompts on the Pi can timeout (`code=143`). Minimal prompts or direct `raw_comment` posting are reliable. We are keeping full prompts by default (no `PI_MINIMAL`) and will hand‑tune them once the system is stable.

Logging toggles for production debugging:
- `DEBUG_EVENT=1` → log workflow_dispatch inputs and decoded eventPayload in compute logs.
- `DEBUG_EVENT_RAW=1` → log raw JSON from `GITHUB_EVENT_PATH`.
- `LOG_PROMPT=1` → log the full constructed prompt (length + content).
- `LOG_PI_BODY=1` → log the exact JSON body posted to Pi `/api/codex`.

## Current Source of Truth

- Single runtime entry: `dist/index.js` (ESM) — compute uses `node dist/index.js`.
- Dist policy: ONLY `dist/index.js` and `dist/index.js.map` are committed (enforced in `AGENTS.md`).
- Auto-bundle workflow keeps `dist/` up-to-date on every push.

## Key Files

- Compute workflow: `.github/workflows/compute.yml:1`
  - Runs Node 22, sets `PI_TIMEOUT_MS=900000` (15m), executes `node dist/index.js`.

- Auto-bundle workflow: `.github/workflows/bundle-dist.yml:1`
  - On every push: `npm ci && npm run bundle`, commits `dist/index.js` + map if changed.

- Entry + runner: `src/index.ts:1`
  - Exports `runPlugin`.
  - Implements a lightweight Actions runner that reads `GITHUB_EVENT_PATH`, decodes `eventPayload` (Brotli+base64 or JSON), and calls `runPlugin` — no `@actions/*` or plugin SDK at runtime.

- Handler: `src/handlers/codex-agent.ts:1`
  - Env knobs: `PI_URL` (default `http://pi.local:3000`), `PI_TIMEOUT_MS`, `PI_POST`, `PI_MINIMAL`.
  - Minimal prompt uses the raw command; full prompt includes repo/issue/pr context.
  - Calls Pi `/api/codex` and logs status.
  - Optional debug logs: `LOG_PROMPT=1` (full prompt), `LOG_PI_BODY=1` (request body with `timeout_ms`).

- Local harness: `scripts/local-run.ts:1`
  - Basic logger and comment handler; `REAL_PI` toggles real fetch; `FETCH_TIMEOUT_MS` adds client timeout.

- Pi Git sync/run: `scripts/pi-git.sh:1`
  - `setup` (clone), `pull` (reset to origin/<branch>), `run` (Bun harness on the Pi).
  - Ensures `~/.bun/bin` in PATH for non-interactive shells.

- Pi probes + curl: `scripts/pi-dev.sh:1`
  - `probe` → `/` and `/api/codex` OPTIONS/POST checks.
  - `curl` → posts a JSON payload to `/api/codex`. Currently sends `raw_comment` with `repo/issue/post:true` for deterministic E2E.

- Policy: `AGENTS.md:1`
  - Compute must never install/build.
  - Only `dist/index.js` and `dist/index.js.map` are committed artifacts.
  - Local dev uses Bun; Pi sync via Git.

## Pi Server Contract (for reference)

- Route: `POST /api/codex`
- Accepts JSON:
  - `prompt: string` → executes `codex exec <prompt>` → `output` is stdout
  - `comment` or `raw_comment: string` → bypass Codex and use string as `output`
  - `repo: "OWNER/REPO"`, `issue` or `pr`, `post: boolean`, `timeout_ms`, `mention`
- Response: `{ ok, code, output, error, posted, gh }`
  - `code=143` indicates Codex terminated/timeout.

## Verified Flows

- Local (stubbed): `npm run dev:local` → OK.
- Local→Pi via Bun (real Pi): `npm run dev:pi` with `REAL_PI=1` → OK reachability.
- Pi git sync + run: `npm run pi:pull-run`
  - Results: minimal mode: OK; full (rich) prompt may return `code=143`.
- Deterministic server-post E2E:
  - `npm run pi:curl` (sends only `raw_comment` with `repo/issue/post:true`) → 200 OK + posted:true.
  - Example link (successful): appears under the target issue `ubiquity/.github-private#22`.

## Triggering CI / Kernel Dispatch

1) Post a comment starting with `@0x4007` on `https://github.com/ubiquity/.github-private/issues/22`.
2) Monitor compute workflow: `gh run list -R 0x4007/personal-agent --workflow "Personal Agent Compute"`.
3) Logs: `gh run view <id> -R 0x4007/personal-agent --log`.

## Practical Commands

- Build dist (for CI artifact): `npm run bundle`
- Local dev (stubbed): `npm run dev:local`
- Local dev to Pi: `npm run dev:pi`
- Pi setup/pull/run:
  - `npm run pi:setup`
  - `npm run pi:pull`
  - `npm run pi:run` (Bun on Pi)
  - `npm run pi:pull-run`
- Pi probes/curl:
  - `npm run pi:probe`
  - `npm run pi:curl` (uses `raw_comment` server-post path)

## Open Issues / Next Steps

- Codex timeouts (code 143) on rich prompts (expected while we stabilize)
  - Ensure `timeout_ms` is correctly passed. In CI, `PI_TIMEOUT_MS=900000` is set. For Pi runs via Bun, `scripts/pi-git.sh run` now exports `PI_TIMEOUT_MS` (default 15m).
  - Keep full prompt default (no `PI_MINIMAL`), hand‑tune later.
  - Consider adding a `TEST_HELLO=1` path to bypass Codex for smoke tests while retaining full prompt for normal operations.

- CI dist enforcement
  - Ensure no extra files are committed under `dist/`.

- Optional: add a small test harness that mocks the Pi server for local integration tests.

## Notes

- CI must never install deps or build in compute — it runs the committed dist only.
- Local development uses Bun (TS on the fly).
- Pi sync via Git ensures revision integrity (no ad-hoc rsync of partial files).

## Where to review the full prompt and inputs

- Full prompt: enable `LOG_PROMPT=1` to print it from `src/handlers/codex-agent.ts`.
- Pi request body: enable `LOG_PI_BODY=1` to see the JSON sent to `/api/codex` (includes `timeout_ms`).
- Kernel inputs in production: enable `DEBUG_EVENT=1` (and optionally `DEBUG_EVENT_RAW=1`) to see workflow inputs and the decoded `eventPayload` as received by compute.

## Pi server’s timeout handling (for reference)

- The Pi server reads `timeout_ms` from the request body and uses an `AbortController` to terminate `codex exec` after that duration.
- If `timeout_ms` is not provided, it does not set a timeout.
- A response with `code=143` indicates the `codex` subprocess terminated (timeout/signal).
