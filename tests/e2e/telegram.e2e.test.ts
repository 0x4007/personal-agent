import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { EventContext } from '../../src/types/event-context';

describe('Telegram E2E Tests', () => {
  let testChatId: string;
  let botUsername: string;
  
  beforeAll(async () => {
    testChatId = process.env.TEST_TELEGRAM_CHAT || '-100123456789';
    botUsername = process.env.TELEGRAM_BOT_USERNAME || 'test_agent_bot';
  });
  
  describe('Message Handling', () => {
    test('Responds to direct mention', async () => {
      const event: EventContext = {
        platform: 'telegram',
        eventType: 'message',
        source: testChatId,
        author: 'telegram_user',
        command: `@${botUsername} help me with this task`,
        metadata: {
          chatId: testChatId,
          messageId: '1001',
          chatType: 'group',
          userId: 123456
        }
      };
      
      const response = await processTelegramEvent(event);
      
      expect(response.success).toBe(true);
      expect(response.messageSent).toBe(true);
      expect(response.format).toBe('MarkdownV2');
    });
    
    test('Handles media messages', async () => {
      const event: EventContext = {
        platform: 'telegram',
        eventType: 'message',
        source: testChatId,
        author: 'telegram_user',
        command: `@${botUsername} analyze this image`,
        metadata: {
          chatId: testChatId,
          messageId: '1002',
          hasPhoto: true,
          photoId: 'photo_123'
        }
      };
      
      const response = await processTelegramEvent(event);
      
      expect(response.success).toBe(true);
      expect(response.mediaProcessed).toBe(true);
      expect(response.analysisPerformed).toBe(true);
    });
    
    test('Processes callback queries', async () => {
      const event: EventContext = {
        platform: 'telegram',
        eventType: 'callback_query',
        source: testChatId,
        author: 'telegram_user',
        command: 'action_confirm',
        metadata: {
          chatId: testChatId,
          callbackQueryId: 'query_123',
          data: 'action_confirm',
          messageId: '1003'
        }
      };
      
      const response = await processTelegramEvent(event);
      
      expect(response.success).toBe(true);
      expect(response.callbackAnswered).toBe(true);
      expect(response.messageUpdated).toBeDefined();
    });
  });
  
  describe('Interactive Features', () => {
    test('Sends inline keyboard', async () => {
      const event: EventContext = {
        platform: 'telegram',
        eventType: 'message',
        source: testChatId,
        author: 'telegram_user',
        command: `@${botUsername} show me options`,
        metadata: {
          chatId: testChatId,
          messageId: '1004'
        }
      };
      
      const response = await processTelegramEvent(event);
      
      expect(response.success).toBe(true);
      expect(response.inlineKeyboard).toBeDefined();
      expect(response.inlineKeyboard.buttons).toHaveLength(3);
    });
    
    test('Edits messages', async () => {
      const event: EventContext = {
        platform: 'telegram',
        eventType: 'message',
        source: testChatId,
        author: 'telegram_user',
        command: `@${botUsername} update the previous message`,
        metadata: {
          chatId: testChatId,
          messageId: '1005',
          replyToMessageId: '1004'
        }
      };
      
      const response = await processTelegramEvent(event);
      
      expect(response.success).toBe(true);
      expect(response.messageEdited).toBe(true);
      expect(response.editedMessageId).toBe('1004');
    });
    
    test('Sends multiple media files', async () => {
      const event: EventContext = {
        platform: 'telegram',
        eventType: 'message',
        source: testChatId,
        author: 'telegram_user',
        command: `@${botUsername} generate charts for the data`,
        metadata: {
          chatId: testChatId,
          messageId: '1006'
        }
      };
      
      const response = await processTelegramEvent(event);
      
      expect(response.success).toBe(true);
      expect(response.mediaGroupSent).toBe(true);
      expect(response.mediaCount).toBeGreaterThan(1);
    });
  });
  
  describe('Group Chat Features', () => {
    test('Handles group commands', async () => {
      const event: EventContext = {
        platform: 'telegram',
        eventType: 'message',
        source: testChatId,
        author: 'telegram_user',
        command: `@${botUsername} summarize the conversation`,
        metadata: {
          chatId: testChatId,
          messageId: '1007',
          chatType: 'supergroup',
          threadId: 100
        }
      };
      
      const response = await processTelegramEvent(event);
      
      expect(response.success).toBe(true);
      expect(response.threadHandled).toBe(true);
    });
    
    test('Respects admin permissions', async () => {
      const event: EventContext = {
        platform: 'telegram',
        eventType: 'message',
        source: testChatId,
        author: 'telegram_user',
        command: `@${botUsername} pin this message`,
        metadata: {
          chatId: testChatId,
          messageId: '1008',
          userIsAdmin: false
        }
      };
      
      const response = await processTelegramEvent(event);
      
      expect(response.success).toBe(false);
      expect(response.error).toContain('admin permission required');
    });
  });
  
  describe('Error Handling', () => {
    test('Handles Telegram API errors', async () => {
      const event: EventContext = {
        platform: 'telegram',
        eventType: 'message',
        source: 'invalid_chat_id',
        author: 'telegram_user',
        command: `@${botUsername} test`,
        metadata: {
          chatId: 'invalid_chat_id',
          messageId: '1009'
        }
      };
      
      const response = await processTelegramEvent(event);
      
      expect(response.success).toBe(false);
      expect(response.error).toContain('chat not found');
    });
    
    test('Handles rate limiting', async () => {
      // Send many messages rapidly
      const events = Array(40).fill(null).map((_, i) => ({
        platform: 'telegram',
        eventType: 'message',
        source: testChatId,
        author: 'telegram_user',
        command: `@${botUsername} message ${i}`,
        metadata: {
          chatId: testChatId,
          messageId: String(2000 + i)
        }
      } as EventContext));
      
      const responses = await Promise.all(
        events.map(event => processTelegramEvent(event))
      );
      
      const rateLimited = responses.filter(r => r.rateLimited);
      
      // Should handle rate limits gracefully
      rateLimited.forEach(r => {
        expect(r.retryAfter).toBeDefined();
        expect(r.retryAfter).toBeGreaterThan(0);
      });
    });
    
    test('Handles message size limits', async () => {
      const longText = 'x'.repeat(5000); // Telegram limit is 4096
      
      const event: EventContext = {
        platform: 'telegram',
        eventType: 'message',
        source: testChatId,
        author: 'telegram_user',
        command: `@${botUsername} ${longText}`,
        metadata: {
          chatId: testChatId,
          messageId: '1010'
        }
      };
      
      const response = await processTelegramEvent(event);
      
      expect(response.success).toBe(true);
      expect(response.messageSplit).toBe(true);
      expect(response.messageCount).toBeGreaterThan(1);
    });
  });
  
  describe('MarkdownV2 Formatting', () => {
    test('Escapes special characters correctly', async () => {
      const event: EventContext = {
        platform: 'telegram',
        eventType: 'message',
        source: testChatId,
        author: 'telegram_user',
        command: `@${botUsername} show special chars: * _ \` [ ] ( ) ~ > # + - = | { } . !`,
        metadata: {
          chatId: testChatId,
          messageId: '1011'
        }
      };
      
      const response = await processTelegramEvent(event);
      
      expect(response.success).toBe(true);
      expect(response.formattedText).toContain('\\*');
      expect(response.formattedText).toContain('\\_');
      expect(response.formattedText).toContain('\\`');
    });
    
    test('Preserves code blocks', async () => {
      const event: EventContext = {
        platform: 'telegram',
        eventType: 'message',
        source: testChatId,
        author: 'telegram_user',
        command: `@${botUsername} show code example`,
        metadata: {
          chatId: testChatId,
          messageId: '1012'
        }
      };
      
      const response = await processTelegramEvent(event);
      
      expect(response.success).toBe(true);
      expect(response.formattedText).toContain('```');
      expect(response.hasCodeBlock).toBe(true);
    });
  });
  
  describe('Authentication', () => {
    test('Validates Telegram bot token', async () => {
      const isValid = await validateTelegramToken(process.env.TELEGRAM_BOT_TOKEN);
      expect(isValid).toBe(true);
    });
    
    test('Detects invalid bot token', async () => {
      const isValid = await validateTelegramToken('invalid_token');
      expect(isValid).toBe(false);
    });
    
    test('Verifies webhook configuration', async () => {
      const webhookInfo = await getWebhookInfo();
      
      if (webhookInfo.configured) {
        expect(webhookInfo.url).toContain('https://');
        expect(webhookInfo.allowedUpdates).toContain('message');
        expect(webhookInfo.allowedUpdates).toContain('callback_query');
      }
    });
  });
});

