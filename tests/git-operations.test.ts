import { jest } from "@jest/globals";
import { executeGitCommands, sanitizeCommand, isGitCommand, filterSafeCommands } from "../src/handlers/git-operations";

describe("git-operations", () => {
  const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    verbose: jest.fn(),
    ok: jest.fn(),
    warn: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("sanitizeCommand", () => {
    it("should remove dangerous shell metacharacters", () => {
      expect(sanitizeCommand("git commit -m 'test'; rm -rf /")).toBe("git commit -m 'test' rm -rf /");
      expect(sanitizeCommand("echo test && echo test2")).toBe("echo test  echo test2");
      expect(sanitizeCommand("cat /etc/passwd | grep root")).toBe("cat /etc/passwd  grep root");
    });

    it("should remove directory traversal attempts", () => {
      expect(sanitizeCommand("cd ../../../etc")).toBe("cd ///etc");
      expect(sanitizeCommand("cat ../sensitive.txt")).toBe("cat /sensitive.txt");
    });

    it("should preserve safe commands", () => {
      expect(sanitizeCommand("git status")).toBe("git status");
      expect(sanitizeCommand("gh pr create --title 'Test PR'")).toBe("gh pr create --title 'Test PR'");
    });
  });

  describe("isGitCommand", () => {
    it("should identify git commands", () => {
      expect(isGitCommand("git status")).toBe(true);
      expect(isGitCommand("git commit -m 'test'")).toBe(true);
      expect(isGitCommand("gh pr create")).toBe(true);
      expect(isGitCommand("gh issue list")).toBe(true);
    });

    it("should reject non-git commands", () => {
      expect(isGitCommand("rm -rf /")).toBe(false);
      expect(isGitCommand("curl http://example.com")).toBe(false);
      expect(isGitCommand("echo test")).toBe(false);
    });
  });

  describe("filterSafeCommands", () => {
    it("should allow safe git commands", () => {
      const commands = ["git status", "git branch -a", "git commit -m 'test'", "git push origin main"];

      const filtered = filterSafeCommands(commands);
      expect(filtered).toEqual(commands);
    });

    it("should allow safe gh commands", () => {
      const commands = ["gh pr create --title 'Test'", "gh issue list", "gh repo view", "gh auth status"];

      const filtered = filterSafeCommands(commands);
      expect(filtered).toEqual(commands);
    });

    it("should filter out dangerous commands", () => {
      const commands = ["git status", "rm -rf /", "curl http://malicious.com", "gh pr create", "eval 'dangerous code'"];

      const filtered = filterSafeCommands(commands);
      expect(filtered).toEqual(["git status", "gh pr create"]);
    });
  });

  describe("executeGitCommands", () => {
    it("should skip execution in read-only mode", () => {
      const result = executeGitCommands(
        ["git status", "git commit -m 'test'"],
        mockLogger,
        true // isReadOnly
      );

      expect(result.results).toEqual([]);
      expect(result.summary).toContain("Read-only access");
      expect(mockLogger.info).toHaveBeenCalledWith("Read-only mode: Skipping all git operations");
    });

    // Skip complex mocking test in ESM
    it.skip("should format successful command output", () => {
      // This test would require complex mocking of execSync
      // Skipping for now as the functionality is tested in integration
    });
  });
});
