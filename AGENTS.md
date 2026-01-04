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
  - Local harness stubs outbound fetch by default; see `scripts/local-run.ts` for toggles.
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
  - `npm run dev:local` → `bun scripts/local-run.ts` (stubbed backend by default)

Notes:

- Do not commit any artifacts other than `dist/index.js` and `dist/index.js.map`.

## Tooling (local harness)

- `scripts/local-run.ts` → local harness run directly with Bun.
  - Skips Actions input decoding/compression and calls `runPlugin` directly.
  - Stubs outbound fetch by default; see the script for toggles and timeouts.

## Posting & Access Control

- Invocation gate: the comment must begin with `@${AGENT_OWNER}` or it is ignored.
- The plugin dispatches the agent workflow; it does not post replies itself.
- Agent replies are posted by the dispatched workflow using `PAT_FULL`/`USER_PAT`.
- LLM calls in the agent workflow use `UOS_AI_USER_TOKEN` (ai.ubq.fi).
- Style example reads use `PAT_FULL` (exposed as `USER_PAT_FULL`).

## Loop Prevention

- The prompt instructs the agent to avoid `@` mentions to prevent self‑triggering.
- Keep any output sanitization in the agent workflow, not in this plugin.

## Prompt Context Size

- Keep the task string small (workflow_dispatch input limits).
- Do not embed full webhook JSON in the task; the agent workflow fetches issue context on its own.

## Runtime Artifacts

- The plugin can write runtime files to `runtime-logs/` and upload them as a workflow artifact:
  - `prompt-<run_id>.txt` → exact prompt string used.
  - `agent-request-<run_id>.json` → workflow dispatch inputs.
  - `event-<run_id>.json` → decoded GitHub event (when `WRITE_EVENT_FILE=1`).
  - `event-sanitized-<run_id>.json` → event with `*_url` removed (when event embedding is enabled).
- compute.yml enables only `WRITE_PROMPT_FILE=1` and `WRITE_EVENT_FILE=1` by default to keep cold start minimal.

## Defaults & Test Target

- Test issue default moved to `#23` for a cleaner thread.

## Deterministic Fast Paths

Do NOT add any special‑case fast paths. This project must remain a generalized system. All requests flow through the same path (with optional prefetched context like the issue/PR + comments). If you need better accuracy, improve the prompt or context — do not branch behavior based on the command.

## Notes

- `actions/setup-node` is permitted to provision Node, but no package installs or builds are allowed.
- If the workflow requires input normalization (e.g., payload compression), implement it in code, not in CI steps.
