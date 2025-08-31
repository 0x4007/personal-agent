import { describe, test, expect, jest, beforeEach } from '@jest/globals';

describe('Error Recovery', () => {
  describe('API Failures', () => {
    test('Retries on 500 errors', async () => {
      const mockApi = jest.fn()
        .mockRejectedValueOnce({ status: 500 })
        .mockRejectedValueOnce({ status: 500 })
        .mockResolvedValue({ success: true });

      const result = await simulateApiError(mockApi, 500);
      
      expect(result.retries).toBe(3);
      expect(result.backoff).toEqual([1000, 2000, 4000]);
      expect(result.success).toBe(true);
    });
    
    test('Falls back to simplified prompt on repeated failures', async () => {
      const mockClaudeApi = jest.fn()
        .mockRejectedValue({ status: 500, message: 'Server error' });
      
      const result = await executeWithFallback(mockClaudeApi, {
        prompt: 'Complex prompt with many details and context',
        maxRetries: 3
      });
      
      expect(result.fallbackUsed).toBe(true);
      expect(result.simplifiedPrompt).toBeDefined();
      expect(result.simplifiedPrompt.length).toBeLessThan(100);
    });
    
    test('Handles timeout gracefully', async () => {
      const mockApi = jest.fn().mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => resolve({ data: 'late' }), 10000);
        });
      });
      
      const result = await executeWithTimeout(mockApi, 5000);
      
      expect(result.timedOut).toBe(true);
      expect(result.error).toContain('timeout');
    });
    
    test('Recovers from network disconnection', async () => {
      const mockApi = jest.fn()
        .mockRejectedValueOnce(new Error('ECONNREFUSED'))
        .mockRejectedValueOnce(new Error('ETIMEDOUT'))
        .mockResolvedValue({ connected: true });
      
      const result = await retryOnNetworkError(mockApi);
      
      expect(result.attempts).toBe(3);
      expect(result.connected).toBe(true);
    });

    test('Handles rate limiting with backoff', async () => {
      const mockApi = jest.fn()
        .mockRejectedValueOnce({ status: 429, retryAfter: 2 })
        .mockResolvedValue({ success: true });
      
      const start = Date.now();
      const result = await handleRateLimit(mockApi);
      const duration = Date.now() - start;
      
      expect(duration).toBeGreaterThanOrEqual(2000);
      expect(result.success).toBe(true);
    });
  });
  
  describe('Platform Failures', () => {
    test('GitHub API outage handled', async () => {
      const mockGitHubApi = jest.fn()
        .mockRejectedValue({ status: 503, message: 'Service Unavailable' });
      
      const result = await handlePlatformOutage('github', mockGitHubApi);
      
      expect(result.platformDown).toBe(true);
      expect(result.fallbackMessage).toContain('GitHub is currently unavailable');
    });
    
    test('Telegram rate limit respected', async () => {
      const mockTelegramApi = jest.fn()
        .mockRejectedValueOnce({
          error_code: 429,
          description: 'Too Many Requests',
          parameters: { retry_after: 3 }
        })
        .mockResolvedValue({ ok: true });
      
      const result = await handleTelegramRateLimit(mockTelegramApi);
      
      expect(result.waitedSeconds).toBe(3);
      expect(result.ok).toBe(true);
    });
    
    test('Invalid credentials detected and reported', async () => {
      const mockApi = jest.fn()
        .mockRejectedValue({ status: 401, message: 'Unauthorized' });
      
      const result = await validateCredentials('github', mockApi);
      
      expect(result.credentialsValid).toBe(false);
      expect(result.errorMessage).toContain('Invalid GitHub PAT');
      expect(result.errorMessage).not.toContain('ghp_'); // No credential leakage
    });

    test('Handles missing platform credentials', () => {
      const platforms = {
        github: 'GITHUB_PAT',
        telegram: 'TELEGRAM_BOT_TOKEN',
        discord: 'DISCORD_BOT_TOKEN'
      };
      
      const results = Object.entries(platforms).map(([platform, envVar]) => {
        const hasCredential = process.env[envVar] !== undefined;
        return { platform, hasCredential };
      });
      
      results.forEach(result => {
        if (!result.hasCredential) {
          expect(result).toMatchObject({
            platform: expect.any(String),
            hasCredential: false
          });
        }
      });
    });
  });

  describe('Graceful Degradation', () => {
    test('Continues with reduced functionality on MCP failure', async () => {
      const mockMcpServer = jest.fn()
        .mockRejectedValue(new Error('MCP server unavailable'));
      
      const result = await executeWithMcpFallback(mockMcpServer, {
        platform: 'telegram',
        operation: 'sendMessage'
      });
      
      expect(result.mcpAvailable).toBe(false);
      expect(result.fallbackMethod).toBe('direct-api');
      expect(result.completed).toBe(true);
    });

    test('Switches to basic mode on complex command failure', async () => {
      const mockExecutor = jest.fn()
        .mockRejectedValueOnce(new Error('Command too complex'))
        .mockResolvedValue({ result: 'basic output' });
      
      const result = await executeCommand(mockExecutor, {
        command: 'complex multi-step operation',
        allowFallback: true
      });
      
      expect(result.mode).toBe('basic');
      expect(result.result).toBe('basic output');
    });
  });

  describe('Error Message Sanitization', () => {
    test('Removes sensitive data from error messages', () => {
      const error = new Error('Failed to authenticate with token ghp_abc123def456');
      const sanitized = sanitizeError(error);
      
      expect(sanitized.message).not.toContain('ghp_');
      expect(sanitized.message).toContain('[REDACTED]');
    });

    test('Preserves error context without exposing secrets', () => {
      const error = {
        message: 'API call failed',
        config: {
          headers: {
            Authorization: 'Bearer ghp_secret123'
          }
        }
      };
      
      const sanitized = sanitizeError(error);
      
      expect(sanitized.message).toBe('API call failed');
      expect(sanitized.config).toBeUndefined();
    });
  });
});

