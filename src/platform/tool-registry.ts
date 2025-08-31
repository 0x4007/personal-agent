export interface Tool {
  name: string;
  description: string;
  platformSpecific: boolean;
}

export class ToolRegistry {
  private static _commonTools: Tool[] = [
    {
      name: "shell",
      description: "Execute shell commands",
      platformSpecific: false,
    },
    {
      name: "file",
      description: "Read and write files",
      platformSpecific: false,
    },
  ];

  private static _platformTools: Map<string, Tool[]> = new Map([
    [
      "github",
      [
        {
          name: "gh",
          description: "GitHub CLI for repository operations",
          platformSpecific: true,
        },
        {
          name: "git",
          description: "Git version control operations",
          platformSpecific: true,
        },
      ],
    ],
    [
      "telegram",
      [
        {
          name: "telegram-mcp",
          description: "Telegram Bot API operations via MCP",
          platformSpecific: true,
        },
      ],
    ],
  ]);

  /**
   * Get available tools for a specific platform
   */
  static getToolsForPlatform(platform: string): Tool[] {
    const platformSpecific = this._platformTools.get(platform.toLowerCase()) || [];
    return [...this._commonTools, ...platformSpecific];
  }

  /**
   * Get tool names for a specific platform (for prompt generation)
   */
  static getToolNamesForPlatform(platform: string): string[] {
    return this.getToolsForPlatform(platform).map((tool) => tool.name);
  }

  /**
   * Generate a tool description string for prompt inclusion
   */
  static generateToolDescription(platform: string): string {
    const tools = this.getToolsForPlatform(platform);
    const descriptions = tools.map((tool) => `- ${tool.name}: ${tool.description}`);

    return `Available tools for ${platform}:\n${descriptions.join("\n")}`;
  }

  /**
   * Check if a specific tool is available for a platform
   */
  static isToolAvailable(platform: string, toolName: string): boolean {
    const tools = this.getToolsForPlatform(platform);
    return tools.some((tool) => tool.name === toolName);
  }

  /**
   * Register a new tool for a platform
   */
  static registerTool(platform: string, tool: Tool): void {
    const platformLower = platform.toLowerCase();
    if (!this._platformTools.has(platformLower)) {
      this._platformTools.set(platformLower, []);
    }
    const tools = this._platformTools.get(platformLower);
    if (tools && !tools.some((t) => t.name === tool.name)) {
      tools.push(tool);
    }
  }
}
