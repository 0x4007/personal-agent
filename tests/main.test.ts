import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { drop } from "@mswjs/data";
import { Logs } from "@ubiquity-os/ubiquity-os-logger";
import dotenv from "dotenv";
import { db } from "./__mocks__/db";
import { createComment, setupTests } from "./__mocks__/helpers";
import { server } from "./__mocks__/node";
import { STRINGS } from "./__mocks__/strings";
import type { Context } from "../src/types/context";

const callLlmMock = jest.fn();

jest.unstable_mockModule("@ubiquity-os/plugin-sdk", () => ({
  callLlm: callLlmMock,
}));

const { runPlugin } = await import("../src");

dotenv.config();
const commentCreateEvent = "issue_comment.created";

beforeAll(() => {
  server.listen();
});
afterEach(() => {
  server.resetHandlers();
  jest.clearAllMocks();
});
afterAll(() => server.close());

describe("Personal Agent Plugin tests", () => {
  beforeEach(async () => {
    drop(db);
    await setupTests();
    process.env.USER_PAT = "mock-token";
    process.env.UOS_CONTEXT_FETCH = "0";
    process.env.UOS_STYLE_FETCH = "0";
  });

  it("posts a reply for an owner mention", async () => {
    callLlmMock.mockResolvedValue({
      choices: [{ message: { content: "Test reply" } }],
    });

    const { context } = createContext(`@${STRINGS.personalAgentOwner} summarize this`);

    expect(context.eventName).toBe(commentCreateEvent);

    await runPlugin(context);

    const comments = db.issueComments.getAll();
    const last = comments[comments.length - 1];
    expect(last.body).toContain("Test reply");
    expect(last.body).toContain("<!-- pa:ai -->");
  });

  it("ignores comments that do not start with @owner", async () => {
    callLlmMock.mockResolvedValue({
      choices: [{ message: { content: "Should not be used" } }],
    });

    const { context, infoSpy } = createContext(`wrong command`);

    await runPlugin(context);

    expect(infoSpy).toHaveBeenCalledWith(`Comment does not start with @${STRINGS.personalAgentOwner}`, { body: "wrong command" });
  });
});

function createContext(commentBody: string, repoId: number = 1, payloadSenderId: number = 1, commentId: number = 1, issueOne: number = 1) {
  const repo = db.repo.findFirst({ where: { id: { equals: repoId } } }) as unknown as Context["payload"]["repository"];
  const sender = db.users.findFirst({ where: { id: { equals: payloadSenderId } } }) as unknown as Context["payload"]["sender"];
  const issue1 = db.issue.findFirst({ where: { id: { equals: issueOne } } }) as unknown as Context["payload"]["issue"];

  createComment(commentBody, commentId);
  const comment = db.issueComments.findFirst({ where: { id: { equals: commentId } } }) as unknown as Context["payload"]["comment"];

  const context = createContextInner(repo, sender, issue1, comment);
  const infoSpy = jest.spyOn(context.logger, "info");

  return { context, infoSpy, repo, issue1 };
}

function createContextInner(
  repo: Context["payload"]["repository"],
  sender: Context["payload"]["sender"],
  issue: Context["payload"]["issue"],
  comment: Context["payload"]["comment"]
): Context {
  return {
    eventName: "issue_comment.created",
    command: null,
    payload: {
      action: "created",
      sender: sender,
      repository: repo,
      issue: issue,
      comment: comment,
      installation: { id: 1 } as Context["payload"]["installation"],
      organization: { login: STRINGS.USER } as Context["payload"]["organization"],
    },
    logger: new Logs("debug") as unknown as Context["logger"],
    config: {},
    env: {
      AGENT_OWNER: STRINGS.personalAgentOwner,
      USER_PAT: "mock-token",
    },
    authToken: "ghp_test",
    ubiquityKernelToken: "kernel_test",
    octokit: {} as Context["octokit"],
    commentHandler: { postComment: async () => null } as Context["commentHandler"],
  };
}
