import { createActionsPlugin } from "@ubiquity-os/plugin-sdk";
import { customOctokit } from "@ubiquity-os/plugin-sdk/octokit";
import { LOG_LEVEL } from "@ubiquity-os/ubiquity-os-logger";
import { runPlugin } from "./index";
import { envSchema, pluginSettingsSchema } from "./types";
import { selectWriteToken } from "./handlers/codex-agent/lib/config";
export default createActionsPlugin((context) => {
    const token = selectWriteToken();
    context.octokit = new customOctokit({ auth: token });
    return runPlugin(context);
}, {
    logLevel: process.env.LOG_LEVEL || LOG_LEVEL.INFO,
    settingsSchema: pluginSettingsSchema,
    envSchema: envSchema,
    ...(process.env.KERNEL_PUBLIC_KEY && { kernelPublicKey: process.env.KERNEL_PUBLIC_KEY }),
    postCommentOnError: true,
    bypassSignatureVerification: process.env.NODE_ENV === "local",
});
