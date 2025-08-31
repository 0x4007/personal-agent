import { PlatformRegistry } from "../../src/platform/platform-registry";
import { GitHubFormatter } from "../../src/platform/formatters/github-formatter";
import { TelegramFormatter } from "../../src/platform/formatters/telegram-formatter";

describe("PlatformRegistry", () => {
  describe("getPlatform", () => {
    it("should return GitHub platform config", () => {
      const platform = PlatformRegistry.getPlatform("github");
      expect(platform).toBeDefined();
      expect(platform?.name).toBe("GitHub");
      expect(platform?.credentialEnvVar).toBe("GITHUB_PAT");
      expect(platform?.tools).toContain("gh");
      expect(platform?.tools).toContain("git");
    });

    it("should return Telegram platform config", () => {
      const platform = PlatformRegistry.getPlatform("telegram");
      expect(platform).toBeDefined();
      expect(platform?.name).toBe("Telegram");
      expect(platform?.credentialEnvVar).toBe("TELEGRAM_BOT_TOKEN");
      expect(platform?.tools).toContain("telegram-mcp");
    });

    it("should handle case-insensitive platform names", () => {
      const platform = PlatformRegistry.getPlatform("GITHUB");
      expect(platform).toBeDefined();
      expect(platform?.name).toBe("GitHub");
    });

    it("should return undefined for unknown platform", () => {
      const platform = PlatformRegistry.getPlatform("unknown");
      expect(platform).toBeUndefined();
    });
  });

  describe("getFormatter", () => {
    it("should return GitHub formatter for GitHub platform", () => {
      const formatter = PlatformRegistry.getFormatter("github");
      expect(formatter).toBeInstanceOf(GitHubFormatter);
    });

    it("should return Telegram formatter for Telegram platform", () => {
      const formatter = PlatformRegistry.getFormatter("telegram");
      expect(formatter).toBeInstanceOf(TelegramFormatter);
    });

    it("should return GitHub formatter as default for unknown platform", () => {
      const formatter = PlatformRegistry.getFormatter("unknown");
      expect(formatter).toBeInstanceOf(GitHubFormatter);
    });
  });

  describe("getTools", () => {
    it("should return GitHub tools", () => {
      const tools = PlatformRegistry.getTools("github");
      expect(tools).toEqual(["gh", "git", "shell"]);
    });

    it("should return Telegram tools", () => {
      const tools = PlatformRegistry.getTools("telegram");
      expect(tools).toEqual(["telegram-mcp", "shell"]);
    });

    it("should return default tools for unknown platform", () => {
      const tools = PlatformRegistry.getTools("unknown");
      expect(tools).toEqual(["shell"]);
    });
  });

  describe("getCredentialEnvVar", () => {
    it("should return GITHUB_PAT for GitHub", () => {
      const envVar = PlatformRegistry.getCredentialEnvVar("github");
      expect(envVar).toBe("GITHUB_PAT");
    });

    it("should return TELEGRAM_BOT_TOKEN for Telegram", () => {
      const envVar = PlatformRegistry.getCredentialEnvVar("telegram");
      expect(envVar).toBe("TELEGRAM_BOT_TOKEN");
    });

    it("should return undefined for unknown platform", () => {
      const envVar = PlatformRegistry.getCredentialEnvVar("unknown");
      expect(envVar).toBeUndefined();
    });
  });

  describe("getFeatures", () => {
    it("should return GitHub features", () => {
      const features = PlatformRegistry.getFeatures("github");
      expect(features).toBeDefined();
      expect(features?.supportsMarkdown).toBe(true);
      expect(features?.supportsCodeBlocks).toBe(true);
      expect(features?.supportsInlineImages).toBe(true);
      expect(features?.maxMessageLength).toBe(65536);
    });

    it("should return Telegram features", () => {
      const features = PlatformRegistry.getFeatures("telegram");
      expect(features).toBeDefined();
      expect(features?.supportsMarkdown).toBe(true);
      expect(features?.supportsCodeBlocks).toBe(true);
      expect(features?.supportsInlineImages).toBe(false);
      expect(features?.maxMessageLength).toBe(4096);
    });
  });

  describe("getAllPlatforms", () => {
    it("should return all registered platforms", () => {
      const platforms = PlatformRegistry.getAllPlatforms();
      expect(platforms).toContain("github");
      expect(platforms).toContain("telegram");
      expect(platforms).toContain("discord");
      expect(platforms).toContain("slack");
    });
  });
});