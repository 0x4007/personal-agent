import { TelegramFormatter } from "../../../src/platform/formatters/telegram-formatter";

describe("TelegramFormatter", () => {
  let formatter: TelegramFormatter;

  beforeEach(() => {
    formatter = new TelegramFormatter();
  });

  describe("format", () => {
    it("should escape special characters for MarkdownV2", () => {
      const text = "Hello _world_ with [special] chars: ()-~`>#+-.=|{}!";
      const result = formatter.format(text);
      // All special chars should be escaped with backslash
      expect(result).toContain("\\[");
      expect(result).toContain("\\]");
      expect(result).toContain("\\(");
      expect(result).toContain("\\)");
      expect(result).toContain("\\-");
      expect(result).toContain("\\~");
      expect(result).toContain("\\`");
      expect(result).toContain("\\>");
      expect(result).toContain("\\#");
      expect(result).toContain("\\+");
      expect(result).toContain("\\.");
      expect(result).toContain("\\=");
      expect(result).toContain("\\|");
      expect(result).toContain("\\{");
      expect(result).toContain("\\}");
      expect(result).toContain("\\!");
      expect(result).toContain("\\_");
    });

    it("should escape backslashes first to avoid double-escaping", () => {
      const text = "Path: C:\\Users\\file.txt";
      const result = formatter.format(text);
      // Backslashes should be doubled
      expect(result).toBe("Path: C:\\\\Users\\\\file\\.txt");
    });
  });

  describe("formatCode", () => {
    it("should format code block with language", () => {
      const code = "const x = `test`;";
      const result = formatter.formatCode(code, "javascript");
      expect(result).toBe("```javascript\nconst x = \\`test\\`;\n```");
    });

    it("should escape backticks in code", () => {
      const code = "Use `backticks` here";
      const result = formatter.formatCode(code);
      expect(result).toContain("\\`backticks\\`");
    });

    it("should escape backslashes in code", () => {
      const code = "Path: C:\\file.txt";
      const result = formatter.formatCode(code);
      expect(result).toContain("C:\\\\file.txt");
    });
  });

  describe("formatError", () => {
    it("should format error with escaped markdown", () => {
      const error = "Error: File_not_found.txt";
      const result = formatter.formatError(error);
      expect(result).toBe("❌ *Error*: Error: File\\_not\\_found\\.txt");
    });
  });

  describe("formatList", () => {
    it("should format list with bullets and escape content", () => {
      const items = ["First_item", "Second-item", "Third.item"];
      const result = formatter.formatList(items);
      expect(result).toContain("• First\\_item");
      expect(result).toContain("• Second\\-item");
      expect(result).toContain("• Third\\.item");
    });
  });

  describe("truncate", () => {
    it("should not truncate text under 4096 chars", () => {
      const text = "Short message";
      expect(formatter.truncate(text)).toBe(text);
    });

    it("should truncate text over 4096 chars", () => {
      const text = "a".repeat(5000);
      const result = formatter.truncate(text);
      expect(result.length).toBeLessThanOrEqual(4096);
      expect(result).toContain("\\.\\.\\. \\(truncated\\)");
    });

    it("should leave room for truncation message", () => {
      const text = "a".repeat(5000);
      const result = formatter.truncate(text);
      const mainContent = result.substring(0, result.indexOf("\n"));
      expect(mainContent.length).toBeLessThanOrEqual(4076); // 4096 - 20 for truncation message
    });
  });
});
