# Agent Instructions (Repository‑Wide)

This repository is optimized for instant cold‑boot CI. Follow these rules strictly.

## Compute Workflow Rules

- DO NOT install dependencies in `.github/workflows/compute.yml`.
- DO NOT build/bundle in `.github/workflows/compute.yml`.
- The compute job must execute the committed bundle from `dist/` directly.
- Keep the compute job minimal: checkout, set up Node, run `node dist/action.js`.
- Never add steps like `npm ci`, `npm install`, `pnpm install`, `yarn install`, `npm run build`, or `npm run bundle` to the compute workflow.

Rationale: We commit the compiled artifact to ensure zero network waits and sub‑second startup in CI.

## Local Development and Bundling

- Use `tsup` to bundle the action entry `src/action.ts`.
- Command: `tsup src/action.ts --format esm --target node22 --sourcemap --out-dir dist --clean --no-splitting`.
- Commit `dist/action.js` and `dist/action.js.map` with each change that affects runtime.

## Entry Points

- GitHub Actions entry: `dist/index.js` (ESM, single file).
- Source map: `dist/index.js.map`.

ONLY these two files are accepted compile outputs. Nothing more, nothing less.
They MUST be committed and present in every commit on the GitHub repo so that
Actions can directly invoke `node dist/index.js` without installing dependencies
or building.

Notes:
- Do not commit any other artifacts under `dist/`.
- Developer helpers (like the local harness) must not write to `dist/`. Use a
  separate outDir (e.g., `dev-dist/`) for any local-only bundles.

## Tooling (added for debugging and Pi integration)

- `scripts/local-run.ts` → bundles to `dist/local-run.js`.
  - Skips Actions input decoding/compression step and calls `runPlugin` directly.
  - Env: `REAL_PI` toggles real fetch to Pi; `FETCH_TIMEOUT_MS` controls client timeout; `PI_URL` defaults to `http://pi.local:3000`.

- `scripts/pi-dev.sh` → rsync + remote execution on the Raspberry Pi.
  - `npm run pi:all` → bundle local harness, sync to Pi, run on Pi (sources nvm / PATH for lazy node).
  - `npm run pi:sync`, `npm run pi:run` → granular control.
  - `npm run pi:probe` → probes `/api/codex` with multiple payloads.
  - `npm run pi:curl` → crafts JSON safely and POSTs via ssh (base64 to avoid quoting issues).

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
