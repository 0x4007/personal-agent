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
  // Kernel/PI integration
  PI_URL: T.Optional(T.String()),
  KERNEL_URL: T.Optional(T.String()),
  PI_TIMEOUT_MS: T.Optional(T.String()),
  PI_MENTION: T.Optional(T.String()),
  PI_MINIMAL: T.Optional(T.String()),
  // Prompt shaping
  PROMPT_INCLUDE_EVENT: T.Optional(T.String()),
  INCLUDE_GH_EVENT: T.Optional(T.String()),
  PROMPT_STRIP_URLS: T.Optional(T.String()),
  PROMPT_FETCH_ISSUE: T.Optional(T.String()),
  PROMPT_FETCH_LABELS: T.Optional(T.String()),
  PROMPT_FETCH_STYLE: T.Optional(T.String()),
  PROMPT_STYLE_SOURCE: T.Optional(T.String()),
  PROMPT_STYLE_EXAMPLES: T.Optional(T.String()),
  PROMPT_STYLE_EXAMPLE_MAX_CHARS: T.Optional(T.String()),
  PROMPT_STYLE_LOOKBACK_DAYS: T.Optional(T.String()),
  PROMPT_STYLE_MAX_DATE: T.Optional(T.String()),
  PROMPT_STYLE_CACHE_ISSUE: T.Optional(T.String()),
  PROMPT_STYLE_CACHE_REPO: T.Optional(T.String()),
  PROMPT_STYLE_CACHE_MARKER: T.Optional(T.String()),
  PROMPT_STYLE_CACHE_TTL_HOURS: T.Optional(T.String()),
  PROMPT_STYLE_CACHE_WRITE: T.Optional(T.String()),
  PROMPT_MAX_LEN: T.Optional(T.String()),
  UOS_STYLE_FETCH: T.Optional(T.String()),
  UOS_STYLE_SOURCE: T.Optional(T.String()),
  UOS_STYLE_EXAMPLES: T.Optional(T.String()),
  UOS_STYLE_EXAMPLE_MAX_CHARS: T.Optional(T.String()),
  UOS_STYLE_LOOKBACK_DAYS: T.Optional(T.String()),
  UOS_STYLE_MAX_DATE: T.Optional(T.String()),
  UOS_STYLE_CACHE_ISSUE: T.Optional(T.String()),
  UOS_STYLE_CACHE_REPO: T.Optional(T.String()),
  UOS_STYLE_CACHE_MARKER: T.Optional(T.String()),
  UOS_STYLE_CACHE_TTL_HOURS: T.Optional(T.String()),
  UOS_STYLE_CACHE_WRITE: T.Optional(T.String()),
  UOS_VECTOR_DB_URL: T.Optional(T.String()),
  UOS_VECTOR_DB_KEY: T.Optional(T.String()),
  SUPABASE_URL: T.Optional(T.String()),
  SUPABASE_SERVICE_ROLE_KEY: T.Optional(T.String()),
  SUPABASE_KEY: T.Optional(T.String()),
  SUPABASE_ANON_KEY: T.Optional(T.String()),
  SUPABASE_PROJECT_ID: T.Optional(T.String()),
  // Debug/logging
  LOG_PROMPT: T.Optional(T.String()),
  LOG_PI_BODY: T.Optional(T.String()),
  WRITE_PROMPT_FILE: T.Optional(T.String()),
  WRITE_EVENT_FILE: T.Optional(T.String()),
  DEBUG_EVENT: T.Optional(T.String()),
  DEBUG_EVENT_RAW: T.Optional(T.String()),
});

export type Env = StaticDecode<typeof envSchema>;
