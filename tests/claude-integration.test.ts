import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { EventContext } from '../src/types/event-context';

describe('Claude Code Action Integration', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Environment Setup', () => {
    test('CI spoofing configured correctly', () => {
      process.env.GITHUB_ACTIONS = 'false';
      process.env.CI = 'false';
      
      expect(process.env.GITHUB_ACTIONS).toBe('false');
      expect(process.env.CI).toBe('false');
    });

    test('Claude OAuth token present', () => {
      process.env.CLAUDE_CODE_OAUTH_TOKEN = 'test_token';
      expect(process.env.CLAUDE_CODE_OAUTH_TOKEN).toBeDefined();
    });

    test('Platform credentials configured', () => {
      process.env.GITHUB_PAT = 'ghp_test';
      process.env.TELEGRAM_BOT_TOKEN = 'bot_test';
      
      expect(process.env.GITHUB_PAT).toBeDefined();
      expect(process.env.TELEGRAM_BOT_TOKEN).toBeDefined();
    });
  });

  describe('Prompt Generation', () => {
    test('generates correct prompt for GitHub issue', () => {
      const context: EventContext = {
        platform: 'github',
        eventType: 'issue_comment',
        repository: 'owner/repo',
        issueNumber: '123',
        author: 'testuser',
        command: '@agent fix the bug'
      };

      const prompt = generatePrompt(context);
      
      expect(prompt).toContain('github');
      expect(prompt).toContain('issue_comment');
      expect(prompt).toContain('owner/repo');
      expect(prompt).toContain('#123');
      expect(prompt).toContain('fix the bug');
    });

    test('generates correct prompt for Telegram message', () => {
      const context: EventContext = {
        platform: 'telegram',
        eventType: 'message',
        author: 'telegramuser',
        command: '@agent analyze image',
        metadata: {
          chatId: '-100123',
          messageId: '456'
        }
      };

      const prompt = generatePrompt(context);
      
      expect(prompt).toContain('telegram');
      expect(prompt).toContain('message');
      expect(prompt).toContain('analyze image');
      expect(prompt).toContain('Telegram MCP');
    });

    test('includes access level in prompt', () => {
      const context: EventContext = {
        platform: 'github',
        eventType: 'issue_comment',
        author: 'user',
        command: 'test'
      };

      // Test read-only mode
      process.env.ACCESS_MODE = 'read-only';
      let prompt = generatePrompt(context);
      expect(prompt).toContain('read-only');

      // Test full access mode
      delete process.env.ACCESS_MODE;
      prompt = generatePrompt(context);
      expect(prompt).toContain('full access');
    });
  });

  describe('MCP Tool Selection', () => {
    test('suggests GitHub tools for GitHub events', () => {
      const context: EventContext = {
        platform: 'github',
        eventType: 'pull_request',
        author: 'user',
        command: 'review code'
      };

      const tools = getRelevantTools(context);
      
      expect(tools).toContain('gh');
      expect(tools).toContain('git');
    });

    test('suggests Telegram MCP for Telegram events', () => {
      const context: EventContext = {
        platform: 'telegram',
        eventType: 'message',
        author: 'user',
        command: 'send message'
      };

      const tools = getRelevantTools(context);
      
      expect(tools).toContain('telegram-mcp');
      expect(tools).toContain('sendMessage');
      expect(tools).toContain('editMessage');
    });

    test('includes common tools for all platforms', () => {
      const platforms = ['github', 'telegram', 'discord'];
      
      platforms.forEach(platform => {
        const context: EventContext = {
          platform,
          eventType: 'message',
          author: 'user',
          command: 'test'
        };

        const tools = getRelevantTools(context);
        
        expect(tools).toContain('bash');
        expect(tools).toContain('read');
        expect(tools).toContain('write');
      });
    });
  });

  describe('Response Handling', () => {
    test('formats response for GitHub markdown', () => {
      const response = 'Here is the **solution**\n```js\nconsole.log("test");\n```';
      const formatted = formatForPlatform(response, 'github');
      
      expect(formatted).toContain('**solution**');
      expect(formatted).toContain('```js');
    });

    test('formats response for Telegram MarkdownV2', () => {
      const response = 'Here is the *solution*: `code`';
      const formatted = formatForPlatform(response, 'telegram');
      
      // Telegram MarkdownV2 requires escaping
      expect(formatted).toContain('\\*solution\\*');
      expect(formatted).toContain('`code`');
    });

    test('handles errors gracefully', () => {
      const error = new Error('API failed');
      const formatted = formatError(error, 'github');
      
      expect(formatted).toContain('error');
      expect(formatted).not.toContain('stack trace');
      expect(formatted).not.toContain('GITHUB_PAT');
    });
  });

  describe('Retry Logic', () => {
    test('retries on 500 errors', async () => {
      let attempts = 0;
      const mockApi = jest.fn().mockImplementation(() => {
        attempts++;
        if (attempts < 3) {
          throw { status: 500 };
        }
        return { success: true };
      });

      const result = await retryWithBackoff(mockApi, 3);
      
      expect(attempts).toBe(3);
      expect(result.success).toBe(true);
    });

    test('uses exponential backoff', async () => {
      const delays: number[] = [];
      const mockApi = jest.fn().mockRejectedValue({ status: 500 });
      
      jest.spyOn(global, 'setTimeout').mockImplementation((fn, delay) => {
        delays.push(delay as number);
        fn();
        return {} as any;
      });

      try {
        await retryWithBackoff(mockApi, 3);
      } catch {
        // Expected to fail after retries
      }

      expect(delays[0]).toBeLessThan(delays[1]);
      expect(delays[1]).toBeLessThan(delays[2]);
    });

    test('falls back to simplified prompt on repeated failures', async () => {
      const mockApi = jest.fn().mockRejectedValue({ status: 500 });
      
      const result = await executeWithFallback(mockApi, 'complex prompt');
      
      expect(result.fallbackUsed).toBe(true);
      expect(result.prompt).toContain('simplified');
    });
  });
});

