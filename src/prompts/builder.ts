import { EventContext } from '../adapters/event-context';
import { AccessMode } from '../security/access-control';

export interface PromptBuilderOptions {
  eventContext: EventContext;
  accessMode: AccessMode;
  additionalContext?: string;
  availableTools?: string[];
}

/**
 * Platform-agnostic prompt builder that constructs prompts based on EventContext
 */
export class PromptBuilder {
  private eventContext: EventContext;
  private accessMode: AccessMode;
  private additionalContext?: string;
  private availableTools: string[];

  constructor(options: PromptBuilderOptions) {
    this.eventContext = options.eventContext;
    this.accessMode = options.accessMode;
    this.additionalContext = options.additionalContext;
    this.availableTools = options.availableTools || [];
  }

  /**
   * Builds the main prompt for Claude
   */
  build(): string {
    const sections: string[] = [];

    // Platform identification
    sections.push(this.buildPlatformSection());

    // Event context
    sections.push(this.buildEventSection());

    // Access level
    sections.push(this.buildAccessSection());

    // Available tools
    if (this.availableTools.length > 0) {
      sections.push(this.buildToolsSection());
    }

    // Command
    sections.push(this.buildCommandSection());

    // Additional context
    if (this.additionalContext) {
      sections.push(this.buildAdditionalContextSection());
    }

    // Platform-specific hints
    sections.push(this.buildPlatformHints());

    return sections.filter(Boolean).join('\n\n');
  }

  private buildPlatformSection(): string {
    return `## Platform Context
You are responding to an event from: ${this.eventContext.platform}
Event type: ${this.eventContext.eventType}`;
  }

  private buildEventSection(): string {
    const lines: string[] = ['## Event Details'];

    if (this.eventContext.source) {
      lines.push(`Source: ${this.eventContext.source}`);
    }

    if (this.eventContext.repository) {
      lines.push(`Repository: ${this.eventContext.repository}`);
    }

    if (this.eventContext.issueNumber) {
      lines.push(`Issue #${this.eventContext.issueNumber}`);
    }

    if (this.eventContext.pullRequestNumber) {
      lines.push(`Pull Request #${this.eventContext.pullRequestNumber}`);
    }

    lines.push(`Author: ${this.eventContext.author}`);

    // Include relevant metadata
    if (this.eventContext.metadata) {
      const relevantMetadata = this.getRelevantMetadata();
      if (Object.keys(relevantMetadata).length > 0) {
        lines.push('');
        lines.push('Additional context:');
        for (const [key, value] of Object.entries(relevantMetadata)) {
          if (value !== undefined && value !== null) {
            lines.push(`- ${this.formatMetadataKey(key)}: ${value}`);
          }
        }
      }
    }

    return lines.join('\n');
  }

  private buildAccessSection(): string {
    const accessLevel = this.accessMode === AccessMode.FULL ? 'FULL ACCESS' : 'READ-ONLY';
    const capabilities = this.accessMode === AccessMode.FULL
      ? 'You can read and write files, execute commands, and make changes.'
      : 'You can only read files and gather information. No modifications are allowed.';

    return `## Access Level
${accessLevel}: ${capabilities}`;
  }

  private buildToolsSection(): string {
    return `## Available Tools
Based on the platform (${this.eventContext.platform}), you have access to:
${this.availableTools.map(tool => `- ${tool}`).join('\n')}`;
  }

  private buildCommandSection(): string {
    return `## User Command
${this.eventContext.command}`;
  }

  private buildAdditionalContextSection(): string {
    return `## Additional Context
${this.additionalContext}`;
  }

  private buildPlatformHints(): string {
    const hints: string[] = [];

    switch (this.eventContext.platform) {
      case 'github':
        hints.push('- Format responses using GitHub Markdown');
        hints.push('- Consider using GitHub CLI (gh) for platform operations');
        hints.push('- Be aware of repository context and permissions');
        break;

      case 'telegram':
        hints.push('- Format responses using Telegram MarkdownV2');
        hints.push('- Consider message length limits (4096 characters)');
        hints.push('- Use Telegram MCP tools if available for rich interactions');
        break;

      case 'discord':
        hints.push('- Format responses using Discord Markdown');
        hints.push('- Consider message length limits (2000 characters)');
        hints.push('- Use Discord embeds for rich content if available');
        break;

      case 'slack':
        hints.push('- Format responses using Slack mrkdwn');
        hints.push('- Consider using Slack blocks for rich formatting');
        hints.push('- Be aware of workspace context');
        break;
    }

    if (hints.length === 0) {
      return '';
    }

    return `## Platform-Specific Guidelines
${hints.join('\n')}`;
  }

  private getRelevantMetadata(): Record<string, any> {
    if (!this.eventContext.metadata) {
      return {};
    }

    // Filter out internal or sensitive metadata
    const { rawPayload, ...relevantData } = this.eventContext.metadata;

    // Platform-specific filtering
    switch (this.eventContext.platform) {
      case 'github':
        return {
          issueTitle: relevantData.issueTitle,
          prTitle: relevantData.prTitle,
          baseBranch: relevantData.baseBranch,
          headBranch: relevantData.headBranch,
        };

      case 'telegram':
        return {
          chatId: relevantData.chatId,
          messageId: relevantData.messageId,
        };

      case 'discord':
        return {
          channelId: relevantData.channelId,
          threadId: relevantData.threadId,
        };

      default:
        return relevantData;
    }
  }

  private formatMetadataKey(key: string): string {
    // Convert camelCase to readable format
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }

  /**
   * Creates a simplified prompt for retry scenarios
   */
  buildSimplified(): string {
    return `Platform: ${this.eventContext.platform}
Author: ${this.eventContext.author}
Command: ${this.eventContext.command}

Please process this command with ${this.accessMode} access.`;
  }
}

/**
 * Factory function for creating prompt builders
 */
export function createPromptBuilder(
  eventContext: EventContext,
  accessMode: AccessMode,
  additionalContext?: string
): PromptBuilder {
  // Determine available tools based on platform
  const availableTools = getToolsForPlatform(eventContext.platform);

  return new PromptBuilder({
    eventContext,
    accessMode,
    additionalContext,
    availableTools,
  });
}

/**
 * Returns the list of tools available for a given platform
 */
function getToolsForPlatform(platform: string): string[] {
  const commonTools = [
    'File system operations',
    'Shell command execution',
    'Web requests',
  ];

  const platformTools: Record<string, string[]> = {
    github: [
      ...commonTools,
      'GitHub CLI (gh)',
      'Git operations',
      'Issue and PR management',
    ],
    telegram: [
      ...commonTools,
      'Telegram Bot API (via MCP)',
      'Message sending and editing',
      'Inline keyboards',
    ],
    discord: [
      ...commonTools,
      'Discord Bot API (via MCP)',
      'Embed creation',
      'Channel management',
    ],
    slack: [
      ...commonTools,
      'Slack Web API (via MCP)',
      'Block Kit formatting',
      'Workspace operations',
    ],
  };

  return platformTools[platform] || commonTools;
}