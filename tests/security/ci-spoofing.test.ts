import { describe, expect, it, beforeEach, afterEach } from "@jest/globals";
import { spoofCIEnvironment, verifyCISpoofing, preserveOriginalCIEnvironment, getOriginalCIEnvironment } from "../../src/security/ci-spoofing";

describe("CI Spoofing", () => {
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

  describe("spoofCIEnvironment", () => {
    it("should set CI environment variables to false", () => {
      // Set up CI environment
      process.env.GITHUB_ACTIONS = "true";
      process.env.CI = "true";

      // Apply spoofing
      spoofCIEnvironment();

      expect(process.env.GITHUB_ACTIONS).toBe("false");
      expect(process.env.CI).toBe("false");
      expect(process.env.CONTINUOUS_INTEGRATION).toBe("false");
      expect(process.env.TRAVIS).toBe("false");
      expect(process.env.CIRCLECI).toBe("false");
    });

    it("should override existing CI values", () => {
      process.env.GITHUB_ACTIONS = "true";
      process.env.CI = "true";
      process.env.TRAVIS = "true";

      spoofCIEnvironment();

      expect(process.env.GITHUB_ACTIONS).toBe("false");
      expect(process.env.CI).toBe("false");
      expect(process.env.TRAVIS).toBe("false");
    });
  });

  describe("verifyCISpoofing", () => {
    it("should return true when spoofing is active", () => {
      process.env.GITHUB_ACTIONS = "false";
      process.env.CI = "false";

      expect(verifyCISpoofing()).toBe(true);
    });

    it("should return false when GITHUB_ACTIONS is not spoofed", () => {
      process.env.GITHUB_ACTIONS = "true";
      process.env.CI = "false";

      expect(verifyCISpoofing()).toBe(false);
    });

    it("should return false when CI is not spoofed", () => {
      process.env.GITHUB_ACTIONS = "false";
      process.env.CI = "true";

      expect(verifyCISpoofing()).toBe(false);
    });

    it("should return false when neither is spoofed", () => {
      process.env.GITHUB_ACTIONS = "true";
      process.env.CI = "true";

      expect(verifyCISpoofing()).toBe(false);
    });
  });

  describe("preserveOriginalCIEnvironment", () => {
    it("should store original CI values", () => {
      process.env.GITHUB_ACTIONS = "true";
      process.env.CI = "true";

      preserveOriginalCIEnvironment();

      expect(process.env.ORIGINAL_GITHUB_ACTIONS).toBe("true");
      expect(process.env.ORIGINAL_CI).toBe("true");
    });

    it("should handle undefined values", () => {
      delete process.env.GITHUB_ACTIONS;
      delete process.env.CI;

      preserveOriginalCIEnvironment();

      expect(process.env.ORIGINAL_GITHUB_ACTIONS).toBeUndefined();
      expect(process.env.ORIGINAL_CI).toBeUndefined();
    });
  });

  describe("getOriginalCIEnvironment", () => {
    it("should return stored original values", () => {
      process.env.ORIGINAL_GITHUB_ACTIONS = "true";
      process.env.ORIGINAL_CI = "true";

      const original = getOriginalCIEnvironment();

      expect(original.GITHUB_ACTIONS).toBe("true");
      expect(original.CI).toBe("true");
    });

    it("should return undefined when no original values stored", () => {
      delete process.env.ORIGINAL_GITHUB_ACTIONS;
      delete process.env.ORIGINAL_CI;

      const original = getOriginalCIEnvironment();

      expect(original.GITHUB_ACTIONS).toBeUndefined();
      expect(original.CI).toBeUndefined();
    });
  });

  describe("Full workflow", () => {
    it("should preserve, spoof, and verify CI environment", () => {
      // Start with CI environment
      process.env.GITHUB_ACTIONS = "true";
      process.env.CI = "true";

      // Preserve original
      preserveOriginalCIEnvironment();

      // Apply spoofing
      spoofCIEnvironment();

      // Verify spoofing is active
      expect(verifyCISpoofing()).toBe(true);

      // Check we can still access original values
      const original = getOriginalCIEnvironment();
      expect(original.GITHUB_ACTIONS).toBe("true");
      expect(original.CI).toBe("true");

      // Current values should be spoofed
      expect(process.env.GITHUB_ACTIONS).toBe("false");
      expect(process.env.CI).toBe("false");
    });
  });
});
