import { createActionsPlugin } from "@ubiquity-os/plugin-sdk";
import { customOctokit } from "@ubiquity-os/plugin-sdk/octokit";
import { LOG_LEVEL, LogLevel } from "@ubiquity-os/ubiquity-os-logger";
import { runPlugin } from "./index";
import { Env, envSchema, PluginSettings, pluginSettingsSchema, SupportedEvents } from "./types";

export default createActionsPlugin<PluginSettings, Env, null, SupportedEvents>(
  async (context) => {
    context.octokit = new customOctokit({ auth: context.env.GITHUB_PAT });

    try {
      const result = await runPlugin(context);

      // Allow event loop to drain naturally
      // If something is keeping the process alive, we want to know about it
      // in development, but in CI we need to ensure termination
      if (process.env.CI) {
        // Use setImmediate to schedule exit after current I/O events complete
        setImmediate(() => {
          process.exit(0);
        });
      }

      return result;
    } catch (error) {
      // Ensure we exit on error too
      if (process.env.CI) {
        setImmediate(() => {
          process.exit(1);
        });
      }
      throw error;
    }
  },
  {
    logLevel: (process.env.LOG_LEVEL as LogLevel) || LOG_LEVEL.INFO,
    settingsSchema: pluginSettingsSchema,
    envSchema: envSchema,
    ...(process.env.KERNEL_PUBLIC_KEY && { kernelPublicKey: process.env.KERNEL_PUBLIC_KEY }),
    postCommentOnError: true,
    bypassSignatureVerification: process.env.NODE_ENV === "local",
  }
);
