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

    // Execute Claude with the prompt, with retry for empty responses
    let response = await executeClaudeCommand(claudePrompt, logger);

    // If response is empty, try with a simplified prompt
    if (response === "Claude generated an empty response." || response.length === 0) {
      logger.info("First attempt returned empty, retrying with simplified prompt...");

      const simplifiedPrompt = `Please respond to this GitHub issue command concisely:
Command: ${command.substring(0, 500)}

Provide a brief but helpful response.`;

      response = await executeClaudeCommand(simplifiedPrompt, logger);

      if (response === "Claude generated an empty response." || response.length === 0) {
        // Final fallback message
        response =
          "I apologize, but I'm having trouble processing this complex request. Could you please try breaking it down into smaller, more specific questions?";
      } else {
        response = `[Note: Response simplified due to complexity]\n\n${response}`;
      }
    }

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

async function executeClaudeCommand(
  prompt: string,
  logger: { info: (msg: string) => void; verbose: (msg: string) => void; warn?: (msg: string) => void },
  maxRetries = 3
): Promise<string> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.info(`Executing Claude CLI command (attempt ${attempt}/${maxRetries})...`);
      return await executeClaudeCommandInternal(prompt, logger);
    } catch (error) {
      lastError = error as Error;
      const errorMessage = lastError.message || String(error);

      // Check if it's a 5xx error that should be retried
      const is5xxError = /API Error: 5\d{2}/.test(errorMessage) || /Internal server error/.test(errorMessage);

      if (is5xxError && attempt < maxRetries) {
        // Exponential backoff: 2^attempt seconds (2s, 4s, 8s)
        const delayMs = Math.pow(2, attempt) * 1000;
        logger.info(`Received 5xx error, retrying in ${delayMs / 1000} seconds...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      }

      // If not a 5xx error or we've exhausted retries, throw the error
      throw lastError;
    }
  }

  throw lastError || new Error("Failed to execute Claude command after retries");
}

async function executeClaudeCommandInternal(
  prompt: string,
  logger: { info: (msg: string) => void; verbose: (msg: string) => void; warn?: (msg: string) => void }
): Promise<string> {
  logger.verbose("Executing Claude CLI command internal...");
  logger.info(`Prompt length: ${prompt.length} characters`);
  logger.info(`First 200 chars of prompt: ${prompt.substring(0, 200)}`);

  // Create a temporary file for the prompt (similar to Claude Code Action)
  const tmpDir = process.env.RUNNER_TEMP || "/tmp";
  const promptPath = join(tmpDir, `claude-prompt-${Date.now()}.txt`);

  try {
    // Write prompt to temporary file with explicit encoding
    await writeFile(promptPath, Buffer.from(prompt, "utf8"));
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
        detached: false, // Ensure child process is tied to parent
      });

      // Use buffer arrays for proper handling of large outputs
      const outputChunks: Buffer[] = [];
      const errorChunks: Buffer[] = [];
      let hasOutput = false;
      let chunkCount = 0;
      let totalBytes = 0;

      claude.stdout.on("data", (data) => {
        chunkCount++;
        totalBytes += data.length;
        outputChunks.push(data);
        hasOutput = true;

        const chunkStr = data.toString();
        logger.info(`Chunk ${chunkCount}: ${data.length} bytes, total: ${totalBytes} bytes`);
        logger.verbose(`Chunk content preview: ${chunkStr.substring(0, 200)}`);
      });

      claude.stderr.on("data", (data) => {
        errorChunks.push(data);
        const chunk = data.toString();
        // Use warn level for stderr to ensure visibility
        if (logger.warn) {
          logger.warn(`Claude stderr: ${chunk}`);
        } else {
          logger.info(`Claude stderr: ${chunk}`);
        }
      });

      claude.on("close", async (code) => {
        // Clean up streams to prevent hanging
        claude.stdout?.destroy();
        claude.stderr?.destroy();
        claude.stdin?.destroy();

        // Clean up the temporary prompt file
        try {
          await unlink(promptPath);
        } catch (error) {
          logger.verbose(`Failed to delete prompt file: ${error}`);
        }

        // Combine buffer chunks into strings
        const output = Buffer.concat(outputChunks).toString("utf8");
        const errorOutput = Buffer.concat(errorChunks).toString("utf8");

        logger.info(`Total output: ${output.length} characters from ${outputChunks.length} chunks`);
        logger.info(`Raw output first 1000 chars: ${output.substring(0, 1000)}`);

        if (code !== 0) {
          reject(new Error(`Claude CLI exited with code ${code}\nError output: ${errorOutput}\nStandard output: ${output}`));
        } else if (!hasOutput || output.length === 0) {
          logger.info("Claude CLI produced no output or empty output");
          logger.info(`Error output: ${errorOutput}`);
          reject(new Error(`Claude CLI produced no output. Error: ${errorOutput}`));
        } else {
          // Log raw output before cleaning
          logger.info(`Raw Claude output length: ${output.length}`);
          logger.verbose(`Raw Claude output (first 500 chars): ${output.substring(0, 500)}`);

          // Clean up the output - remove any ANSI codes or extra formatting
          const cleanOutput = output
            // eslint-disable-next-line no-control-regex, sonarjs/no-control-regex
            .replace(/\x1b\[[0-9;]*m/g, "") // Remove ANSI color codes
            .replace(/^\s*Claude\s+Code\s+v[\d.]+\s*/gm, "") // Remove version headers
            .replace(/^\s*Human:\s*/gm, "") // Remove Human: prefixes
            .replace(/^\s*Assistant:\s*/gm, "") // Remove Assistant: prefixes
            .trim();

          logger.info(`Cleaned output length: ${cleanOutput.length}`);
          logger.verbose(`Cleaned output (first 500 chars): ${cleanOutput.substring(0, 500)}`);

          // If cleaned output is empty but raw output exists, return raw output
          if (!cleanOutput && output.length > 0) {
            logger.info("Cleaned output is empty but raw output exists, returning raw output");
            resolve(output.trim());
          } else {
            resolve(cleanOutput || "Claude generated an empty response.");
          }
        }
      });

      claude.on("error", (err) => {
        reject(new Error(`Failed to spawn Claude CLI: ${err.message}`));
      });

      // Don't use a hard timeout - let Claude run as long as needed
      // The process will terminate naturally when Claude completes
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
