import { claudeAgent } from "./handlers/claude-agent";
import { isIssueCommentEvent } from "./types/typeguards";
/**
 * The main plugin function. Split for easier testing.
 */
export async function runPlugin(context) {
    const { logger, eventName } = context;
    if (isIssueCommentEvent(context)) {
        return await claudeAgent(context);
    }
    logger.error(`Unsupported event: ${eventName}`);
}
