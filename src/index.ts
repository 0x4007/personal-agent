import { codexAgent } from "./handlers/codex-agent";
import { Context } from "./types";
import { isIssueCommentEvent } from "./types/typeguards";

/**
 * The main plugin function. Split for easier testing.
 */
export async function runPlugin(context: Context) {
  const { logger, eventName } = context;

  if (isIssueCommentEvent(context)) {
    return await codexAgent(context);
  }

  logger.error(`Unsupported event: ${eventName}`);
}
