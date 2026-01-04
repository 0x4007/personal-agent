# PAT Plan

## Recommended

- Use a single fine-grained PAT with repo access and comment write permissions.
- Set it as `PAT_FULL` (or `USER_PAT`) in repo secrets.
- Set `UOS_AI_USER_TOKEN` for ai.ubq.fi LLM calls.

## Optional Split

If you still want split tokens:

- `PAT_READ` - read-only (prefetch context)
- `PAT_FULL` - write (posting replies)

The code prefers `USER_PAT`/`PAT_FULL` for posting and falls back to read-only for fetching.

## AI Output Marker

Replies append:

```
<!-- pa:ai -->
```

Use this marker to filter AI-generated comments from future style sampling.
