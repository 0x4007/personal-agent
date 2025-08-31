import { ToolRegistry } from "../../src/platform/tool-registry";

describe("ToolRegistry", () => {
  describe("getToolsForPlatform", () => {
    it("should return GitHub tools including common tools", () => {
      const tools = ToolRegistry.getToolsForPlatform("github");
      const toolNames = tools.map((t) => t.name);

      expect(toolNames).toContain("shell");
      expect(toolNames).toContain("file");
      expect(toolNames).toContain("gh");
      expect(toolNames).toContain("git");
    });

    it("should return Telegram tools including common tools", () => {
      const tools = ToolRegistry.getToolsForPlatform("telegram");
      const toolNames = tools.map((t) => t.name);

      expect(toolNames).toContain("shell");
      expect(toolNames).toContain("file");
      expect(toolNames).toContain("telegram-mcp");
    });

    it("should return only common tools for unknown platform", () => {
      const tools = ToolRegistry.getToolsForPlatform("unknown");
      const toolNames = tools.map((t) => t.name);

      expect(toolNames).toEqual(["shell", "file"]);
    });

    it("should handle case-insensitive platform names", () => {
      const tools = ToolRegistry.getToolsForPlatform("GITHUB");
      const toolNames = tools.map((t) => t.name);

      expect(toolNames).toContain("gh");
    });
  });

  describe("getToolNamesForPlatform", () => {
    it("should return tool names as strings", () => {
      const names = ToolRegistry.getToolNamesForPlatform("github");

      expect(names).toEqual(["shell", "file", "gh", "git"]);
      expect(names.every((n) => typeof n === "string")).toBe(true);
    });
  });

  describe("generateToolDescription", () => {
    it("should generate formatted tool description for GitHub", () => {
      const description = ToolRegistry.generateToolDescription("github");

      expect(description).toContain("Available tools for github:");
      expect(description).toContain("- shell: Execute shell commands");
      expect(description).toContain("- gh: GitHub CLI for repository operations");
      expect(description).toContain("- git: Git version control operations");
    });

    it("should generate formatted tool description for Telegram", () => {
      const description = ToolRegistry.generateToolDescription("telegram");

      expect(description).toContain("Available tools for telegram:");
      expect(description).toContain("- telegram-mcp: Telegram Bot API operations via MCP");
    });
  });

  describe("isToolAvailable", () => {
    it("should return true for available GitHub tools", () => {
      expect(ToolRegistry.isToolAvailable("github", "gh")).toBe(true);
      expect(ToolRegistry.isToolAvailable("github", "git")).toBe(true);
      expect(ToolRegistry.isToolAvailable("github", "shell")).toBe(true);
    });

    it("should return false for unavailable tools", () => {
      expect(ToolRegistry.isToolAvailable("github", "telegram-mcp")).toBe(false);
      expect(ToolRegistry.isToolAvailable("telegram", "gh")).toBe(false);
    });

    it("should return true for common tools on any platform", () => {
      expect(ToolRegistry.isToolAvailable("github", "shell")).toBe(true);
      expect(ToolRegistry.isToolAvailable("telegram", "shell")).toBe(true);
      expect(ToolRegistry.isToolAvailable("unknown", "shell")).toBe(true);
    });
  });

  describe("registerTool", () => {
    it("should register new tool for platform", () => {
      const newTool = {
        name: "custom-tool",
        description: "Custom tool for testing",
        platformSpecific: true,
      };

      ToolRegistry.registerTool("github", newTool);

      expect(ToolRegistry.isToolAvailable("github", "custom-tool")).toBe(true);
      const tools = ToolRegistry.getToolsForPlatform("github");
      expect(tools.some((t) => t.name === "custom-tool")).toBe(true);
    });

    it("should not duplicate tools when registering same tool twice", () => {
      const newTool = {
        name: "duplicate-tool",
        description: "Tool that might be registered twice",
        platformSpecific: true,
      };

      ToolRegistry.registerTool("newplatform", newTool);
      ToolRegistry.registerTool("newplatform", newTool);

      const tools = ToolRegistry.getToolsForPlatform("newplatform");
      const duplicateTools = tools.filter((t) => t.name === "duplicate-tool");
      expect(duplicateTools.length).toBe(1);
    });

    it("should handle case-insensitive platform names when registering", () => {
      const newTool = {
        name: "case-test-tool",
        description: "Tool for case testing",
        platformSpecific: true,
      };

      ToolRegistry.registerTool("TESTPLATFORM", newTool);

      expect(ToolRegistry.isToolAvailable("testplatform", "case-test-tool")).toBe(true);
    });
  });
});
