import { claudeAgent } from "./handlers/claude-agent";
import { Context } from "./types";
import { isIssueCommentEvent } from "./types/typeguards";

/**
 * The main plugin function. Split for easier testing.
 */
export async function runPlugin(context: Context) {
  const { logger, eventName } = context;

  if (isIssueCommentEvent(context)) {
    return await claudeAgent(context);
  }

  logger.error(`Unsupported event: ${eventName}`);
}
