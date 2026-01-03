# Personal Agent - Testing & Debugging Guide

## Trigger

- Comment on an issue in a repo where UbiquityOS is installed.
- The comment must start with the owner mention (first character):
  - Example: `@0x4007 summarize the spec and list next steps`

This triggers the kernel to dispatch the `Personal Agent Compute` workflow in `0x4007/personal-agent`.

## Monitor Runs

- List runs:
  - `gh run list -R 0x4007/personal-agent --workflow "Personal Agent Compute"`
- Watch a run:
  - `gh run watch <run_id> -R 0x4007/personal-agent --interval 5 --exit-status`
- View logs:
  - `gh run view <run_id> -R 0x4007/personal-agent --log`

## Runtime Artifacts

Each run uploads `runtime-logs-<run_id>` containing:

- `prompt-<run_id>.txt` - the full prompt sent to the kernel.
- `pi-request-<run_id>.json` - the JSON body posted to `/api/codex`.
- `event-<run_id>.json` - decoded GitHub event payload.

Download:

```
gh run download <run_id> -R 0x4007/personal-agent -n runtime-logs-<run_id> -D /tmp/pa_logs_<run_id>
```

## Debug Knobs

- `LOG_PROMPT=1` - print the prompt to logs.
- `WRITE_PROMPT_FILE=1` - write prompt and request files to artifacts.
- `WRITE_EVENT_FILE=1` - include decoded event payload.
- `LOG_PI_BODY=1` - log the `/api/codex` request body.

## Common Pitfalls

- The comment must start with `@0x4007`.
- If no reply posts, confirm `PI_URL` is reachable and the kernel is running.
- If placeholders fail, confirm `PAT_FULL` or `USER_PAT` is set.
