export class GitHubFormatter {
    format(text) {
        // GitHub supports full markdown, no transformation needed
        return text;
    }
    formatCode(code, language = '') {
        return `\`\`\`${language}\n${code}\n\`\`\``;
    }
    formatError(error) {
        return `❌ **Error**: ${error}`;
    }
    formatList(items) {
        return items.map(item => `- ${item}`).join('\n');
    }
    truncate(text) {
        // GitHub has a high limit (65536 chars), usually no truncation needed
        const maxLength = 65536;
        if (text.length > maxLength) {
            return text.substring(0, maxLength - 100) + '\n\n... (truncated)';
        }
        return text;
    }
}
