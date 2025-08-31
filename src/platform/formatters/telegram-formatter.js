export class TelegramFormatter {
    format(text) {
        // Convert to Telegram MarkdownV2 format
        // Escape special characters for MarkdownV2
        return this.escapeMarkdownV2(text);
    }
    formatCode(code, language = '') {
        // Telegram supports code blocks with language specification
        const escapedCode = this.escapeCodeBlock(code);
        return `\`\`\`${language}\n${escapedCode}\n\`\`\``;
    }
    formatError(error) {
        const escapedError = this.escapeMarkdownV2(error);
        return `❌ *Error*: ${escapedError}`;
    }
    formatList(items) {
        return items.map(item => `• ${this.escapeMarkdownV2(item)}`).join('\n');
    }
    truncate(text) {
        const maxLength = 4096;
        const truncationMessage = '\n\\.\\.\\. \\(truncated\\)';
        if (text.length > maxLength) {
            return text.substring(0, maxLength - truncationMessage.length) + truncationMessage;
        }
        return text;
    }
    escapeMarkdownV2(text) {
        // Escape special characters for MarkdownV2
        // Order matters: escape backslash first to avoid double-escaping
        return text
            .replace(/\\/g, '\\\\')
            .replace(/([_*\[\]()~`>#+\-=|{}.!])/g, '\\$1');
    }
    escapeCodeBlock(code) {
        // Inside code blocks, only backticks and backslashes need escaping
        return code
            .replace(/\\/g, '\\\\')
            .replace(/`/g, '\\`');
    }
}
