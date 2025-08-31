import { describe, expect, it, beforeEach, afterEach } from "@jest/globals";
import { AccessMode, getAccessMode, getPlatformPat, validatePlatformCredentials, getAccessControlConfig } from "../../src/security/access-control";

describe("Access Control", () => {
  // Store original environment
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Reset environment before each test
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original environment after each test
    process.env = originalEnv;
  });

  describe("getAccessMode", () => {
    it("should return READ_ONLY when explicitly set", () => {
      process.env.ACCESS_MODE = "read-only";
      process.env.PERSONAL_ACCESS_TOKEN = "some-token";

      expect(getAccessMode()).toBe(AccessMode.READ_ONLY);
    });

    it("should return FULL when PERSONAL_ACCESS_TOKEN is present and not read-only", () => {
      delete process.env.ACCESS_MODE;
      process.env.PERSONAL_ACCESS_TOKEN = "some-token";

      expect(getAccessMode()).toBe(AccessMode.FULL);
    });


    it("should return READ_ONLY when no PAT is present", () => {
      delete process.env.ACCESS_MODE;
      delete process.env.PERSONAL_ACCESS_TOKEN;

      expect(getAccessMode()).toBe(AccessMode.READ_ONLY);
    });
  });

  describe("getPlatformPat", () => {
    it("should return PERSONAL_ACCESS_TOKEN for github platform", () => {
      process.env.PERSONAL_ACCESS_TOKEN = "github-specific-token";

      expect(getPlatformPat("github")).toBe("github-specific-token");
    });

    it("should return undefined when PERSONAL_ACCESS_TOKEN not present", () => {
      delete process.env.PERSONAL_ACCESS_TOKEN;

      expect(getPlatformPat("github")).toBeUndefined();
    });

    it("should return TELEGRAM_BOT_TOKEN for telegram platform", () => {
      process.env.TELEGRAM_BOT_TOKEN = "telegram-token";

      expect(getPlatformPat("telegram")).toBe("telegram-token");
    });

    it("should return undefined for unknown platform", () => {
      expect(getPlatformPat("unknown")).toBeUndefined();
    });
  });

  describe("validatePlatformCredentials", () => {
    it("should return true when credentials exist", () => {
      process.env.PERSONAL_ACCESS_TOKEN = "token";

      expect(validatePlatformCredentials("github")).toBe(true);
    });

    it("should return false when credentials are missing", () => {
      delete process.env.PERSONAL_ACCESS_TOKEN;

      expect(validatePlatformCredentials("github")).toBe(false);
    });

    it("should validate telegram credentials", () => {
      process.env.TELEGRAM_BOT_TOKEN = "bot-token";

      expect(validatePlatformCredentials("telegram")).toBe(true);
    });

    it("should return false for unknown platform", () => {
      expect(validatePlatformCredentials("unknown")).toBe(false);
    });
  });

  describe("getAccessControlConfig", () => {
    it("should return full config for github with full access", () => {
      process.env.PERSONAL_ACCESS_TOKEN = "github-token";
      delete process.env.ACCESS_MODE;

      const config = getAccessControlConfig("github");

      expect(config.platform).toBe("github");
      expect(config.mode).toBe(AccessMode.FULL);
      expect(config.pat).toBe("github-token");
    });

    it("should return read-only config when set", () => {
      process.env.PERSONAL_ACCESS_TOKEN = "github-token";
      process.env.ACCESS_MODE = "read-only";

      const config = getAccessControlConfig("github");

      expect(config.platform).toBe("github");
      expect(config.mode).toBe(AccessMode.READ_ONLY);
      expect(config.pat).toBe("github-token");
    });

    it("should return config for telegram", () => {
      process.env.TELEGRAM_BOT_TOKEN = "telegram-token";

      const config = getAccessControlConfig("telegram");

      expect(config.platform).toBe("telegram");
      expect(config.mode).toBe(AccessMode.READ_ONLY); // No PAT, defaults to read-only
      expect(config.pat).toBe("telegram-token");
    });

    it("should handle missing credentials", () => {
      delete process.env.PERSONAL_ACCESS_TOKEN;

      const config = getAccessControlConfig("github");

      expect(config.platform).toBe("github");
      expect(config.mode).toBe(AccessMode.READ_ONLY);
      expect(config.pat).toBeUndefined();
    });
  });
});
