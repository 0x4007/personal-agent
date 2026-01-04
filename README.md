# `@ubiquity-os/personal-agent`

Personal Agent is a UbiquityOS plugin that routes `@<owner>` mentions to your kernel/PI server. The kernel dispatches a workflow in your fork, the agent builds a prompt + context, calls your server at `/api/codex`, and the server posts the reply as you using `gh`.

## What It Does

- Any issue comment that starts with `@username` triggers the agent.
- The agent optionally prefetches issue/PR context and forwards a structured prompt to your kernel server.
- The kernel runs the agentic workflow and posts the final reply via `gh`.

## Setup

1. Fork this repo as `personal-agent` under your account.
2. Install the UbiquityOS GitHub App on the repos where you want the agent to run.
3. Add secrets to your fork:
   - `PAT_FULL` (recommended) or `USER_PAT` for creating placeholder comments.
4. Set `PI_URL` (or `KERNEL_URL`) in `.github/workflows/compute.yml` to your kernel server (e.g., `https://kernel.pavlovcik.com`).
5. (Optional) Set `PI_MENTION=false` to avoid @mention prefixes in replies.
6. (Optional) Configure style examples from your own comments:
   - `PROMPT_FETCH_STYLE=1` (default on).
   - `PROMPT_STYLE_SOURCE=vector-db` to pull examples from the embeddings DB (or `auto` to fall back to GitHub).
   - `UOS_VECTOR_DB_URL` + `UOS_VECTOR_DB_KEY` (or `SUPABASE_URL` + `SUPABASE_*_KEY`) for vector DB access.
   - `PROMPT_STYLE_CACHE_ISSUE` (and optional `PROMPT_STYLE_CACHE_REPO`) to cache style examples in a GitHub issue comment.

## Usage

Comment in any repo where UbiquityOS is installed:

```
@username summarize this issue and propose next steps
```

Replace `username` with the account that owns the fork. The agent will reply as that user.

You can override behavior with env vars (see `src/types/env.ts`).

## Development

- Install dependencies:
  ```
  bun install
  ```

## Notes

- The compute workflow runs the committed `dist/index.js` only (no installs/builds in compute).
- The kernel dispatch must pass a real installation token (see kernel `callPersonalAgent`).
- Posting is handled by your kernel/PI server via `gh`, not by the action itself.
