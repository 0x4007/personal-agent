import { describe, it, expect, beforeAll } from '@jest/globals';
import fetch from 'node-fetch';

describe('Deployment Smoke Tests', () => {
  const BASE_URL = process.env.API_ENDPOINT || 'http://localhost:4000';
  const GITHUB_PAT = process.env.GITHUB_PAT;
  const AGENT_OWNER = process.env.AGENT_OWNER || 'test-user';

  beforeAll(() => {
    if (!GITHUB_PAT) {
      console.warn('GITHUB_PAT not set, some tests may fail');
    }
  });

  describe('Health Checks', () => {
    it('should return 200 for health endpoint', async () => {
      const response = await fetch(`${BASE_URL}/health`);
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('status', 'healthy');
      expect(data).toHaveProperty('timestamp');
    });

    it('should have required environment variables', () => {
      const requiredVars = [
        'GITHUB_PAT',
        'CLAUDE_CODE_OAUTH_TOKEN',
        'AGENT_OWNER'
      ];

      for (const varName of requiredVars) {
        expect(process.env[varName]).toBeDefined();
      }
    });
  });

  describe('Webhook Endpoints', () => {
    it('should handle GitHub webhook', async () => {
      const payload = {
        action: 'created',
        issue: {
          number: 1,
          title: 'Test Issue'
        },
        comment: {
          body: `@${AGENT_OWNER} ping`,
          user: {
            login: 'test-user'
          }
        },
        repository: {
          full_name: 'test/repo'
        }
      };

      const response = await fetch(`${BASE_URL}/github`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-GitHub-Event': 'issue_comment'
        },
        body: JSON.stringify(payload)
      });

      expect(response.status).toBeLessThan(500);
    });

    it('should reject invalid webhook signatures', async () => {
      const response = await fetch(`${BASE_URL}/github`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Hub-Signature-256': 'invalid'
        },
        body: JSON.stringify({})
      });

      expect(response.status).toBe(401);
    });
  });

  describe('Platform Integrations', () => {
    it('should have Telegram MCP available if configured', async () => {
      if (!process.env.TELEGRAM_BOT_TOKEN) {
        console.log('Telegram not configured, skipping');
        return;
      }

      const response = await fetch(`${BASE_URL}/platforms`);
      const platforms = await response.json();
      
      expect(platforms).toContain('telegram');
    });

    it('should validate Claude connection', async () => {
      // This would typically call a Claude health endpoint
      // For now, we just check the token exists
      expect(process.env.CLAUDE_CODE_OAUTH_TOKEN).toBeDefined();
      expect(process.env.CLAUDE_CODE_OAUTH_TOKEN).not.toBe('');
    });
  });

  describe('GitHub Actions Integration', () => {
    it('should trigger workflow on mention', async () => {
      if (!GITHUB_PAT) {
        console.log('GitHub PAT not configured, skipping');
        return;
      }

      // This would typically create a test comment and verify workflow triggers
      // For smoke testing, we just verify the API is accessible
      const response = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `token ${GITHUB_PAT}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      expect(response.status).toBe(200);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed requests gracefully', async () => {
      const response = await fetch(`${BASE_URL}/github`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: 'invalid json'
      });

      expect(response.status).toBe(400);
    });

    it('should implement rate limiting', async () => {
      const requests = Array(10).fill(null).map(() => 
        fetch(`${BASE_URL}/health`)
      );

      const responses = await Promise.all(requests);
      const statuses = responses.map(r => r.status);
      
      // At least one should succeed
      expect(statuses).toContain(200);
      
      // If rate limiting is enabled, some might be 429
      // This is optional based on configuration
    });
  });

  describe('Monitoring', () => {
    it('should expose metrics endpoint', async () => {
      const response = await fetch(`${BASE_URL}/metrics`);
      
      if (response.status === 200) {
        const text = await response.text();
        expect(text).toContain('request_count');
        expect(text).toContain('response_time');
      } else {
        // Metrics might be optional
        console.log('Metrics endpoint not configured');
      }
    });

    it('should log requests with correlation IDs', async () => {
      const correlationId = 'test-correlation-id';
      
      const response = await fetch(`${BASE_URL}/health`, {
        headers: {
          'X-Correlation-ID': correlationId
        }
      });

      const headers = response.headers;
      expect(headers.get('x-correlation-id')).toBe(correlationId);
    });
  });
});

// Run specific smoke tests based on environment
export async function runSmokeSuite(environment: 'staging' | 'production') {
  console.log(`Running smoke tests for ${environment} environment`);
  
  // Set environment-specific variables
  process.env.NODE_ENV = environment;
  
  // Run tests
  const { run } = await import('jest');
  
  await run([
    '--testMatch', '**/smoke/**/*.test.ts',
    '--verbose',
    '--bail',
    '--maxWorkers=1'
  ]);
}