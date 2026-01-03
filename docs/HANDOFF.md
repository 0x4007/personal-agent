# Personal Agent - Handoff

## TL;DR

- Compute runs `node dist/index.js` (no installs/builds in compute).
- The agent is a thin client: it builds a prompt + context and calls your kernel/PI server at `/api/codex`.
- The kernel posts the final reply via `gh`; the action only creates a placeholder comment.

## Key Files

- `src/handlers/codex-agent/index.ts` - main handler (kernel/PI handoff).
- `src/handlers/codex-agent/lib/prompt.ts` - prompt builder (context shaping).
- `src/handlers/codex-agent/lib/github.ts` - GitHub prefetch + placeholder comment.
- `src/handlers/codex-agent/lib/pi.ts` - `/api/codex` client.
- `src/index.ts` - minimal Actions runner (decodes inputs).
- `.github/workflows/compute.yml` - runs `node dist/index.js` only.

## Env Highlights

- `PAT_FULL` or `USER_PAT` - create placeholder comments as the owner.
- `PI_URL` / `KERNEL_URL` - base URL for the kernel server (e.g., `https://kernel.pavlovcik.com`).
- `PI_TIMEOUT_MS` - timeout forwarded to `/api/codex`.
- `PI_MENTION` - set `false` to suppress @mentions in replies.
- `PI_MINIMAL` - set `1` to send only the raw command as the prompt.
- `PROMPT_FETCH_ISSUE` - prefetch issue/PR context (default on).
- `PROMPT_FETCH_LABELS` - prefetch repo labels (default off).
- `PROMPT_INCLUDE_EVENT` - include full webhook JSON in the prompt.
- `PROMPT_STRIP_URLS` - remove `*_url` fields from event/context.
- `PROMPT_MAX_LEN` - guardrail to fall back to minimal prompt if too large.

## Notes

- Kernel dispatch must send a real installation token (see `ubiquity-os-kernel` `callPersonalAgent`).
