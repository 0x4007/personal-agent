import { spawn, execSync } from "child_process";
import { writeFile, unlink } from "fs/promises";
import { join } from "path";
import { Context } from "../types";
import { EventContext } from "../types/event-context";
import { CredentialManager } from "../platform/credential-manager";
import { ToolRegistry } from "../platform/tool-registry";

export async function claudeAgent(context: Context): Promise<void> {
  const { logger, payload } = context;

  const sender = payload.comment.user?.login;
  const repo = payload.repository.name;
  const issueNumber = payload.issue.number;
  const owner = payload.repository.owner.login;
  const body = payload.comment.body;
  const agentOwner = context.env.AGENT_OWNER;

  const isReadOnly = process.env.ACCESS_MODE === "read-only";
  const accessLevel = isReadOnly ? "read-only" : "full";

  logger.info(`Executing claudeAgent:`, { sender, repo, issueNumber, owner, agentOwner, accessLevel });

  if (!body.trim().startsWith(`@${agentOwner}`)) {
    logger.info(`Comment does not start with @${agentOwner}`, { body });
    return;
  }

  const command = body.trim().substring(`@${agentOwner}`.length).trim();

  if (!command) {
    await context.commentHandler.postComment(context, logger.error("No command provided after username mention"));
    return;
  }

  logger.info(`Processing command with Claude: ${command}`);

  // Initialize platform systems
  const credentialManager = new CredentialManager(process.env);
  const platform = "github"; // Default to GitHub for now

  // Build event context for Claude with platform awareness
  const eventContext: EventContext = {
    platform,
    eventType: "issue_comment",
    repository: `${owner}/${repo}`,
    issueNumber: String(issueNumber),
    author: sender || "unknown",
    command,
    authentication: credentialManager.getAuthenticationStatus(),
    availableTools: ToolRegistry.getToolNamesForPlatform(platform),
  };

  try {
    const claudePrompt = buildPrompt(isReadOnly, eventContext);

    if (!isReadOnly) {
      try {
        execSync(`git config --global user.name "Agent[bot]"`);
        execSync(`git config --global user.email "agent@users.noreply.github.com"`);
        logger.info("Git configuration set for commits");
      } catch (error) {
        logger.info(`Git config already set or failed: ${error}`);
      }
    }

    let response = await executeClaudeCommand(claudePrompt, logger);

    if (response === "Claude generated an empty response." || response.length === 0) {
      logger.info("First attempt returned empty, retrying with simplified prompt...");

      const simplifiedPrompt = `Please respond to this GitHub issue command concisely:
Command: ${command.substring(0, 500)}

Provide a brief but helpful response.`;

      response = await executeClaudeCommand(simplifiedPrompt, logger);

      if (response === "Claude generated an empty response." || response.length === 0) {
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

function buildPrompt(isReadOnly: boolean, context: EventContext): string {
  const accessDescription = isReadOnly
    ? "You have READ-ONLY access. You can analyze and read code but CANNOT create commits, push branches, or modify anything."
    : "You have full access to perform operations.";

  // Format context, excluding complex objects and the command itself
  const contextDescription = Object.entries(context)
    .filter(([key]) => key !== "command" && key !== "authentication" && key !== "availableTools" && key !== "metadata")
    .map(([key, value]) => {
      const formattedKey = key.replace(/([A-Z])/g, " $1").toLowerCase();
      return `- ${formattedKey}: ${value}`;
    })
    .join("\n");

  // Add tool information if available
  const toolsList = context.availableTools?.map((tool) => `- ${tool}`).join("\n") || "";
  const toolDescription = context.availableTools && context.availableTools.length > 0 ? `\n\nAvailable Tools for ${context.platform}:\n${toolsList}` : "";

  // Add authentication status if available
  const authEntries = context.authentication
    ? Object.entries(context.authentication)
        .map(([platform, hasAuth]) => {
          const status = hasAuth ? "authenticated" : "not authenticated";
          return `- ${platform}: ${status}`;
        })
        .join("\n")
    : "";
  const authDescription = context.authentication ? `\n\nAuthentication Status:\n${authEntries}` : "";

  // Platform-specific instructions
  let platformInstructions: string;
  if (context.platform === "github") {
    if (isReadOnly) {
      platformInstructions = "If asked to perform write operations, explain that you only have read access.";
    } else {
      platformInstructions =
        "The repository is already cloned and you're in the correct directory. You can use git and gh CLI commands which are already authenticated.";
    }
  } else {
    platformInstructions = `You are responding to a ${context.platform} event. Use appropriate tools and formatting for this platform.`;
  }

  return `You are an assistant responding to a request.
${accessDescription}

Event Context:
${contextDescription}${toolDescription}${authDescription}

Request: ${context.command}

${platformInstructions}`;
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

      const is5xxError = /API Error: 5\d{2}/.test(errorMessage) || /Internal server error/.test(errorMessage);

      if (is5xxError && attempt < maxRetries) {
        const delayMs = Math.pow(2, attempt) * 1000;
        logger.info(`Received 5xx error, retrying in ${delayMs / 1000} seconds...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      }

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

  // Use GITHUB_PAT with fallback to USER_PAT for backwards compatibility
  const userPat = process.env.GITHUB_PAT || process.env.USER_PAT;
  if (userPat) {
    logger.info("Configuring GitHub CLI authentication...");
    await configureGitHubAuth(userPat, logger);
  } else {
    logger.info("No GITHUB_PAT/USER_PAT found, gh CLI will use default authentication");
  }

  const tmpDir = process.env.RUNNER_TEMP || "/tmp";
  const promptPath = join(tmpDir, `claude-prompt-${Date.now()}.txt`);

  try {
    await writeFile(promptPath, Buffer.from(prompt, "utf8"));
    logger.verbose(`Wrote prompt to: ${promptPath}`);

    return await new Promise((resolve, reject) => {
      const claudeArgs = ["--dangerously-skip-permissions", "-p", promptPath, "--verbose", "--output-format", "text"];

      const claudePath = process.env.CI ? "claude" : `${process.env.HOME || "/home/runner"}/.local/bin/claude`;

      try {
        // eslint-disable-next-line sonarjs/os-command
        const claudeVersion = execSync(`${claudePath} --version`, { encoding: "utf8" });
        logger.info("Claude CLI version: " + claudeVersion.trim());
      } catch (e) {
        logger.info("Failed to get Claude version: " + String(e));
      }

      const claude = spawn(claudePath, claudeArgs, {
        env: {
          ...process.env,
          // CRITICAL: Override CI detection to prevent Claude restricted mode
          GITHUB_ACTIONS: "false",
          CI: "false",
          CLAUDE_CODE_OAUTH_TOKEN: process.env.CLAUDE_CODE_OAUTH_TOKEN,
          GITHUB_TOKEN: process.env.GITHUB_PAT || process.env.USER_PAT || process.env.GITHUB_TOKEN,
          GH_TOKEN: process.env.GITHUB_PAT || process.env.USER_PAT || process.env.GITHUB_TOKEN,
          HOME: process.env.HOME || "/home/runner",
        },
        stdio: ["ignore", "pipe", "pipe"],
        detached: false,
      });

      const outputChunks: Buffer[] = [];
      const errorChunks: Buffer[] = [];
      let hasOutput = false;

      claude.stdout.on("data", (data) => {
        outputChunks.push(data);
        hasOutput = true;
        logger.verbose(`Received chunk: ${data.length} bytes`);
      });

      claude.stderr.on("data", (data) => {
        errorChunks.push(data);
        const chunk = data.toString();
        if (logger.warn) {
          logger.warn(`Claude stderr: ${chunk}`);
        } else {
          logger.info(`Claude stderr: ${chunk}`);
        }
      });

      claude.on("close", async (code) => {
        if (claude.stdout) claude.stdout.destroy();
        if (claude.stderr) claude.stderr.destroy();

        try {
          await unlink(promptPath);
        } catch (error) {
          logger.verbose(`Failed to delete prompt file: ${error}`);
        }

        const output = Buffer.concat(outputChunks).toString("utf8");
        const errorOutput = Buffer.concat(errorChunks).toString("utf8");

        if (code !== 0) {
          reject(new Error(`Claude CLI exited with code ${code}\nError output: ${errorOutput}\nStandard output: ${output}`));
        } else if (!hasOutput || output.length === 0) {
          logger.info("Claude CLI produced no output or empty output");
          logger.info(`Error output: ${errorOutput}`);
          reject(new Error(`Claude CLI produced no output. Error: ${errorOutput}`));
        } else {
          // Clean ANSI escape codes and other formatting

          const cleanOutput = output
            .replace(/\[[0-9;]*m/g, "")
            .replace(/^\s*Claude\s+Code\s+v[\d.]+\s*/gm, "")
            .replace(/^\s*Human:\s*/gm, "")
            .replace(/^\s*Assistant:\s*/gm, "")
            .trim();

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
    });
  } finally {
    try {
      await unlink(promptPath);
    } catch {
      // Ignore cleanup errors
    }
  }
}

async function configureGitHubAuth(token: string, logger: { info: (msg: string) => void; verbose: (msg: string) => void }): Promise<void> {
  try {
    execSync(`echo "${token}" | gh auth login --with-token`, {
      stdio: "ignore",
      env: { ...process.env, GITHUB_TOKEN: token, GH_TOKEN: token },
    });

    const authStatus = execSync("gh auth status", {
      encoding: "utf8",
      env: { ...process.env, GITHUB_TOKEN: token, GH_TOKEN: token },
    });
    logger.verbose(`GitHub CLI auth status: ${authStatus}`);
    logger.info("GitHub CLI authenticated successfully with user PAT");
  } catch (error) {
    logger.info(`Failed to configure GitHub CLI authentication: ${error instanceof Error ? error.message : String(error)}`);
  }
}
