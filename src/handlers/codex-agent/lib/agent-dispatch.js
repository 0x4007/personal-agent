import { brotliCompressSync } from "node:zlib";
import { randomUUID } from "node:crypto";
import { customOctokit } from "@ubiquity-os/plugin-sdk/octokit";
import { requirePatToken } from "./config";
import { safeStringify } from "./utils";
const CONFIG_FULL_PATH = ".github/.ubiquity-os.config.yml";
const DEV_CONFIG_FULL_PATH = ".github/.ubiquity-os.config.dev.yml";
const ENVIRONMENT_TO_CONFIG_SUFFIX = {
    development: "dev",
};
const VALID_CONFIG_SUFFIX = /^[a-z0-9][a-z0-9_-]*$/i;
function normalizeEnvironmentName(environment) {
    return String(environment ?? "")
        .trim()
        .toLowerCase();
}
function getConfigFullPathForEnvironment(environment) {
    const normalized = normalizeEnvironmentName(environment);
    if (!normalized) {
        return DEV_CONFIG_FULL_PATH;
    }
    if (normalized === "production" || normalized === "prod") {
        return CONFIG_FULL_PATH;
    }
    const suffix = ENVIRONMENT_TO_CONFIG_SUFFIX[normalized] ?? normalized;
    if (suffix === "dev") {
        return DEV_CONFIG_FULL_PATH;
    }
    if (!VALID_CONFIG_SUFFIX.test(suffix)) {
        return DEV_CONFIG_FULL_PATH;
    }
    return `.github/.ubiquity-os.config.${suffix}.yml`;
}
function getConfigPathCandidatesForEnvironment(environment) {
    const primary = getConfigFullPathForEnvironment(environment);
    return primary === CONFIG_FULL_PATH ? [CONFIG_FULL_PATH] : [primary, CONFIG_FULL_PATH];
}
function compressString(value) {
    const data = Buffer.from(value, "utf8");
    return Buffer.from(brotliCompressSync(data)).toString("base64");
}
function resolveAgentTarget(env) {
    const owner = String(env.UOS_AGENT_OWNER || process.env.UOS_AGENT_OWNER || "ubiquity-os").trim();
    const repo = String(env.UOS_AGENT_REPO || process.env.UOS_AGENT_REPO || "ubiquity-os-kernel").trim();
    const workflowId = String(env.UOS_AGENT_WORKFLOW || process.env.UOS_AGENT_WORKFLOW || "agent.yml").trim();
    const ref = String(env.UOS_AGENT_REF || process.env.UOS_AGENT_REF || "").trim();
    if (!owner || !repo || !workflowId) {
        throw new Error("Missing agent workflow target (UOS_AGENT_OWNER/UOS_AGENT_REPO/UOS_AGENT_WORKFLOW).");
    }
    return { owner, repo, workflowId, ref: ref || undefined };
}
async function getDefaultBranch(octokit, owner, repo) {
    const response = await octokit.rest.repos.get({ owner, repo });
    return response.data.default_branch;
}
function buildAgentSettings(context, overrides) {
    const environment = String(context.env.ENVIRONMENT || process.env.ENVIRONMENT || "").trim();
    const settings = {};
    if (environment) {
        settings.environment = environment;
    }
    const candidates = getConfigPathCandidatesForEnvironment(environment);
    if (candidates.length) {
        settings.configPathCandidates = candidates;
    }
    return { ...settings, ...(overrides ?? {}) };
}
export async function dispatchAgentWorkflow(args) {
    const { context, task, logger, settingsOverrides } = args;
    const { token: authToken, source: tokenSource } = requirePatToken({ isSelf: true, purpose: "agent dispatch" });
    const octokit = new customOctokit({ auth: authToken });
    const target = resolveAgentTarget(context.env);
    const ref = target.ref || (await getDefaultBranch(octokit, target.owner, target.repo));
    const stateId = randomUUID();
    const settings = buildAgentSettings(context, settingsOverrides);
    const eventPayload = compressString(safeStringify(context.payload ?? {}));
    const command = JSON.stringify({ name: "agent", parameters: { task } });
    const inputs = {
        stateId,
        eventName: context.eventName,
        eventPayload,
        settings: JSON.stringify(settings),
        authToken,
        ubiquityKernelToken: String(context.ubiquityKernelToken || ""),
        ref,
        command,
        signature: "",
    };
    logger.info("[agent] Dispatching workflow", { owner: target.owner, repo: target.repo, workflow: target.workflowId, ref, tokenSource });
    await octokit.rest.actions.createWorkflowDispatch({
        owner: target.owner,
        repo: target.repo,
        workflow_id: target.workflowId,
        ref,
        inputs,
    });
    return { target, ref, inputs };
}
