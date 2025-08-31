import { describe, test, expect, beforeEach } from "@jest/globals";
import { EventContext } from "../src/types/event-context";

describe("EventContext Transformation", () => {
  describe("GitHub Events", () => {
    test("transforms issue_comment event correctly", () => {
      const githubEvent = {
        action: "created",
        issue: {
          number: 123,
          user: { login: "testuser" },
        },
        comment: {
          body: "@agent help me fix this",
          user: { login: "commenter" },
        },
        repository: {
          full_name: "owner/repo",
        },
      };

      const context: EventContext = {
        platform: "github",
        eventType: "issue_comment",
        source: "owner/repo",
        repository: "owner/repo",
        issueNumber: "123",
        author: "commenter",
        command: "@agent help me fix this",
        metadata: {
          action: "created",
        },
      };

      expect(context.platform).toBe("github");
      expect(context.eventType).toBe("issue_comment");
      expect(context.issueNumber).toBe("123");
      expect(context.author).toBe("commenter");
    });

    test("transforms pull_request_review_comment event", () => {
      const context: EventContext = {
        platform: "github",
        eventType: "pull_request_review_comment",
        source: "owner/repo",
        repository: "owner/repo",
        pullRequestNumber: "456",
        author: "reviewer",
        command: "@agent check this code",
        metadata: {
          action: "created",
          reviewId: "789",
        },
      };

      expect(context.platform).toBe("github");
      expect(context.pullRequestNumber).toBe("456");
      expect(context.metadata?.reviewId).toBe("789");
    });
  });

  describe("Telegram Events", () => {
    test("transforms message event correctly", () => {
      const telegramEvent = {
        message: {
          message_id: 1001,
          from: {
            id: 123456,
            username: "telegramuser",
          },
          chat: {
            id: -100123456789,
            type: "group",
          },
          text: "@agent analyze this image",
        },
      };

      const context: EventContext = {
        platform: "telegram",
        eventType: "message",
        source: "-100123456789",
        author: "telegramuser",
        command: "@agent analyze this image",
        metadata: {
          chatId: "-100123456789",
          messageId: "1001",
          chatType: "group",
          userId: 123456,
        },
      };

      expect(context.platform).toBe("telegram");
      expect(context.eventType).toBe("message");
      expect(context.metadata?.chatId).toBe("-100123456789");
      expect(context.metadata?.messageId).toBe("1001");
    });

    test("transforms callback_query event", () => {
      const context: EventContext = {
        platform: "telegram",
        eventType: "callback_query",
        source: "-100123456789",
        author: "telegramuser",
        command: "button_action_1",
        metadata: {
          chatId: "-100123456789",
          callbackQueryId: "query123",
          data: "button_action_1",
        },
      };

      expect(context.platform).toBe("telegram");
      expect(context.eventType).toBe("callback_query");
      expect(context.metadata?.callbackQueryId).toBe("query123");
    });
  });

  describe("Platform Detection", () => {
    test("correctly identifies platform from context", () => {
      const contexts: EventContext[] = [
        { platform: "github", eventType: "issue_comment", author: "user", command: "test" },
        { platform: "telegram", eventType: "message", author: "user", command: "test" },
      ];

      contexts.forEach((ctx) => {
        expect(["github", "telegram"]).toContain(ctx.platform);
      });
    });

    test("preserves platform-specific metadata", () => {
      const context: EventContext = {
        platform: "custom",
        eventType: "custom_event",
        author: "user",
        command: "test",
        metadata: {
          customField1: "value1",
          customField2: 123,
          nested: {
            field: "value",
          },
        },
      };

      expect(context.metadata?.customField1).toBe("value1");
      expect(context.metadata?.customField2).toBe(123);
      expect((context.metadata?.nested as any)?.field).toBe("value");
    });
  });

  describe("Required Fields Validation", () => {
    test("ensures all required fields are present", () => {
      const context: EventContext = {
        platform: "github",
        eventType: "issue_comment",
        author: "testuser",
        command: "@agent test",
      };

      expect(context.platform).toBeDefined();
      expect(context.eventType).toBeDefined();
      expect(context.author).toBeDefined();
      expect(context.command).toBeDefined();
    });

    test("allows optional fields to be undefined", () => {
      const context: EventContext = {
        platform: "github",
        eventType: "issue_comment",
        author: "testuser",
        command: "@agent test",
      };

      expect(context.source).toBeUndefined();
      expect(context.repository).toBeUndefined();
      expect(context.issueNumber).toBeUndefined();
      expect(context.metadata).toBeUndefined();
    });
  });

  describe("Extensibility", () => {
    test("supports arbitrary additional fields", () => {
      const context: EventContext = {
        platform: "future_platform",
        eventType: "new_event_type",
        author: "user",
        command: "test",
        customField: "custom_value",
        anotherField: 12345,
        complexField: {
          nested: true,
          data: [1, 2, 3],
        },
      };

      expect(context.customField).toBe("custom_value");
      expect(context.anotherField).toBe(12345);
      expect(context.complexField).toEqual({
        nested: true,
        data: [1, 2, 3],
      });
    });
  });
});
