import { EventContext } from "./event-context";

// GitHub webhook payload types
interface GitHubRepository {
  full_name: string;
  name: string;
  owner: {
    login: string;
  };
}

interface GitHubUser {
  login: string;
}

interface GitHubIssue {
  number: number;
  title: string;
  state: string;
}

interface GitHubPullRequest {
  number: number;
  title: string;
  state: string;
  base: {
    ref: string;
  };
  head: {
    ref: string;
  };
}

interface GitHubComment {
  id: number;
  body: string;
  html_url: string;
  created_at: string;
  updated_at: string;
  user: GitHubUser;
}

interface GitHubCommit {
  id: string;
  message: string;
  author: {
    name: string;
  };
}

interface GitHubIssueCommentPayload {
  issue: GitHubIssue;
  comment: GitHubComment;
  repository: GitHubRepository;
  sender: GitHubUser;
}

interface GitHubPullRequestCommentPayload {
  pull_request: GitHubPullRequest;
  comment: GitHubComment;
  repository: GitHubRepository;
  sender: GitHubUser;
}

interface GitHubPushPayload {
  repository: GitHubRepository;
  pusher: {
    name: string;
  };
  head_commit: GitHubCommit;
  ref: string;
  before: string;
  after: string;
  commits: GitHubCommit[];
}

interface GitHubEventPayload {
  repository?: GitHubRepository;
  sender?: GitHubUser;
  [key: string]: unknown;
}

/**
 * Transforms GitHub webhook events into platform-agnostic EventContext
 */
export class GitHubAdapter {
  /**
   * Converts a GitHub issue comment event to EventContext
   */
  static fromIssueComment(payload: GitHubIssueCommentPayload): EventContext {
    const { issue, comment, repository, sender } = payload;

    return {
      platform: "github",
      eventType: "issue_comment",
      source: `${repository.owner.login}/${repository.name}`,
      repository: `${repository.owner.login}/${repository.name}`,
      issueNumber: issue.number?.toString(),
      author: sender?.login || comment?.user?.login || "unknown",
      command: comment?.body || "",
      metadata: {
        commentId: comment?.id?.toString(),
        issueTitle: issue?.title,
        issueState: issue?.state,
        htmlUrl: comment?.html_url,
        createdAt: comment?.created_at,
        updatedAt: comment?.updated_at,
      },
      authentication: {
        github: true,
      },
    };
  }

  /**
   * Converts a GitHub pull request comment event to EventContext
   */
  static fromPullRequestComment(payload: GitHubPullRequestCommentPayload): EventContext {
    const { pull_request, comment, repository, sender } = payload;

    return {
      platform: "github",
      eventType: "pull_request_comment",
      source: `${repository.owner.login}/${repository.name}`,
      repository: `${repository.owner.login}/${repository.name}`,
      pullRequestNumber: pull_request.number?.toString(),
      author: sender?.login || comment?.user?.login || "unknown",
      command: comment?.body || "",
      metadata: {
        commentId: comment?.id?.toString(),
        prTitle: pull_request?.title,
        prState: pull_request?.state,
        htmlUrl: comment?.html_url,
        createdAt: comment?.created_at,
        updatedAt: comment?.updated_at,
        baseBranch: pull_request?.base?.ref,
        headBranch: pull_request?.head?.ref,
      },
      authentication: {
        github: true,
      },
    };
  }

  /**
   * Converts a GitHub push event to EventContext
   */
  static fromPush(payload: GitHubPushPayload): EventContext {
    const { repository, pusher, head_commit } = payload;

    return {
      platform: "github",
      eventType: "push",
      source: `${repository.owner.login}/${repository.name}`,
      repository: `${repository.owner.login}/${repository.name}`,
      author: pusher?.name || "unknown",
      command: head_commit?.message || "",
      metadata: {
        ref: payload.ref,
        before: payload.before,
        after: payload.after,
        commits: payload.commits?.map((c: GitHubCommit) => ({
          id: c.id,
          message: c.message,
          author: c.author?.name,
        })),
      },
      authentication: {
        github: true,
      },
    };
  }

  /**
   * Main entry point for converting GitHub events
   */
  static fromGitHubEvent(eventName: string, payload: GitHubEventPayload): EventContext {
    switch (eventName) {
      case "issue_comment":
        return this.fromIssueComment(payload as unknown as GitHubIssueCommentPayload);
      case "pull_request_review_comment":
        return this.fromPullRequestComment(payload as unknown as GitHubPullRequestCommentPayload);
      case "push":
        return this.fromPush(payload as unknown as GitHubPushPayload);
      default:
        // Generic fallback for unsupported events
        return {
          platform: "github",
          eventType: eventName,
          source: payload.repository?.full_name || "unknown",
          repository: payload.repository?.full_name,
          author: payload.sender?.login || "unknown",
          command: "",
          metadata: {
            rawEvent: eventName,
            rawPayload: payload,
          },
          authentication: {
            github: true,
          },
        };
    }
  }
}
