import { execSync } from "child_process";

export interface CommandResult {
  cmd: string;
  success: boolean;
  output?: string;
  error?: string;
}

export interface ExecutionSummary {
  results: CommandResult[];
  summary: string;
}

export function executeGitCommands(
  commands: string[],
  logger: { info: (msg: string) => void; error: (msg: string) => void },
  isReadOnly: boolean
): ExecutionSummary {
  const results: CommandResult[] = [];

  if (isReadOnly) {
    logger.info("Read-only mode: Skipping all git operations");
    return {
      results: [],
      summary: "⚠️ Read-only access: Cannot execute git operations. Please contact the repository owner to perform write operations.",
    };
  }

  for (const cmd of commands) {
    logger.info(`Executing: ${cmd}`);

    try {
      // eslint-disable-next-line sonarjs/os-command
      const output = execSync(cmd, {
        encoding: "utf8",
        cwd: process.cwd(),
        maxBuffer: 1024 * 1024 * 10, // 10MB buffer
        env: {
          ...process.env,
          // Ensure gh CLI uses the correct token
          GITHUB_TOKEN: process.env.USER_PAT || process.env.GITHUB_TOKEN,
          GH_TOKEN: process.env.USER_PAT || process.env.GH_TOKEN,
        },
      });

      results.push({
        cmd,
        success: true,
        output: output.substring(0, 1000), // Limit output size for comment
      });

      logger.info(`✅ Command succeeded: ${cmd}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      results.push({
        cmd,
        success: false,
        error: errorMessage.substring(0, 500), // Limit error message size
      });

      logger.error(`❌ Command failed: ${cmd} - ${errorMessage}`);
    }
  }

  // Create formatted summary for GitHub comment
  const summary = formatExecutionSummary(results);

  return { results, summary };
}

function formatExecutionSummary(results: CommandResult[]): string {
  if (results.length === 0) {
    return "No commands were executed.";
  }

  const sections = results.map((r) => {
    if (r.success) {
      const outputSection = r.output && r.output.trim() ? `\n\`\`\`\n${r.output}\n\`\`\`` : "";
      return `✅ \`${r.cmd}\`${outputSection}`;
    } else {
      return `❌ \`${r.cmd}\`\n> Error: ${r.error}`;
    }
  });

  return sections.join("\n\n");
}

export function sanitizeCommand(cmd: string): string {
  // Basic command sanitization to prevent shell injection
  // Remove dangerous characters and patterns
  return cmd
    .replace(/[;&|<>$`\\]/g, "") // Remove shell metacharacters
    .replace(/\.\./g, "") // Remove directory traversal
    .trim();
}

export function isGitCommand(cmd: string): boolean {
  // Check if command is a git or gh operation
  const gitCommands = ["git", "gh"];
  const trimmedCmd = cmd.trim().toLowerCase();

  return gitCommands.some((prefix) => trimmedCmd.startsWith(prefix + " ") || trimmedCmd === prefix);
}

export function filterSafeCommands(commands: string[]): string[] {
  // Filter to only allow safe git/gh operations
  const safePatterns = [
    /^git\s+(status|log|diff|branch|checkout|add|commit|push|pull|fetch|remote|config)/i,
    /^gh\s+(pr|issue|repo|api|workflow|release|auth\s+status)/i,
    /^echo\s+/i, // Allow echo for debugging
    /^pwd$/i, // Allow pwd for debugging
    /^ls\s+/i, // Allow ls for file verification
  ];

  return commands.filter((cmd) => {
    const trimmedCmd = cmd.trim();
    return safePatterns.some((pattern) => pattern.test(trimmedCmd));
  });
}
