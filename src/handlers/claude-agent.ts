import { spawn, execFileSync, spawnSync } from "child_process";
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

  // Build event context for Claude
  const eventContext = {
    eventType: "issue_comment",
    repository: `${owner}/${repo}`,
    issueNumber: String(issueNumber),
    author: sender || "unknown",
    command,
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

interface EventContext {
  eventType: string;
  repository: string;
  issueNumber?: string;
  pullRequestNumber?: string;
  author: string;
  command: string;
  [key: string]: string | number | undefined;
}

function buildPrompt(isReadOnly: boolean, context: EventContext): string {
  const accessDescription = isReadOnly
    ? "You have READ-ONLY access. You can analyze and read code but CANNOT create commits, push branches, or modify anything."
    : "You have full access to perform operations.";

  const contextDescription = Object.entries(context)
    .filter(([key]) => key !== "command")
    .map(([key, value]) => {
      const formattedKey = key.replace(/([A-Z])/g, " $1").toLowerCase();
      return `- ${formattedKey}: ${value}`;
    })
    .join("\n");

  return `You are an assistant responding to a request.
${accessDescription}

Event Context:
${contextDescription}

Request: ${context.command}

${!isReadOnly ? "The repository is already cloned and you're in the correct directory. You can use git and gh CLI commands which are already authenticated." : "If asked to perform write operations, explain that you only have read access."}`;
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

  const userPat = process.env.USER_PAT;
  if (userPat) {
    logger.info("Configuring GitHub CLI authentication...");
    await configureGitHubAuth(userPat, logger);
  } else {
    logger.info("No USER_PAT found, gh CLI will use default authentication");
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
        const versionOut = execFileSync(claudePath, ["--version"], { encoding: "utf8" });
        logger.info("Claude CLI version: " + String(versionOut || "").trim());
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
          GITHUB_TOKEN: process.env.USER_PAT || process.env.GITHUB_TOKEN,
          GH_TOKEN: process.env.USER_PAT || process.env.GITHUB_TOKEN,
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
          const cleanOutput = stripAnsi(output)
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
    // Login by piping the token to gh via stdin using spawnSync (no shell)
    const ghPath = process.env.GH_PATH || "/usr/local/bin/gh";
    const login = spawnSync(ghPath, ["auth", "login", "--with-token"], {
      input: `${token}\n`,
      env: { ...process.env, GITHUB_TOKEN: token, GH_TOKEN: token },
      stdio: ["pipe", "ignore", "ignore"],
    });
    if (login.status !== 0) {
      throw new Error("gh auth login failed");
    }

    const status = spawnSync(ghPath, ["auth", "status"], {
      env: { ...process.env, GITHUB_TOKEN: token, GH_TOKEN: token },
      stdio: ["ignore", "pipe", "ignore"],
      encoding: "utf8",
    });
    const authStatus = status.stdout || "";
    logger.verbose(`GitHub CLI auth status: ${authStatus}`);
    logger.info("GitHub CLI authenticated successfully with user PAT");
  } catch (error) {
    logger.info(`Failed to configure GitHub CLI authentication: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function stripAnsi(text: string): string {
  // Remove ANSI SGR escape sequences without control-char regex literals
  let out = "";
  let i = 0;
  while (i < text.length) {
    const ch = text.charCodeAt(i);
    if (ch === 0x1b && text[i + 1] === "[") {
      i = skipAnsiAt(text, i);
      continue;
    }
    out += text[i];
    i++;
  }
  return out;
}

function skipAnsiAt(s: string, start: number): number {
  // start points at ESC; skip until we pass the final 'm' or reach end
  let i = start + 2; // skip ESC and '['
  for (; i < s.length; i++) {
    const c = s[i];
    if ((c >= "0" && c <= "9") || c === ";") continue;
    if (c === "m") return i + 1; // include 'm'
    // unknown terminator; stop here
    return i + 1;
  }
  return i;
}
