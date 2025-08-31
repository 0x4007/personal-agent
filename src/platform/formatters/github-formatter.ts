import { ResponseFormatter } from "./response-formatter";

export class GitHubFormatter implements ResponseFormatter {
  format(text: string): string {
    // GitHub supports full markdown, no transformation needed
    return text;
  }

  formatCode(code: string, language = ""): string {
    return `\`\`\`${language}\n${code}\n\`\`\``;
  }

  formatError(error: string): string {
    return `❌ **Error**: ${error}`;
  }

  formatList(items: string[]): string {
    return items.map((item) => `- ${item}`).join("\n");
  }

  truncate(text: string): string {
    // GitHub has a high limit (65536 chars), usually no truncation needed
    const maxLength = 65536;
    if (text.length > maxLength) {
      return text.substring(0, maxLength - 100) + "\n\n... (truncated)";
    }
    return text;
  }
}
