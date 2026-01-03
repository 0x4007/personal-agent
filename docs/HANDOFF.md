# Personal Agent - Handoff

## TL;DR

- Compute runs `node dist/index.js` (no installs/builds in compute).
- The agent calls the LLM via `@ubiquity-os/plugin-sdk` (base URL set by `UOS_AI_BASE_URL`) and posts as the owner using a PAT.
- Replies include an invisible marker `<!-- pa:ai -->` so we can filter AI output from style examples.

## Key Files

- `src/handlers/codex-agent/index.ts` - main handler (LLM call + posting).
- `src/handlers/codex-agent/lib/prompt.ts` - prompt builder (voice + context).
- `src/handlers/codex-agent/lib/github.ts` - GitHub fetch + style examples.
- `src/index.ts` - minimal Actions runner (decodes inputs).
- `.github/workflows/compute.yml` - runs `node dist/index.js` only.

## Env Highlights

- `PAT_FULL` or `USER_PAT` - post replies as the owner.
- `UOS_AI_TOKEN` - optional API key for `ai-ubq-fi.deno.dev`.
- `UOS_AI_BASE_URL` - override LLM base URL (default from workflow).
- `UOS_AI_MODEL` - optional model override.
- `UOS_STYLE_EXAMPLES` - number of style examples to embed.
- `UOS_STYLE_LOOKBACK_DAYS` - history window for style examples.

## Notes

- Kernel dispatch must send a real installation token (see `ubiquity-os-kernel` `callPersonalAgent`).
