import { StaticDecode, Type as T } from "@sinclair/typebox";
import { LOG_LEVEL } from "@ubiquity-os/ubiquity-os-logger";
import "dotenv/config";

/**
 * Define sensitive environment variables here.
 *
 * These are fed into the worker/workflow as `env` and are
 * taken from either `dev.vars` or repository secrets.
 * They are used with `process.env` but are type-safe.
 */
export const envSchema = T.Object({
  LOG_LEVEL: T.Optional(T.Enum(LOG_LEVEL, { default: LOG_LEVEL.INFO })),
  KERNEL_PUBLIC_KEY: T.Optional(T.String()),
  AGENT_OWNER: T.String(),
  // Platform-specific credentials
  GITHUB_PAT: T.Optional(T.String()),
  TELEGRAM_BOT_TOKEN: T.Optional(T.String()),
  // Backwards compatibility (will be deprecated)
  USER_PAT: T.Optional(T.String()),
});

export type Env = StaticDecode<typeof envSchema>;
