import { EventContext } from './event-context';

/**
 * Transforms GitHub webhook events into platform-agnostic EventContext
 */
export class GitHubAdapter {
  /**
   * Converts a GitHub issue comment event to EventContext
   */
  static fromIssueComment(payload: any): EventContext {
    const { issue, comment, repository, sender } = payload;
    
    return {
      platform: 'github',
      eventType: 'issue_comment',
      source: `${repository.owner.login}/${repository.name}`,
      repository: `${repository.owner.login}/${repository.name}`,
      issueNumber: issue.number?.toString(),
      author: sender?.login || comment?.user?.login || 'unknown',
      command: comment?.body || '',
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
  static fromPullRequestComment(payload: any): EventContext {
    const { pull_request, comment, repository, sender } = payload;
    
    return {
      platform: 'github',
      eventType: 'pull_request_comment',
      source: `${repository.owner.login}/${repository.name}`,
      repository: `${repository.owner.login}/${repository.name}`,
      pullRequestNumber: pull_request.number?.toString(),
      author: sender?.login || comment?.user?.login || 'unknown',
      command: comment?.body || '',
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
  static fromPush(payload: any): EventContext {
    const { repository, pusher, head_commit } = payload;
    
    return {
      platform: 'github',
      eventType: 'push',
      source: `${repository.owner.login}/${repository.name}`,
      repository: `${repository.owner.login}/${repository.name}`,
      author: pusher?.name || 'unknown',
      command: head_commit?.message || '',
      metadata: {
        ref: payload.ref,
        before: payload.before,
        after: payload.after,
        commits: payload.commits?.map((c: any) => ({
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
  static fromGitHubEvent(eventName: string, payload: any): EventContext {
    switch (eventName) {
      case 'issue_comment':
        return this.fromIssueComment(payload);
      case 'pull_request_review_comment':
        return this.fromPullRequestComment(payload);
      case 'push':
        return this.fromPush(payload);
      default:
        // Generic fallback for unsupported events
        return {
          platform: 'github',
          eventType: eventName,
          source: payload.repository?.full_name || 'unknown',
          repository: payload.repository?.full_name,
          author: payload.sender?.login || 'unknown',
          command: '',
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