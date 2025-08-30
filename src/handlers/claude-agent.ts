import { spawn } from "child_process";
import { writeFile, unlink } from "fs/promises";
import { join } from "path";
import { Context } from "../types";

export async function claudeAgent(context: Context): Promise<void> {
  const { logger, payload } = context;

  const sender = payload.comment.user?.login;
  const repo = payload.repository.name;
  const issueNumber = payload.issue.number;
  const owner = payload.repository.owner.login;
  const body = payload.comment.body;
  const agentOwner = context.env.AGENT_OWNER;

  logger.info(`Executing claudeAgent:`, { sender, repo, issueNumber, owner, agentOwner });

  if (!body.trim().startsWith(`@${agentOwner}`)) {
    logger.info(`Comment does not start with @${agentOwner}`, { body });
    return;
  }

  // Extract the command after the username mention
  const command = body.trim().substring(`@${agentOwner}`.length).trim();

  if (!command) {
    await context.commentHandler.postComment(context, logger.error("No command provided after username mention"));
    return;
  }

  logger.info(`Processing command with Claude: ${command}`);

  try {
    // Prepare the context for Claude
    const claudePrompt = `You are a helpful GitHub assistant responding to a command in a GitHub issue comment.

Issue Context:
- Repository: ${owner}/${repo}
- Issue #${issueNumber}
- Comment by: ${sender}
- Command: ${command}

Please provide a helpful and concise response to this command. Be friendly and professional.`;

    // Execute Claude with the prompt
    const response = await executeClaudeCommand(claudePrompt, logger);

    // Post the Claude response as a comment
    await context.commentHandler.postComment(context, logger.ok(response));

    logger.ok(`Successfully posted Claude response!`);
  } catch (error) {
    logger.error(`Failed to execute Claude command: ${error}`);
    await context.commentHandler.postComment(
      context,
      logger.error(`Failed to process command with Claude: ${error instanceof Error ? error.message : String(error)}`)
    );
  }

  logger.verbose(`Exiting claudeAgent`);
}

async function executeClaudeCommand(prompt: string, logger: { info: (msg: string) => void; verbose: (msg: string) => void }): Promise<string> {
  logger.info("Executing Claude CLI command...");

  // Create a temporary file for the prompt (similar to Claude Code Action)
  const tmpDir = process.env.RUNNER_TEMP || "/tmp";
  const promptPath = join(tmpDir, `claude-prompt-${Date.now()}.txt`);

  try {
    // Write prompt to temporary file
    await writeFile(promptPath, prompt, "utf8");
    logger.verbose(`Wrote prompt to: ${promptPath}`);

    return await new Promise((resolve, reject) => {
      // Use the official Claude CLI with proper arguments
      const claudeArgs = [
        "--dangerously-skip-permissions",
        "-p",
        promptPath,
        "--verbose",
        "--output-format",
        "text", // Use text format for simpler parsing
      ];

      logger.verbose(`Executing: claude ${claudeArgs.join(" ")}`);

      // Try to find claude in PATH first, fallback to known locations
      const claudePath = process.env.CI
        ? "claude" // In CI, rely on PATH
        : `${process.env.HOME || "/home/runner"}/.local/bin/claude`;

      const claude = spawn(claudePath, claudeArgs, {
        env: {
          ...process.env,
          // Claude CLI will use CLAUDE_CODE_OAUTH_TOKEN from environment
          CLAUDE_CODE_OAUTH_TOKEN: process.env.CLAUDE_CODE_OAUTH_TOKEN,
          // Set HOME to ensure Claude can find its config
          HOME: process.env.HOME || "/home/runner",
        },
        stdio: ["ignore", "pipe", "pipe"], // Ignore stdin, pipe stdout and stderr
      });

      let output = "";
      let errorOutput = "";
      let hasOutput = false;

      claude.stdout.on("data", (data) => {
        const chunk = data.toString();
        output += chunk;
        hasOutput = true;
        // Log chunks for debugging
        logger.verbose(`Claude stdout chunk: ${chunk.substring(0, 100)}...`);
      });

      claude.stderr.on("data", (data) => {
        const chunk = data.toString();
        errorOutput += chunk;
        logger.verbose(`Claude stderr: ${chunk}`);
      });

      claude.on("close", async (code) => {
        // Clean up the temporary prompt file
        try {
          await unlink(promptPath);
        } catch (error) {
          logger.verbose(`Failed to delete prompt file: ${error}`);
        }

        if (code !== 0) {
          reject(new Error(`Claude CLI exited with code ${code}\nError output: ${errorOutput}\nStandard output: ${output}`));
        } else if (!hasOutput) {
          reject(new Error(`Claude CLI produced no output. Error: ${errorOutput}`));
        } else {
          // Clean up the output - remove any ANSI codes or extra formatting
          const cleanOutput = output
            // eslint-disable-next-line no-control-regex, sonarjs/no-control-regex
            .replace(/\x1b\[[0-9;]*m/g, "") // Remove ANSI color codes
            .replace(/^\s*Claude\s+Code\s+v[\d.]+\s*/gm, "") // Remove version headers
            .trim();

          resolve(cleanOutput || "Claude generated an empty response.");
        }
      });

      claude.on("error", (err) => {
        reject(new Error(`Failed to spawn Claude CLI: ${err.message}`));
      });

      // Add timeout to prevent hanging
      setTimeout(
        () => {
          claude.kill("SIGTERM");
          reject(new Error("Claude CLI execution timed out after 5 minutes"));
        },
        5 * 60 * 1000
      );
    });
  } finally {
    // Ensure cleanup even if there's an error
    try {
      await unlink(promptPath);
    } catch {
      // Ignore cleanup errors on final cleanup
    }
  }
}
