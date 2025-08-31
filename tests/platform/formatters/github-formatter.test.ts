import { GitHubFormatter } from "../../../src/platform/formatters/github-formatter";

describe("GitHubFormatter", () => {
  let formatter: GitHubFormatter;

  beforeEach(() => {
    formatter = new GitHubFormatter();
  });

  describe("format", () => {
    it("should return text unchanged (GitHub supports full markdown)", () => {
      const text = "**Bold** _italic_ [link](https://example.com)";
      expect(formatter.format(text)).toBe(text);
    });
  });

  describe("formatCode", () => {
    it("should format code with language", () => {
      const code = "const x = 42;";
      const result = formatter.formatCode(code, "javascript");
      expect(result).toBe("```javascript\nconst x = 42;\n```");
    });

    it("should format code without language", () => {
      const code = "some code";
      const result = formatter.formatCode(code);
      expect(result).toBe("```\nsome code\n```");
    });
  });

  describe("formatError", () => {
    it("should format error with emoji and bold", () => {
      const error = "Something went wrong";
      const result = formatter.formatError(error);
      expect(result).toBe("❌ **Error**: Something went wrong");
    });
  });

  describe("formatList", () => {
    it("should format list with dashes", () => {
      const items = ["First item", "Second item", "Third item"];
      const result = formatter.formatList(items);
      expect(result).toBe("- First item\n- Second item\n- Third item");
    });

    it("should handle empty list", () => {
      const result = formatter.formatList([]);
      expect(result).toBe("");
    });
  });

  describe("truncate", () => {
    it("should not truncate text under limit", () => {
      const text = "Short text";
      expect(formatter.truncate(text)).toBe(text);
    });

    it("should truncate very long text", () => {
      const text = "a".repeat(70000);
      const result = formatter.truncate(text);
      expect(result.length).toBeLessThanOrEqual(65536);
      expect(result).toContain("... (truncated)");
    });
  });
});
