# Agent Instructions (Repository‑Wide)

This repository is optimized for instant cold‑boot CI. Follow these rules strictly.

## Compute Workflow Rules

- DO NOT install dependencies in `.github/workflows/compute.yml`.
- DO NOT build/bundle in `.github/workflows/compute.yml`.
- The compute job must execute the committed bundle from `dist/` directly.
- Keep the compute job minimal: checkout, set up Node, run `node dist/index.js`.
- Never add steps like `npm ci`, `npm install`, `pnpm install`, `yarn install`, `npm run build`, or `npm run bundle` to the compute workflow.

Rationale: We commit the compiled artifact to ensure zero network waits and sub‑second startup in CI.

## Local Development and Bundling

- Local development uses Bun to run TypeScript directly (no local bundling).
  - `npm run dev:local` → `bun scripts/local-run.ts`
  - `npm run dev:pi` → `REAL_PI=1 bun scripts/local-run.ts`
- Bundling policy: only CI produces `dist/index.js` and `dist/index.js.map` via `tsup`.
  - Auto-bundle workflow (`.github/workflows/bundle-dist.yml`) runs on push and commits `dist/` if changed.

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

## Prompt Guidance for “Hello world” verification

- Preferred: let the server post. Send a prompt that yields exactly `Hello world` and include `repo` + `issue` → the server posts via `gh`.
- If you must force Codex to auth+post itself, craft a prompt that instructs `gh auth login` and `gh issue comment` and set `post: false`. You will need to provide `GH_TOKEN` to the Codex process; this is not the default path.

## Notes

- `actions/setup-node` is permitted to provision Node, but no package installs or builds are allowed.
- If the workflow requires input normalization (e.g., payload compression), implement it in code, not in CI steps.
