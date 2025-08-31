export interface EventContext {
  platform: string;                // e.g., "github", "telegram", "discord"
  eventType: string;              // e.g., "issue_comment", "message", "command"
  source?: string;                // e.g., "owner/repo", "chat_id", "channel_id"
  repository?: string;            // GitHub-specific: "owner/repo"
  issueNumber?: string;
  pullRequestNumber?: string;
  author: string;
  command: string;
  authentication?: Record<string, boolean>; // Platform authentication status
  availableTools?: string[];     // List of available tools for this platform
  metadata?: {                   // Platform-specific metadata
    chatId?: string;            // Telegram
    messageId?: string;         // Various platforms
    channelId?: string;         // Discord/Slack
    threadId?: string;          // Slack threads
    guildId?: string;           // Discord servers
    [key: string]: any;
  };
  [key: string]: string | number | object | undefined;  // Extensible for any event data
}