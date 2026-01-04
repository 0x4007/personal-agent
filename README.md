# `@ubiquity-os/personal-agent`

Personal Agent is a UbiquityOS plugin that routes `@<owner>` mentions to your personal agent workflow. The kernel dispatches a workflow in your fork, the agent builds a prompt + context, and the workflow generates the reply.

## What It Does

- Any issue comment that starts with `@username` triggers the agent.
- The workflow can prefetch issue/PR context and style examples to build a structured prompt.
- Replies are posted with your PAT so the agent can act as you.

## Setup

1. Fork this repo as `personal-agent` under your account.
2. Install the UbiquityOS GitHub App on the repos where you want the agent to run.
3. Add secrets to your fork:
   - `KERNEL_PUBLIC_KEY` for signature verification.
   - `PAT_FULL` (required) for GitHub actions (posting replies, context reads).
   - `UOS_AI_USER_TOKEN` (required) for ai.ubq.fi LLM calls.
4. Ensure the kernel dispatch targets your fork (see `UOS_AGENT_OWNER`, `UOS_AGENT_REPO`, and `UOS_AGENT_WORKFLOW`; defaults to this repo).
5. (Optional) Configure style examples from your own comments:
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
- The kernel dispatch provides the signed payload; GitHub actions run under your `PAT_FULL`.
- LLM traffic is routed through ai.ubq.fi using `UOS_AI_USER_TOKEN`.
