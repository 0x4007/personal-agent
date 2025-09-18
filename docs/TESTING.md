# Personal Agent — Testing & Debugging Guide

This guide gives another LLM (or human) everything needed to:

- Trigger the agent via a GitHub comment
- Observe CI runs and download runtime artifacts
- Inspect the exact prompt/body sent to the Pi
- Locate the prompt code and post‑processing filters
- Diagnose common failure modes without touching compute.yml

## How To Invoke The Agent

- Create or open an issue in `ubiquity/.github-private`.
- Post a comment that begins with the owner’s username mention at the first character:
  - Example: `@0x4007 summarize the spec and list key next steps`
  - Important: The handler ignores comments that do not start with `@0x4007`.

The Kernel dispatches the workflow “Personal Agent Compute” in repository `0x4007/personal-agent`. The agent replies back on the same issue (owner-only posting policy; see below).

Tip: We prefer starting clean sessions by creating a fresh issue, then commenting there.

## Monitor The Run

Using the GitHub CLI (gh):

- List recent runs:
  - `gh run list -R 0x4007/personal-agent --workflow "Personal Agent Compute"`
- Watch a run by ID until completion:
  - `gh run watch <run_id> -R 0x4007/personal-agent --interval 5 --exit-status`
- View run logs:
  - `gh run view <run_id> -R 0x4007/personal-agent --log`

## Runtime Artifacts (Logs You Want)

Each compute run uploads an artifact named `runtime-logs-<run_id>`. Download it with:

- `gh run download <run_id> -R 0x4007/personal-agent -n runtime-logs-<run_id> -D /tmp/pa_logs_<run_id>`

It contains:

- `prompt-<run_id>.txt` — The full prompt string (what we sent to Codex on the Pi)
- `pi-request-<run_id>.json` — The exact JSON body sent to Pi `/api/codex` (includes `timeout_ms`, repo/issue, `post:false`, `mention:false`)
- `event-<run_id>.json` — The decoded GitHub event payload received by compute

These are enough to reconstruct context and understand why a response looked the way it did.

## Files That Matter

- Prompt builder and handler logic:
  - `src/handlers/codex-agent.ts` (see the `richPrompt` block; lines near the top)
  - Controls request body to Pi, and whether we post back (owner-only)
- Post-processing filter (sanitizer):
  - `src/handlers/codex-agent.ts` → `sanitizeOutput()`
  - Strips mentions and transcript/log/thinking lines to avoid loops/noise; does not truncate lists/tables
- Actions runner entry point:
  - `src/index.ts` — minimal runner that reads `GITHUB_EVENT_PATH`, decodes `eventPayload` (brotli+base64 or JSON), and calls `runPlugin`
- CI workflows:
  - `.github/workflows/compute.yml` — Minimal runner: checkout → `node dist/index.js` → upload artifacts. No installs/builds.
  - `.github/workflows/bundle-dist.yml` — Auto-bundles on every push and commits `dist/index.js` and `dist/index.js.map` (hooks disabled in CI).
- Policy and ops notes:
  - `AGENTS.md` — Rules for cold start, local dev, posting policy, and debugging knobs

## Posting Policy & Access Control

- The agent only posts a comment when the invoker is the owner (`@0x4007`).
- Everyone else is read‑only (no posting), but the Pi still runs and artifacts/logs are produced.
- Tokens (for posting from compute):
  - Owner: `PAT_FULL` (exposed as `USER_PAT_FULL`)
  - Others: `PAT_READ` (exposed as `USER_PAT_READ`)
  - Fallbacks: `PLUGIN_GITHUB_TOKEN`, then `GITHUB_TOKEN`
- Loop prevention: the sanitizer removes mentions and transcript/log lines so the agent doesn’t self‑trigger.

## Debug Knobs (when needed)

These env vars are read by the code. Keep compute.yml minimal; prefer a separate debug workflow if you must toggle.

- `WRITE_PROMPT_FILE=1` (enabled): writes `prompt-<run_id>.txt` and `pi-request-<run_id>.json`
- `WRITE_EVENT_FILE=1` (enabled): writes `event-<run_id>.json`
- Optional (off by default in compute):
  - `LOG_PROMPT=1` — print prompt (also in artifacts)
  - `LOG_PI_BODY=1` — print the exact request body to Pi
  - `DEBUG_EVENT=1` — print workflow_dispatch inputs and decoded event
  - `DEBUG_EVENT_RAW=1` — print raw `GITHUB_EVENT_PATH` JSON

Pi server settings the agent forwards:

- `PI_URL` — Base URL to the Pi server (e.g., `https://pi.pavlovcik.com`)
- `PI_TIMEOUT_MS` — Forwarded as `timeout_ms` to Pi; CI sets to 15 minutes

## Local Development (Reference)

- Do NOT build locally; use Bun to run TypeScript on the fly:
  - `npm run dev:local` → Bun harness
  - `npm run dev:pi` → Bun harness, talks to the Pi if `REAL_PI=1`
- CI auto‑bundles `dist/index.js` and `dist/index.js.map` on every push.
- compute.yml never installs or builds; it runs the committed `dist/` directly.

## Manual Re-Dispatch (If Kernel Doesn’t Trigger)

You can manually dispatch a compute run by crafting the `eventPayload` from the latest issue comment:

```bash
ISSUE=25; OWNER=ubiquity; REPO=.github-private
COMMENT_JSON=$(gh api /repos/$OWNER/$REPO/issues/$ISSUE/comments -q '.[-1]')
EVENT_PAYLOAD=$(jq -n --argjson comment "$COMMENT_JSON" --arg owner "$OWNER" --arg repo "$REPO" --argjson issue "{\"number\":$ISSUE}" '{action:"created", comment:$comment, issue:$issue, repository:{ name:$repo, owner:{ login:$owner } }}' | jq -c .)

jq -n \
  --arg stateId "manual-issue-$ISSUE-$(date +%s)" \
  --arg eventName "issue_comment.created" \
  --arg eventPayload "$EVENT_PAYLOAD" \
  --arg settings "{}" \
  --arg authToken "" \
  --arg ref "" \
  --arg signature "manual" \
  --arg command "" \
  --arg testMode "true" \
  '{stateId:$stateId, eventName:$eventName, eventPayload:$eventPayload, settings:$settings, authToken:$authToken, ref:$ref, signature:$signature, command:$command, testMode:$testMode}' \
| gh workflow run "Personal Agent Compute" -R 0x4007/personal-agent --json
```

Then monitor the run and download the `runtime-logs-*` artifact as described above.

## Common Pitfalls

- Comment must start with `@0x4007` at the first character; otherwise the handler ignores it.
- If a run completes but there’s no reply:
  - Check if the commenter is the owner (only owner runs post comments).
  - Inspect artifacts for the prompt and Pi body; look for errors in the run log.
- If responses drift or invent values:
  - Open `src/handlers/codex-agent.ts` and review the `richPrompt` guidance.
  - The prompt explicitly tells the model to prefer live reads via gh or API and to avoid guessing.
- Do not alter `.github/workflows/compute.yml` to install/build; cold start is critical.

## Non-Goals (Important)

- No special‑case “fast paths.” This system must remain generalized. If quality suffers, improve the prompt, context, or Pi execution environment — do not branch logic by command.
