export interface ParsedCommand {
  type: "bash" | "shell" | "text";
  content: string;
  language?: string;
}

export function extractBashCommands(claudeResponse: string): string[] {
  // Extract all bash/shell code blocks from Claude's response
  const codeBlockRegex = /```(?:(bash|sh|shell|zsh)?\n)?([\s\S]*?)```/g;
  const commands: string[] = [];
  let match;

  console.log("=== PARSER DEBUG ===");
  console.log("Input length:", claudeResponse.length);
  console.log("Looking for code blocks...");

  while ((match = codeBlockRegex.exec(claudeResponse)) !== null) {
    const language = match[1]?.toLowerCase();
    const content = match[2];

    console.log(`Found code block with language: ${language || "[none]"}`);
    console.log(`Content: ${content.substring(0, 100)}...`);

    // Only process bash/shell blocks or unlabeled blocks that look like commands
    if (language === "bash" || language === "sh" || language === "shell" || language === "zsh" || (!language && looksLikeCommand(content))) {
      // Split by newlines and process each line
      const blockCommands = content
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => {
          // Filter out empty lines and comments
          return line.length > 0 && !line.startsWith("#");
        });

      commands.push(...blockCommands);
    }
  }

  return commands;
}

function looksLikeCommand(content: string): boolean {
  // Check if content looks like shell commands
  const commandPatterns = [
    /^git\s+/m,
    /^gh\s+/m,
    /^echo\s+/m,
    /^cd\s+/m,
    /^ls\s+/m,
    /^pwd$/m,
    /^mkdir\s+/m,
    /^touch\s+/m,
    /^cat\s+/m,
    /^npm\s+/m,
    /^yarn\s+/m,
    /^bun\s+/m,
  ];

  return commandPatterns.some((pattern) => pattern.test(content));
}

export function parseClaudeResponse(response: string): ParsedCommand[] {
  const parsed: ParsedCommand[] = [];

  // Extract code blocks with their languages
  const codeBlockRegex = /```(?:([a-z]+)?\n)?([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(response)) !== null) {
    // Add any text before this code block
    if (match.index > lastIndex) {
      const textContent = response.substring(lastIndex, match.index).trim();
      if (textContent) {
        parsed.push({
          type: "text",
          content: textContent,
        });
      }
    }

    const language = match[1]?.toLowerCase() || "";
    const content = match[2];

    if (["bash", "sh", "shell", "zsh"].includes(language) || (!language && looksLikeCommand(content))) {
      parsed.push({
        type: "bash",
        content: content,
        language: language || "bash",
      });
    } else {
      parsed.push({
        type: "text",
        content: `\`\`\`${language}\n${content}\`\`\``,
      });
    }

    lastIndex = match.index + match[0].length;
  }

  // Add any remaining text after the last code block
  if (lastIndex < response.length) {
    const textContent = response.substring(lastIndex).trim();
    if (textContent) {
      parsed.push({
        type: "text",
        content: textContent,
      });
    }
  }

  return parsed;
}

export function reconstructResponse(
  parsedCommands: ParsedCommand[],
  executionResults: Map<string, { success: boolean; output?: string; error?: string }>
): string {
  const sections: string[] = [];

  for (const parsed of parsedCommands) {
    if (parsed.type === "text") {
      sections.push(parsed.content);
    } else if (parsed.type === "bash") {
      // Get execution results for these commands
      const commands = parsed.content
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0 && !line.startsWith("#"));

      const commandResults = commands.map((cmd) => {
        const result = executionResults.get(cmd);
        if (!result) return `\`${cmd}\` (not executed)`;

        if (result.success) {
          const output = result.output?.trim() ? `\n\`\`\`\n${result.output}\n\`\`\`` : "";
          return `✅ \`${cmd}\`${output}`;
        } else {
          return `❌ \`${cmd}\`\n> Error: ${result.error}`;
        }
      });

      if (commandResults.length > 0) {
        sections.push("**Executed Commands:**\n" + commandResults.join("\n"));
      }
    }
  }

  return sections.join("\n\n");
}
