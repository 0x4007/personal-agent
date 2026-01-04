# Personal Agent - Handoff

## TL;DR

- Compute runs `node dist/index.js` (no installs/builds in compute).
- The kernel dispatches the `compute.yml` workflow via `workflow_dispatch` (see `callPersonalAgent`).
- The workflow builds a prompt and dispatches the agent workflow (copied from kernel) to reply.

## Key Files

- `src/handlers/codex-agent/index.ts` - main handler (prompt + agent dispatch).
- `src/handlers/codex-agent/lib/prompt.ts` - prompt builder (tone + output contract).
- `src/handlers/codex-agent/lib/github.ts` - style example retrieval.
- `src/handlers/codex-agent/lib/conversation-graph.ts` - conversation key resolution + graph links.
- `src/handlers/codex-agent/lib/conversation-context.ts` - linked/semantic context builder.
- `src/handlers/codex-agent/lib/agent-memory.ts` - KV-backed agent memory snippets.
- `src/handlers/codex-agent/lib/agent-dispatch.ts` - workflow dispatch helper.
- `src/index.ts` - minimal Actions runner (decodes inputs).
- `.github/workflows/compute.yml` - runs `node dist/index.js` only.

## Env Highlights

- `KERNEL_PUBLIC_KEY` - verify kernel signature on workflow inputs.
- `PAT_FULL` - token used for GitHub actions (context reads + posting replies).
- `UOS_AI_USER_TOKEN` - ai.ubq.fi token used for LLM calls in the agent workflow.
- `AGENT_OWNER` - owner username for matching `@` mentions.
- `UOS_AGENT_OWNER` / `UOS_AGENT_REPO` / `UOS_AGENT_WORKFLOW` / `UOS_AGENT_REF` - agent workflow target.
- `UOS_AGENT_DISPATCH` - set `0` to disable dispatch (local debugging).
- `PROMPT_FETCH_STYLE` - fetch style examples from the owner's recent comments (default on).
- `PROMPT_STYLE_SOURCE` - `github` (default), `vector-db`, or `auto`.
- `PROMPT_STYLE_EXAMPLES` - number of style examples to embed in the prompt.
- `PROMPT_STYLE_LOOKBACK_DAYS` - history window for style examples.
- `PROMPT_STYLE_EXAMPLE_MAX_CHARS` - truncate each style example body.
- `PROMPT_STYLE_CACHE_ISSUE` - issue number used to store cached style examples.
- `PROMPT_STYLE_CACHE_REPO` - optional `owner/repo` for the cache issue (defaults to the action repo).
- `PROMPT_STYLE_CACHE_TTL_HOURS` - refresh cadence for cached style examples.
- `PROMPT_STYLE_CACHE_WRITE` - set `0` to disable cache updates.
- `PROMPT_STYLE_CACHE_MARKER` - HTML comment marker label for cached payloads.
- `UOS_VECTOR_DB_URL` / `UOS_VECTOR_DB_KEY` - Supabase REST config for vector DB style examples (or `SUPABASE_URL` + `SUPABASE_*_KEY`).
- `UOS_AGENT_MEMORY_URL` / `UOS_AGENT_MEMORY_KEY` - KV endpoint + AES key for agent memory (optional).
- `PROMPT_MAX_LEN` - guardrail to fall back to minimal prompt if too large.
- `LOG_PROMPT` - log the full prompt in workflow logs.
- `WRITE_PROMPT_FILE` / `WRITE_EVENT_FILE` - write prompt/event files to artifacts.

## Notes

- Kernel dispatch provides the signed payload; GitHub operations run under `PAT_FULL`.
