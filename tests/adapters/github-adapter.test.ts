import { describe, expect, it } from '@jest/globals';
import { GitHubAdapter } from '../../src/adapters/github-adapter';

describe('GitHubAdapter', () => {
  describe('fromIssueComment', () => {
    it('should transform issue comment event correctly', () => {
      const payload = {
        issue: {
          number: 42,
          title: 'Test Issue',
          state: 'open',
        },
        comment: {
          id: 12345,
          body: '@agent please help with this',
          html_url: 'https://github.com/owner/repo/issues/42#issuecomment-12345',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          user: {
            login: 'commenter',
          },
        },
        repository: {
          name: 'repo',
          owner: {
            login: 'owner',
          },
        },
        sender: {
          login: 'sender',
        },
      };

      const context = GitHubAdapter.fromIssueComment(payload);

      expect(context.platform).toBe('github');
      expect(context.eventType).toBe('issue_comment');
      expect(context.source).toBe('owner/repo');
      expect(context.repository).toBe('owner/repo');
      expect(context.issueNumber).toBe('42');
      expect(context.author).toBe('sender');
      expect(context.command).toBe('@agent please help with this');
      expect(context.metadata?.commentId).toBe('12345');
      expect(context.metadata?.issueTitle).toBe('Test Issue');
      expect(context.metadata?.issueState).toBe('open');
      expect(context.authentication?.github).toBe(true);
    });

    it('should handle missing sender gracefully', () => {
      const payload = {
        issue: {
          number: 1,
        },
        comment: {
          body: 'test comment',
          user: {
            login: 'fallback-user',
          },
        },
        repository: {
          name: 'repo',
          owner: {
            login: 'owner',
          },
        },
      };

      const context = GitHubAdapter.fromIssueComment(payload);
      expect(context.author).toBe('fallback-user');
    });
  });

  describe('fromPullRequestComment', () => {
    it('should transform PR comment event correctly', () => {
      const payload = {
        pull_request: {
          number: 100,
          title: 'Feature PR',
          state: 'open',
          base: {
            ref: 'main',
          },
          head: {
            ref: 'feature-branch',
          },
        },
        comment: {
          id: 54321,
          body: '@agent review this please',
          html_url: 'https://github.com/owner/repo/pull/100#issuecomment-54321',
          created_at: '2024-01-02T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
        },
        repository: {
          name: 'repo',
          owner: {
            login: 'owner',
          },
        },
        sender: {
          login: 'pr-author',
        },
      };

      const context = GitHubAdapter.fromPullRequestComment(payload);

      expect(context.platform).toBe('github');
      expect(context.eventType).toBe('pull_request_comment');
      expect(context.pullRequestNumber).toBe('100');
      expect(context.author).toBe('pr-author');
      expect(context.command).toBe('@agent review this please');
      expect(context.metadata?.prTitle).toBe('Feature PR');
      expect(context.metadata?.baseBranch).toBe('main');
      expect(context.metadata?.headBranch).toBe('feature-branch');
    });
  });

  describe('fromPush', () => {
    it('should transform push event correctly', () => {
      const payload = {
        ref: 'refs/heads/main',
        before: 'abc123',
        after: 'def456',
        repository: {
          name: 'repo',
          owner: {
            login: 'owner',
          },
        },
        pusher: {
          name: 'developer',
        },
        head_commit: {
          message: 'feat: add new feature',
        },
        commits: [
          {
            id: 'commit1',
            message: 'first commit',
            author: {
              name: 'dev1',
            },
          },
          {
            id: 'commit2',
            message: 'second commit',
            author: {
              name: 'dev2',
            },
          },
        ],
      };

      const context = GitHubAdapter.fromPush(payload);

      expect(context.platform).toBe('github');
      expect(context.eventType).toBe('push');
      expect(context.author).toBe('developer');
      expect(context.command).toBe('feat: add new feature');
      expect(context.metadata?.ref).toBe('refs/heads/main');
      expect(context.metadata?.before).toBe('abc123');
      expect(context.metadata?.after).toBe('def456');
      expect(context.metadata?.commits).toHaveLength(2);
    });
  });

  describe('fromGitHubEvent', () => {
    it('should route to correct transformer based on event name', () => {
      const issuePayload = {
        issue: { number: 1 },
        comment: { body: 'test' },
        repository: { name: 'repo', owner: { login: 'owner' } },
        sender: { login: 'user' },
      };

      const context = GitHubAdapter.fromGitHubEvent('issue_comment', issuePayload);
      expect(context.eventType).toBe('issue_comment');
    });

    it('should handle unknown events with fallback', () => {
      const unknownPayload = {
        repository: {
          full_name: 'owner/repo',
        },
        sender: {
          login: 'user',
        },
      };

      const context = GitHubAdapter.fromGitHubEvent('unknown_event', unknownPayload);
      
      expect(context.platform).toBe('github');
      expect(context.eventType).toBe('unknown_event');
      expect(context.source).toBe('owner/repo');
      expect(context.author).toBe('user');
      expect(context.metadata?.rawEvent).toBe('unknown_event');
    });
  });
});