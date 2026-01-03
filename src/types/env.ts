import { StaticDecode, Type as T } from "@sinclair/typebox";
import { LOG_LEVEL } from "@ubiquity-os/ubiquity-os-logger";
import "dotenv/config";

/**
 * Define sensitive environment variables here.
 * These are fed into the worker/workflow as `env` and are
 * taken from either `dev.vars` or repository secrets.
 */
export const envSchema = T.Object({
  LOG_LEVEL: T.Optional(T.Enum(LOG_LEVEL, { default: LOG_LEVEL.INFO })),
  KERNEL_PUBLIC_KEY: T.Optional(T.String()),
  AGENT_OWNER: T.String(),
  USER_PAT: T.Optional(T.String()),
  USER_PAT_FULL: T.Optional(T.String()),
  USER_PAT_READ: T.Optional(T.String()),
  PAT: T.Optional(T.String()),
  PAT_FULL: T.Optional(T.String()),
  PAT_READ: T.Optional(T.String()),
  UOS_AI_TOKEN: T.Optional(T.String()),
  UOS_AI_BASE_URL: T.Optional(T.String()),
  UOS_AI_URL: T.Optional(T.String()),
  UOS_AI_MODEL: T.Optional(T.String()),
  UOS_STYLE_EXAMPLES: T.Optional(T.String()),
  UOS_STYLE_LOOKBACK_DAYS: T.Optional(T.String()),
  UOS_STYLE_MAX_DATE: T.Optional(T.String()),
  UOS_STYLE_EXAMPLE_MAX_CHARS: T.Optional(T.String()),
  UOS_STYLE_CACHE_ISSUE: T.Optional(T.String()),
  UOS_STYLE_CACHE_REPO: T.Optional(T.String()),
  UOS_STYLE_CACHE_TTL_HOURS: T.Optional(T.String()),
  UOS_STYLE_CACHE_WRITE: T.Optional(T.String()),
  UOS_STYLE_CACHE_MARKER: T.Optional(T.String()),
  UOS_CONTEXT_FETCH: T.Optional(T.String()),
  UOS_CONTEXT_COMMENT_LIMIT: T.Optional(T.String()),
  UOS_CONTEXT_COMMENT_MAX_CHARS: T.Optional(T.String()),
  UOS_CONTEXT_ISSUE_MAX_CHARS: T.Optional(T.String()),
  UOS_CONTEXT_BODY_MAX_CHARS: T.Optional(T.String()),
  UOS_CONTEXT_COMMENT_SHOW: T.Optional(T.String()),
  UOS_REPLY_MAX_CHARS: T.Optional(T.String()),
  UOS_REPLY_MARKER: T.Optional(T.String()),
  UOS_STYLE_FETCH: T.Optional(T.String()),
  UOS_VOICE_GUIDE: T.Optional(T.String()),
  UOS_ALLOW_APP_POST: T.Optional(T.String()),
});

export type Env = StaticDecode<typeof envSchema>;
