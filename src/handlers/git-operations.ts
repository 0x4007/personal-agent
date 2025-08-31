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

export function executeGitCommands(commands: string[], logger: { info: (msg: string) => void; error: (msg: string) => void }): ExecutionSummary {
  const results: CommandResult[] = [];

  logger.info("=== GIT OPERATIONS DEBUG ===");
  logger.info("Total commands to execute: " + commands.length);
  logger.info("Current working directory: " + process.cwd());
  logger.info("USER_PAT available: " + (process.env.USER_PAT ? "YES" : "NO"));

  // Just execute everything - PAT permissions handle all security
  for (const cmd of commands) {
    logger.info(`Executing command: ${cmd}`);

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

// Remove all filtering - PAT permissions handle security
