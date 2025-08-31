import { createPlugin } from "@ubiquity-os/plugin-sdk";
import { customOctokit } from "@ubiquity-os/plugin-sdk/octokit";
import { LOG_LEVEL } from "@ubiquity-os/ubiquity-os-logger";
import manifest from "../manifest.json";
import { runPlugin } from "./index";
import { envSchema, pluginSettingsSchema } from "./types";
export default {
    async fetch(request, env, executionCtx) {
        return createPlugin((context) => {
            context.octokit = new customOctokit({ auth: context.env.USER_PAT });
            return runPlugin(context);
        }, manifest, {
            envSchema: envSchema,
            postCommentOnError: true,
            settingsSchema: pluginSettingsSchema,
            logLevel: env.LOG_LEVEL || LOG_LEVEL.INFO,
            kernelPublicKey: env.KERNEL_PUBLIC_KEY,
            bypassSignatureVerification: process.env.NODE_ENV === "local",
        }).fetch(request, env, executionCtx);
    },
};
