import { describe, expect, it } from '@jest/globals';
import { 
  EventContext, 
  validateEventContext, 
  createEventContext 
} from '../../src/adapters/event-context';

describe('EventContext', () => {
  describe('validateEventContext', () => {
    it('should validate a complete event context', () => {
      const context: EventContext = {
        platform: 'github',
        eventType: 'issue_comment',
        author: 'testuser',
        command: '/claude help',
        repository: 'owner/repo',
        issueNumber: '123',
      };

      expect(validateEventContext(context)).toBe(true);
    });

    it('should reject context without platform', () => {
      const context = {
        eventType: 'issue_comment',
        author: 'testuser',
        command: '/claude help',
      } as EventContext;

      expect(validateEventContext(context)).toBe(false);
    });

    it('should reject context without eventType', () => {
      const context = {
        platform: 'github',
        author: 'testuser',
        command: '/claude help',
      } as EventContext;

      expect(validateEventContext(context)).toBe(false);
    });

    it('should reject context without author', () => {
      const context = {
        platform: 'github',
        eventType: 'issue_comment',
        command: '/claude help',
      } as EventContext;

      expect(validateEventContext(context)).toBe(false);
    });

    it('should reject context without command', () => {
      const context = {
        platform: 'github',
        eventType: 'issue_comment',
        author: 'testuser',
      } as EventContext;

      expect(validateEventContext(context)).toBe(false);
    });

    it('should accept context with optional fields', () => {
      const context: EventContext = {
        platform: 'telegram',
        eventType: 'message',
        author: 'user123',
        command: 'Hello bot',
        metadata: {
          chatId: '12345',
          messageId: '67890',
        },
        authentication: {
          telegram: true,
        },
      };

      expect(validateEventContext(context)).toBe(true);
    });
  });

  describe('createEventContext', () => {
    it('should create context with defaults', () => {
      const context = createEventContext({
        platform: 'telegram',
        eventType: 'message',
      });

      expect(context.platform).toBe('telegram');
      expect(context.eventType).toBe('message');
      expect(context.author).toBe('');
      expect(context.command).toBe('');
    });

    it('should merge partial context with defaults', () => {
      const context = createEventContext({
        platform: 'github',
        eventType: 'issue_comment',
        author: 'githubuser',
        command: '@agent help',
        metadata: {
          issueNumber: '123',
        },
      });

      expect(context.platform).toBe('github');
      expect(context.eventType).toBe('issue_comment');
      expect(context.author).toBe('githubuser');
      expect(context.command).toBe('@agent help');
      expect(context.metadata?.issueNumber).toBe('123');
    });
  });
});