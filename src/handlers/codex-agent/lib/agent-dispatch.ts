import { brotliCompressSync } from "node:zlib";
import { randomUUID } from "node:crypto";
import { customOctokit } from "@ubiquity-os/plugin-sdk/octokit";
import { Context } from "../../../types";
import { requirePatToken } from "./config";
import { safeStringify } from "./utils";

const CONFIG_FULL_PATH = ".github/.ubiquity-os.config.yml";
const DEV_CONFIG_FULL_PATH = ".github/.ubiquity-os.config.dev.yml";

const ENVIRONMENT_TO_CONFIG_SUFFIX: Record<string, string> = {
  development: "dev",
};

const VALID_CONFIG_SUFFIX = /^[a-z0-9][a-z0-9_-]*$/i;

type AgentTarget = {
  owner: string;
  repo: string;
  workflowId: string;
  ref?: string;
};

type AgentDispatchResult = {
  target: AgentTarget;
  ref: string;
  inputs: Record<string, string>;
};

function normalizeEnvironmentName(environment: string | null | undefined): string {
  return String(environment ?? "")
    .trim()
    .toLowerCase();
}

function getConfigFullPathForEnvironment(environment: string | null | undefined): string {
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

function getConfigPathCandidatesForEnvironment(environment: string | null | undefined): string[] {
  const primary = getConfigFullPathForEnvironment(environment);
  return primary === CONFIG_FULL_PATH ? [CONFIG_FULL_PATH] : [primary, CONFIG_FULL_PATH];
}

function compressString(value: string): string {
  const data = Buffer.from(value, "utf8");
  return Buffer.from(brotliCompressSync(data)).toString("base64");
}

function resolveAgentTarget(env: Context["env"]): AgentTarget {
  const owner = String(env.UOS_AGENT_OWNER || process.env.UOS_AGENT_OWNER || "ubiquity-os").trim();
  const repo = String(env.UOS_AGENT_REPO || process.env.UOS_AGENT_REPO || "ubiquity-os-kernel").trim();
  const workflowId = String(env.UOS_AGENT_WORKFLOW || process.env.UOS_AGENT_WORKFLOW || "agent.yml").trim();
  const ref = String(env.UOS_AGENT_REF || process.env.UOS_AGENT_REF || "").trim();

  if (!owner || !repo || !workflowId) {
    throw new Error("Missing agent workflow target (UOS_AGENT_OWNER/UOS_AGENT_REPO/UOS_AGENT_WORKFLOW).");
  }

  return { owner, repo, workflowId, ref: ref || undefined };
}

async function getDefaultBranch(octokit: InstanceType<typeof customOctokit>, owner: string, repo: string): Promise<string> {
  const response = await octokit.rest.repos.get({ owner, repo });
  return response.data.default_branch;
}

function buildAgentSettings(context: Context, overrides?: Record<string, unknown>): Record<string, unknown> {
  const environment = String((context.env as Record<string, unknown>).ENVIRONMENT || process.env.ENVIRONMENT || "").trim();
  const settings: Record<string, unknown> = {};
  if (environment) {
    settings.environment = environment;
  }
  const candidates = getConfigPathCandidatesForEnvironment(environment);
  if (candidates.length) {
    settings.configPathCandidates = candidates;
  }
  return { ...settings, ...(overrides ?? {}) };
}

export async function dispatchAgentWorkflow(args: {
  context: Context;
  task: string;
  logger: { info: (...a: unknown[]) => void };
  settingsOverrides?: Record<string, unknown>;
}): Promise<AgentDispatchResult> {
  const { context, task, logger, settingsOverrides } = args;

  const { token: authToken, source: tokenSource } = requirePatToken({ purpose: "agent dispatch" });
  const octokit = new customOctokit({ auth: authToken });

  const target = resolveAgentTarget(context.env);
  const ref = target.ref || (await getDefaultBranch(octokit, target.owner, target.repo));
  const stateId = randomUUID();
  const settings = buildAgentSettings(context, settingsOverrides);
  const eventPayload = compressString(safeStringify(context.payload ?? {}));
  const command = JSON.stringify({ name: "agent", parameters: { task } });

  const inputs: Record<string, string> = {
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
