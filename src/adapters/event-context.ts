/**
 * Platform-agnostic event context interface
 * This structure represents events from any platform in a unified format
 */
export interface EventContext {
  platform: string;                // "github", "telegram", "discord"
  eventType: string;              // "issue_comment", "message", etc.
  source?: string;                // Platform-specific identifier
  repository?: string;            // GitHub: "owner/repo"
  issueNumber?: string;
  pullRequestNumber?: string;
  author: string;
  command: string;
  metadata?: {
    chatId?: string;              // Telegram
    messageId?: string;           
    channelId?: string;           // Discord/Slack
    threadId?: string;
    [key: string]: any;
  };
  authentication?: {
    github?: boolean;
    telegram?: boolean;
    discord?: boolean;
    [platform: string]: boolean | undefined;
  };
}

/**
 * Validates that an EventContext has all required fields
 */
export function validateEventContext(context: EventContext): boolean {
  if (!context.platform || typeof context.platform !== 'string') {
    return false;
  }
  
  if (!context.eventType || typeof context.eventType !== 'string') {
    return false;
  }
  
  if (!context.author || typeof context.author !== 'string') {
    return false;
  }
  
  if (!context.command || typeof context.command !== 'string') {
    return false;
  }
  
  return true;
}

/**
 * Creates a new EventContext with default values
 */
export function createEventContext(partial: Partial<EventContext>): EventContext {
  return {
    platform: '',
    eventType: '',
    author: '',
    command: '',
    ...partial,
  };
}