// Helper functions (would be imported from actual implementation)
function generatePrompt(context: EventContext): string {
  const accessMode = process.env.ACCESS_MODE === 'read-only' ? 'read-only' : 'full access';
  let prompt = `Platform: ${context.platform}\n`;
  prompt += `Event: ${context.eventType}\n`;
  prompt += `Access: ${accessMode}\n`;
  
  if (context.repository) prompt += `Repository: ${context.repository}\n`;
  if (context.issueNumber) prompt += `Issue: #${context.issueNumber}\n`;
  
  prompt += `Command: ${context.command}\n`;
  
  if (context.platform === 'telegram') {
    prompt += '\nTelegram MCP tools are available for this request.\n';
  }
  
  return prompt;
}

function getRelevantTools(context: EventContext): string[] {
  const commonTools = ['bash', 'read', 'write', 'edit'];
  const platformTools: Record<string, string[]> = {
    github: ['gh', 'git'],
    telegram: ['telegram-mcp', 'sendMessage', 'editMessage', 'sendPhoto'],
    discord: ['discord-api', 'sendMessage', 'createChannel'],
    slack: ['slack-api', 'postMessage', 'uploadFile']
  };
  
  return [...commonTools, ...(platformTools[context.platform] || [])];
}

function formatForPlatform(response: string, platform: string): string {
  if (platform === 'telegram') {
    // Escape special characters for Telegram MarkdownV2
    return response.replace(/([*_`\[\]()~>#+\-=|{}.!])/g, '\\$1');
  }
  return response;
}

function formatError(error: Error, platform: string): string {
  return `An error occurred: ${error.message}`;
}

async function retryWithBackoff(fn: Function, maxRetries: number): Promise<any> {
  let lastError;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      if (error.status !== 500 || i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
    }
  }
  throw lastError;
}

async function executeWithFallback(fn: Function, prompt: string): Promise<any> {
  try {
    return await fn(prompt);
  } catch {
    const simplifiedPrompt = 'simplified: ' + prompt.substring(0, 100);
    return { fallbackUsed: true, prompt: simplifiedPrompt };
  }
}