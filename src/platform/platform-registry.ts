import { ResponseFormatter } from "./formatters/response-formatter";
import { GitHubFormatter } from "./formatters/github-formatter";
import { TelegramFormatter } from "./formatters/telegram-formatter";

export interface PlatformConfig {
  name: string;
  formatter: ResponseFormatter;
  tools: string[];
  credentialEnvVar: string;
  features: {
    supportsMarkdown: boolean;
    supportsCodeBlocks: boolean;
    supportsInlineImages: boolean;
    maxMessageLength: number;
  };
}

export class PlatformRegistry {
  private static registry: Map<string, PlatformConfig> = new Map([
    ['github', {
      name: 'GitHub',
      formatter: new GitHubFormatter(),
      tools: ['gh', 'git', 'shell'],
      credentialEnvVar: 'GITHUB_PAT',
      features: {
        supportsMarkdown: true,
        supportsCodeBlocks: true,
        supportsInlineImages: true,
        maxMessageLength: 65536
      }
    }],
    ['telegram', {
      name: 'Telegram',
      formatter: new TelegramFormatter(),
      tools: ['telegram-mcp', 'shell'],
      credentialEnvVar: 'TELEGRAM_BOT_TOKEN',
      features: {
        supportsMarkdown: true,
        supportsCodeBlocks: true,
        supportsInlineImages: false,
        maxMessageLength: 4096
      }
    }],
    ['discord', {
      name: 'Discord',
      formatter: new GitHubFormatter(), // Placeholder - will implement DiscordFormatter later
      tools: ['discord-mcp', 'shell'],
      credentialEnvVar: 'DISCORD_BOT_TOKEN',
      features: {
        supportsMarkdown: true,
        supportsCodeBlocks: true,
        supportsInlineImages: true,
        maxMessageLength: 2000
      }
    }],
    ['slack', {
      name: 'Slack',
      formatter: new GitHubFormatter(), // Placeholder - will implement SlackFormatter later
      tools: ['slack-mcp', 'shell'],
      credentialEnvVar: 'SLACK_APP_TOKEN',
      features: {
        supportsMarkdown: true,
        supportsCodeBlocks: true,
        supportsInlineImages: false,
        maxMessageLength: 40000
      }
    }]
  ]);

  static getPlatform(platformId: string): PlatformConfig | undefined {
    return this.registry.get(platformId.toLowerCase());
  }

  static getAllPlatforms(): string[] {
    return Array.from(this.registry.keys());
  }

  static registerPlatform(platformId: string, config: PlatformConfig): void {
    this.registry.set(platformId.toLowerCase(), config);
  }

  static getFormatter(platformId: string): ResponseFormatter {
    const platform = this.getPlatform(platformId);
    if (!platform) {
      // Fallback to GitHub formatter as default
      return new GitHubFormatter();
    }
    return platform.formatter;
  }

  static getTools(platformId: string): string[] {
    const platform = this.getPlatform(platformId);
    return platform?.tools || ['shell'];
  }

  static getCredentialEnvVar(platformId: string): string | undefined {
    const platform = this.getPlatform(platformId);
    return platform?.credentialEnvVar;
  }

  static getFeatures(platformId: string): PlatformConfig['features'] | undefined {
    const platform = this.getPlatform(platformId);
    return platform?.features;
  }
}