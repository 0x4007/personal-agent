# `@ubiquity-os/personal-agent`

Personal Agent is a UbiquityOS plugin that replies as the repo owner when a comment starts with `@<owner>`. The kernel dispatches a workflow in your fork, the agent calls `ai.ubq.fi` via the plugin SDK, and then posts the reply as you using a PAT.

## What It Does

- Any issue comment that starts with `@username` triggers the agent.
- The agent pulls issue context and a few of your recent comments to mimic your voice.
- It replies as you (using a PAT) and appends an invisible marker so AI outputs are easy to filter later.

## Setup

1. Fork this repo as `personal-agent` under your account.
2. Install the UbiquityOS GitHub App on the repos where you want the agent to run.
3. Add secrets to your fork:
   - `PAT_FULL` (recommended) or `USER_PAT` for posting as you.
4. (Optional) Set `UOS_AI_MODEL` if you want a specific model.

## Usage

Comment in any repo where UbiquityOS is installed:

```
@username summarize this issue and propose next steps
```

Replace `username` with the account that owns the fork. The agent will reply as that user.

## Voice & Style

The agent fetches recent comments written by the owner and uses them as style examples. To keep AI outputs out of the style pool, the agent appends this marker to its own replies:

```
<!-- pa:ai -->
```

You can override behavior with env vars (see `src/types/env.ts`).

## Development

- Install dependencies:
  ```
  bun install
  ```

## Notes

- The compute workflow runs the committed `dist/index.js` only (no installs/builds in compute).
- The kernel dispatch must pass a real installation token (see kernel `callPersonalAgent`).
- If you want to allow posting as the GitHub App when no PAT is set, add `UOS_ALLOW_APP_POST=1` to the workflow env.
