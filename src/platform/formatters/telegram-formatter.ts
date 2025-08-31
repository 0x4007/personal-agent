import { ResponseFormatter } from "./response-formatter";

export class TelegramFormatter implements ResponseFormatter {
  format(text: string): string {
    // Convert to Telegram MarkdownV2 format
    // Escape special characters for MarkdownV2
    return this.escapeMarkdownV2(text);
  }

  formatCode(code: string, language = ""): string {
    // Telegram supports code blocks with language specification
    const escapedCode = this.escapeCodeBlock(code);
    return `\`\`\`${language}\n${escapedCode}\n\`\`\``;
  }

  formatError(error: string): string {
    const escapedError = this.escapeMarkdownV2(error);
    return `❌ *Error*: ${escapedError}`;
  }

  formatList(items: string[]): string {
    return items.map((item) => `• ${this.escapeMarkdownV2(item)}`).join("\n");
  }

  truncate(text: string): string {
    const maxLength = 4096;
    const truncationMessage = "\n\\.\\.\\. \\(truncated\\)";
    if (text.length > maxLength) {
      return text.substring(0, maxLength - truncationMessage.length) + truncationMessage;
    }
    return text;
  }

  private escapeMarkdownV2(text: string): string {
    // Escape special characters for MarkdownV2
    // Order matters: escape backslash first to avoid double-escaping
    return text.replace(/\\/g, "\\\\").replace(/([_*\[\]()~`>#+\-=|{}.!])/g, "\\$1");
  }

  private escapeCodeBlock(code: string): string {
    // Inside code blocks, only backticks and backslashes need escaping
    return code.replace(/\\/g, "\\\\").replace(/`/g, "\\`");
  }
}