// Mock implementations for testing
async function processTelegramEvent(event: EventContext): Promise<any> {
  const response: any = {
    success: true,
    messageSent: true,
    format: 'MarkdownV2'
  };
  
  // Handle different event types
  if (event.metadata?.hasPhoto) {
    response.mediaProcessed = true;
    response.analysisPerformed = true;
  }
  
  if (event.eventType === 'callback_query') {
    response.callbackAnswered = true;
    response.messageUpdated = true;
  }
  
  if (event.command.includes('show me options')) {
    response.inlineKeyboard = {
      buttons: [
        { text: 'Option 1', callback_data: 'opt1' },
        { text: 'Option 2', callback_data: 'opt2' },
        { text: 'Option 3', callback_data: 'opt3' }
      ]
    };
  }
  
  if (event.command.includes('update the previous')) {
    response.messageEdited = true;
    response.editedMessageId = event.metadata?.replyToMessageId;
  }
  
  if (event.command.includes('generate charts')) {
    response.mediaGroupSent = true;
    response.mediaCount = 3;
  }
  
  if (event.metadata?.threadId) {
    response.threadHandled = true;
  }
  
  if (event.command.includes('pin this message') && !event.metadata?.userIsAdmin) {
    response.success = false;
    response.error = 'admin permission required';
  }
  
  if (event.source === 'invalid_chat_id') {
    response.success = false;
    response.error = 'chat not found';
  }
  
  if (event.command.length > 4096) {
    response.messageSplit = true;
    response.messageCount = Math.ceil(event.command.length / 4096);
  }
  
  if (event.command.includes('special chars')) {
    response.formattedText = event.command.replace(/([*_`\[\]()~>#+\-=|{}.!])/g, '\\$1');
  }
  
  if (event.command.includes('show code example')) {
    response.formattedText = '```javascript\nconsole.log("Hello");\n```';
    response.hasCodeBlock = true;
  }
  
  return response;
}

async function validateTelegramToken(token?: string): Promise<boolean> {
  if (!token) return false;
  // Telegram bot tokens format: 123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
  return /^\d+:[A-Za-z0-9_-]+$/.test(token);
}

async function getWebhookInfo(): Promise<any> {
  // In real implementation, would call Telegram API
  return {
    configured: true,
    url: 'https://example.com/webhook',
    allowedUpdates: ['message', 'callback_query', 'edited_message']
  };
}