import { CredentialManager } from "../../src/platform/credential-manager";

describe("CredentialManager", () => {
  describe("credential management", () => {
    it("should load GitHub credentials from GITHUB_PAT", () => {
      const env = {
        GITHUB_PAT: "github-token-123",
      };
      const manager = new CredentialManager(env);
      
      expect(manager.hasCredential("github")).toBe(true);
      expect(manager.getCredential("github")).toBe("github-token-123");
    });

    it("should fallback to USER_PAT for GitHub if GITHUB_PAT not present", () => {
      const env = {
        USER_PAT: "user-pat-123",
      };
      const manager = new CredentialManager(env);
      
      expect(manager.hasCredential("github")).toBe(true);
      expect(manager.getCredential("github")).toBe("user-pat-123");
    });

    it("should prefer GITHUB_PAT over USER_PAT", () => {
      const env = {
        GITHUB_PAT: "github-token-123",
        USER_PAT: "user-pat-123",
      };
      const manager = new CredentialManager(env);
      
      expect(manager.getCredential("github")).toBe("github-token-123");
    });

    it("should load Telegram credentials", () => {
      const env = {
        TELEGRAM_BOT_TOKEN: "telegram-token-123",
      };
      const manager = new CredentialManager(env);
      
      expect(manager.hasCredential("telegram")).toBe(true);
      expect(manager.getCredential("telegram")).toBe("telegram-token-123");
    });

    it("should handle missing credentials", () => {
      const env = {};
      const manager = new CredentialManager(env);
      
      expect(manager.hasCredential("github")).toBe(false);
      expect(manager.getCredential("github")).toBeUndefined();
    });

    it("should handle empty credential strings", () => {
      const env = {
        GITHUB_PAT: "",
      };
      const manager = new CredentialManager(env);
      
      expect(manager.hasCredential("github")).toBe(false);
    });
  });

  describe("getAvailablePlatforms", () => {
    it("should return only platforms with valid credentials", () => {
      const env = {
        GITHUB_PAT: "github-token",
        TELEGRAM_BOT_TOKEN: "telegram-token",
      };
      const manager = new CredentialManager(env);
      
      const available = manager.getAvailablePlatforms();
      expect(available).toContain("github");
      expect(available).toContain("telegram");
    });

    it("should return empty array when no credentials are available", () => {
      const env = {};
      const manager = new CredentialManager(env);
      
      const available = manager.getAvailablePlatforms();
      expect(available).toEqual([]);
    });
  });

  describe("getAuthenticationStatus", () => {
    it("should return authentication status for all platforms", () => {
      const env = {
        GITHUB_PAT: "github-token",
        TELEGRAM_BOT_TOKEN: "telegram-token",
      };
      const manager = new CredentialManager(env);
      
      const status = manager.getAuthenticationStatus();
      expect(status.github).toBe(true);
      expect(status.telegram).toBe(true);
    });
  });

  describe("validatePlatformCredentials", () => {
    it("should validate present credentials", () => {
      const env = {
        GITHUB_PAT: "github-token",
      };
      const manager = new CredentialManager(env);
      
      const result = manager.validatePlatformCredentials("github");
      expect(result.valid).toBe(true);
      expect(result.message).toBeUndefined();
    });

    it("should provide error message for missing credentials", () => {
      const env = {};
      const manager = new CredentialManager(env);
      
      const result = manager.validatePlatformCredentials("github");
      expect(result.valid).toBe(false);
      expect(result.message).toContain("GITHUB_PAT");
    });

    it("should provide correct env var name in error message", () => {
      const env = {};
      const manager = new CredentialManager(env);
      
      const telegramResult = manager.validatePlatformCredentials("telegram");
      expect(telegramResult.message).toContain("TELEGRAM_BOT_TOKEN");
    });
  });
});