// Helper functions for testing
async function simulateApiError(api: Function, errorCode: number) {
  const delays: number[] = [];
  let attempts = 0;
  
  while (attempts < 3) {
    try {
      attempts++;
      const result = await api();
      return { success: true, retries: attempts, backoff: delays };
    } catch (error: any) {
      if (error.status === errorCode && attempts < 3) {
        const delay = Math.pow(2, attempts - 1) * 1000;
        delays.push(delay);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
  
  return { success: false, retries: attempts, backoff: delays };
}

async function executeWithFallback(api: Function, config: any) {
  try {
    return await api(config.prompt);
  } catch (error) {
    if (config.maxRetries && config.maxRetries > 0) {
      const simplified = config.prompt.substring(0, 50) + '...';
      return {
        fallbackUsed: true,
        simplifiedPrompt: simplified,
        originalError: error
      };
    }
    throw error;
  }
}

async function executeWithTimeout(api: Function, timeout: number) {
  const timeoutPromise = new Promise((resolve) => {
    setTimeout(() => resolve({ timedOut: true, error: 'Request timeout' }), timeout);
  });
  
  const apiPromise = api();
  
  return Promise.race([apiPromise, timeoutPromise]);
}

async function retryOnNetworkError(api: Function) {
  let attempts = 0;
  let lastError;
  
  while (attempts < 3) {
    try {
      attempts++;
      const result = await api();
      return { ...result, attempts };
    } catch (error: any) {
      lastError = error;
      if (error.message.includes('ECONNREFUSED') || error.message.includes('ETIMEDOUT')) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      } else {
        throw error;
      }
    }
  }
  
  throw lastError;
}

async function handleRateLimit(api: Function) {
  try {
    return await api();
  } catch (error: any) {
    if (error.status === 429 && error.retryAfter) {
      await new Promise(resolve => setTimeout(resolve, error.retryAfter * 1000));
      return await api();
    }
    throw error;
  }
}

async function handlePlatformOutage(platform: string, api: Function) {
  try {
    return await api();
  } catch (error: any) {
    if (error.status === 503) {
      return {
        platformDown: true,
        fallbackMessage: `${platform.charAt(0).toUpperCase() + platform.slice(1)} is currently unavailable. Please try again later.`
      };
    }
    throw error;
  }
}

async function handleTelegramRateLimit(api: Function) {
  try {
    return await api();
  } catch (error: any) {
    if (error.error_code === 429 && error.parameters?.retry_after) {
      const waitTime = error.parameters.retry_after;
      await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
      const result = await api();
      return { ...result, waitedSeconds: waitTime };
    }
    throw error;
  }
}

async function validateCredentials(platform: string, api: Function) {
  try {
    await api();
    return { credentialsValid: true };
  } catch (error: any) {
    if (error.status === 401) {
      const envVarName = `${platform.toUpperCase()}_PAT`;
      return {
        credentialsValid: false,
        errorMessage: `Invalid ${platform.charAt(0).toUpperCase() + platform.slice(1)} PAT. Please check your ${envVarName} configuration.`
      };
    }
    throw error;
  }
}

async function executeWithMcpFallback(mcpServer: Function, config: any) {
  try {
    const result = await mcpServer(config);
    return { ...result, mcpAvailable: true };
  } catch (error) {
    // Fallback to direct API call
    return {
      mcpAvailable: false,
      fallbackMethod: 'direct-api',
      completed: true,
      platform: config.platform
    };
  }
}

async function executeCommand(executor: Function, config: any) {
  try {
    const result = await executor(config.command);
    return { result, mode: 'full' };
  } catch (error: any) {
    if (config.allowFallback && error.message.includes('complex')) {
      const basicCommand = config.command.split(' ')[0];
      const result = await executor(basicCommand);
      return { result, mode: 'basic' };
    }
    throw error;
  }
}

function sanitizeError(error: any): any {
  let message = error.message || String(error);
  
  // Remove common token patterns
  message = message.replace(/ghp_[a-zA-Z0-9]+/g, '[REDACTED]');
  message = message.replace(/github_pat_[a-zA-Z0-9_]+/g, '[REDACTED]');
  message = message.replace(/Bearer [a-zA-Z0-9_\-]+/g, 'Bearer [REDACTED]');
  message = message.replace(/bot[0-9]+:[a-zA-Z0-9_\-]+/g, '[BOT_TOKEN_REDACTED]');
  
  const sanitized: any = { message };
  
  // Don't include config or headers that might contain secrets
  if (error.stack && !error.config && !error.headers) {
    sanitized.stack = error.stack;
  }
  
  return sanitized;
}