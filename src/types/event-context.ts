/**
 * Universal event context that adapts to events from any platform
 * This is the core data structure that drives the Personal Agent
 */
export interface EventContext {
  /**
   * Platform identifier (e.g., "github", "telegram")
   * This drives MCP tool selection and response formatting
   */
  platform: string;

  /**
   * Type of event (e.g., "issue_comment", "message", "command")
   * Platform-specific event types
   */
  eventType: string;

  /**
   * Source identifier (e.g., "owner/repo", "chat_id", "channel_id")
   * Platform-specific source of the event
   */
  source?: string;

  /**
   * GitHub-specific: repository in "owner/repo" format
   * @deprecated Use 'source' for platform-agnostic code
   */
  repository?: string;

  /**
   * GitHub issue number
   */
  issueNumber?: string;

  /**
   * GitHub pull request number
   */
  pullRequestNumber?: string;

  /**
   * Author of the event (username or identifier)
   * Required field for all platforms
   */
  author: string;

  /**
   * The actual command or message text
   * Required field for all platforms
   */
  command: string;

  /**
   * List of available tools for this platform
   */
  availableTools?: string[];

  /**
   * Platform-specific metadata
   * Extensible for any platform-specific data
   */
  metadata?: {
    // Telegram-specific
    chatId?: string;
    messageId?: string;
    callbackQueryId?: string;
    chatType?: "private" | "group" | "supergroup" | "channel";
    threadId?: number | string; // Platform-specific thread ID
    userId?: number;
    userIsAdmin?: boolean;
    hasPhoto?: boolean;
    photoId?: string;
    replyToMessageId?: string;

    // Platform-specific channel ID
    channelId?: string;

    // GitHub-specific
    action?: string;
    reviewId?: string;
    commitId?: string;
    path?: string;
    line?: number;

    // Common fields
    retries?: number;
    fallbackUsed?: boolean;

    // Extensible for any platform
    [key: string]: any;
  };

  /**
   * Authentication information
   * Maps platform to credential availability
   */
  authentication?: {
    github?: boolean;
    telegram?: boolean;
    [platform: string]: boolean | undefined;
  };

  /**
   * Access level for the operation
   * Determines what operations are allowed
   */
  accessLevel?: "read-only" | "full";

  /**
   * Extensible for any additional fields
   * Allows platforms to add custom fields without breaking the interface
   */
  [key: string]: string | number | object | boolean | undefined;
}

/**
 * Response context for formatting responses appropriately per platform
 */
export interface ResponseContext {
  /**
   * Target platform for the response
   */
  platform: string;

  /**
   * Format to use for the response
   */
  format: "markdown" | "MarkdownV2" | "html" | "plain";

  /**
   * Maximum message length for the platform
   */
  maxLength?: number;

  /**
   * Whether the platform supports inline keyboards/buttons
   */
  supportsInteractive?: boolean;

  /**
   * Whether the platform supports media/file uploads
   */
  supportsMedia?: boolean;

  /**
   * Platform-specific formatting options
   */
  options?: Record<string, any>;
}
