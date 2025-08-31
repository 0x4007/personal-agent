import { describe, expect, it } from '@jest/globals';
import { PromptBuilder, createPromptBuilder } from '../../src/prompts/builder';
import { EventContext } from '../../src/adapters/event-context';
import { AccessMode } from '../../src/security/access-control';

describe('PromptBuilder', () => {
  const baseContext: EventContext = {
    platform: 'github',
    eventType: 'issue_comment',
    source: 'owner/repo',
    repository: 'owner/repo',
    issueNumber: '42',
    author: 'testuser',
    command: '@agent help me with this',
  };

  describe('build', () => {
    it('should build a complete prompt for GitHub', () => {
      const builder = new PromptBuilder({
        eventContext: baseContext,
        accessMode: AccessMode.FULL,
      });

      const prompt = builder.build();

      expect(prompt).toContain('Platform Context');
      expect(prompt).toContain('github');
      expect(prompt).toContain('Event Details');
      expect(prompt).toContain('Issue #42');
      expect(prompt).toContain('Author: testuser');
      expect(prompt).toContain('FULL ACCESS');
      expect(prompt).toContain('@agent help me with this');
      expect(prompt).toContain('GitHub Markdown');
    });

    it('should build prompt with read-only access', () => {
      const builder = new PromptBuilder({
        eventContext: baseContext,
        accessMode: AccessMode.READ_ONLY,
      });

      const prompt = builder.build();

      expect(prompt).toContain('READ-ONLY');
      expect(prompt).toContain('only read files and gather information');
    });

    it('should include tools when provided', () => {
      const builder = new PromptBuilder({
        eventContext: baseContext,
        accessMode: AccessMode.FULL,
        availableTools: ['GitHub CLI', 'File operations'],
      });

      const prompt = builder.build();

      expect(prompt).toContain('Available Tools');
      expect(prompt).toContain('GitHub CLI');
      expect(prompt).toContain('File operations');
    });

    it('should include additional context when provided', () => {
      const builder = new PromptBuilder({
        eventContext: baseContext,
        accessMode: AccessMode.FULL,
        additionalContext: 'This is a high-priority issue',
      });

      const prompt = builder.build();

      expect(prompt).toContain('Additional Context');
      expect(prompt).toContain('This is a high-priority issue');
    });

    it('should build prompt for Telegram platform', () => {
      const telegramContext: EventContext = {
        platform: 'telegram',
        eventType: 'message',
        author: 'user123',
        command: '/start',
        metadata: {
          chatId: '12345',
          messageId: '67890',
        },
      };

      const builder = new PromptBuilder({
        eventContext: telegramContext,
        accessMode: AccessMode.FULL,
      });

      const prompt = builder.build();

      expect(prompt).toContain('telegram');
      expect(prompt).toContain('Telegram MarkdownV2');
      expect(prompt).toContain('4096 characters');
      expect(prompt).toContain('Author: user123');
      expect(prompt).toContain('/start');
    });

    it('should build prompt for Discord platform', () => {
      const discordContext: EventContext = {
        platform: 'discord',
        eventType: 'message',
        author: 'discorduser',
        command: '!help',
        metadata: {
          channelId: 'C123',
          threadId: 'T456',
        },
      };

      const builder = new PromptBuilder({
        eventContext: discordContext,
        accessMode: AccessMode.FULL,
      });

      const prompt = builder.build();

      expect(prompt).toContain('discord');
      expect(prompt).toContain('Discord Markdown');
      expect(prompt).toContain('2000 characters');
    });

    it('should include PR-specific metadata', () => {
      const prContext: EventContext = {
        platform: 'github',
        eventType: 'pull_request_comment',
        pullRequestNumber: '100',
        author: 'reviewer',
        command: 'LGTM',
        metadata: {
          prTitle: 'Add new feature',
          baseBranch: 'main',
          headBranch: 'feature-branch',
        },
      };

      const builder = new PromptBuilder({
        eventContext: prContext,
        accessMode: AccessMode.FULL,
      });

      const prompt = builder.build();

      expect(prompt).toContain('Pull Request #100');
      expect(prompt).toContain('Pr Title: Add new feature');
      expect(prompt).toContain('Base Branch: main');
      expect(prompt).toContain('Head Branch: feature-branch');
    });
  });

  describe('buildSimplified', () => {
    it('should build a simplified prompt for retry scenarios', () => {
      const builder = new PromptBuilder({
        eventContext: baseContext,
        accessMode: AccessMode.FULL,
      });

      const prompt = builder.buildSimplified();

      expect(prompt).toContain('Platform: github');
      expect(prompt).toContain('Author: testuser');
      expect(prompt).toContain('@agent help me with this');
      expect(prompt).toContain('full access');
      expect(prompt.split('\n').length).toBeLessThan(10);
    });
  });

  describe('createPromptBuilder', () => {
    it('should create builder with platform-specific tools', () => {
      const prompt = createPromptBuilder(baseContext, AccessMode.FULL).build();

      expect(prompt).toContain('GitHub CLI');
      expect(prompt).toContain('Git operations');
    });

    it('should create builder for telegram with appropriate tools', () => {
      const telegramContext: EventContext = {
        platform: 'telegram',
        eventType: 'message',
        author: 'user',
        command: 'test',
      };

      const prompt = createPromptBuilder(telegramContext, AccessMode.FULL).build();

      expect(prompt).toContain('Telegram Bot API');
      expect(prompt).toContain('Inline keyboards');
    });

    it('should handle unknown platforms gracefully', () => {
      const unknownContext: EventContext = {
        platform: 'unknown',
        eventType: 'event',
        author: 'user',
        command: 'test',
      };

      const prompt = createPromptBuilder(unknownContext, AccessMode.FULL).build();

      expect(prompt).toContain('File system operations');
      expect(prompt).toContain('Shell command execution');
      expect(prompt).not.toContain('GitHub CLI');
    });
  });
});