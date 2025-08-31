export class ToolRegistry {
    static commonTools = [
        {
            name: 'shell',
            description: 'Execute shell commands',
            platformSpecific: false
        },
        {
            name: 'file',
            description: 'Read and write files',
            platformSpecific: false
        }
    ];
    static platformTools = new Map([
        ['github', [
                {
                    name: 'gh',
                    description: 'GitHub CLI for repository operations',
                    platformSpecific: true
                },
                {
                    name: 'git',
                    description: 'Git version control operations',
                    platformSpecific: true
                }
            ]],
        ['telegram', [
                {
                    name: 'telegram-mcp',
                    description: 'Telegram Bot API operations via MCP',
                    platformSpecific: true
                }
            ]],
        ['discord', [
                {
                    name: 'discord-mcp',
                    description: 'Discord Bot API operations via MCP',
                    platformSpecific: true
                }
            ]],
        ['slack', [
                {
                    name: 'slack-mcp',
                    description: 'Slack App API operations via MCP',
                    platformSpecific: true
                }
            ]]
    ]);
    /**
     * Get available tools for a specific platform
     */
    static getToolsForPlatform(platform) {
        const platformSpecific = this.platformTools.get(platform.toLowerCase()) || [];
        return [...this.commonTools, ...platformSpecific];
    }
    /**
     * Get tool names for a specific platform (for prompt generation)
     */
    static getToolNamesForPlatform(platform) {
        return this.getToolsForPlatform(platform).map(tool => tool.name);
    }
    /**
     * Generate a tool description string for prompt inclusion
     */
    static generateToolDescription(platform) {
        const tools = this.getToolsForPlatform(platform);
        const descriptions = tools.map(tool => `- ${tool.name}: ${tool.description}`);
        return `Available tools for ${platform}:\n${descriptions.join('\n')}`;
    }
    /**
     * Check if a specific tool is available for a platform
     */
    static isToolAvailable(platform, toolName) {
        const tools = this.getToolsForPlatform(platform);
        return tools.some(tool => tool.name === toolName);
    }
    /**
     * Register a new tool for a platform
     */
    static registerTool(platform, tool) {
        const platformLower = platform.toLowerCase();
        if (!this.platformTools.has(platformLower)) {
            this.platformTools.set(platformLower, []);
        }
        const tools = this.platformTools.get(platformLower);
        if (!tools.some(t => t.name === tool.name)) {
            tools.push(tool);
        }
    }
}
