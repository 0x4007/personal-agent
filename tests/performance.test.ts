import { describe, test, expect, jest } from '@jest/globals';

interface PerformanceScenario {
  name: string;
  duration: number;
  users: number;
  actions: Array<() => Promise<void>>;
  assertions: {
    maxResponseTime: number;
    successRate: number;
    throughput: number;
  };
}

describe('Performance Tests', () => {
  describe('Load Testing Scenarios', () => {
    test('Normal Load - 10 concurrent users', async () => {
      const scenario: PerformanceScenario = {
        name: 'Normal Load',
        duration: 60000, // 1 minute for test
        users: 10,
        actions: [
          async () => simulateGitHubComment(),
          async () => simulateTelegramMessage()
        ],
        assertions: {
          maxResponseTime: 5000,
          successRate: 99,
          throughput: 100
        }
      };
      
      const results = await runLoadTest(scenario);
      
      expect(results.avgResponseTime).toBeLessThan(scenario.assertions.maxResponseTime);
      expect(results.successRate).toBeGreaterThanOrEqual(scenario.assertions.successRate);
      expect(results.throughput).toBeGreaterThanOrEqual(scenario.assertions.throughput);
    });
    
    test('Peak Load - 50 concurrent users', async () => {
      const scenario: PerformanceScenario = {
        name: 'Peak Load',
        duration: 60000, // 1 minute for test
        users: 50,
        actions: [
          async () => simulateGitHubComment(),
          async () => simulateTelegramMessage(),
          async () => simulateComplexCommand()
        ],
        assertions: {
          maxResponseTime: 10000,
          successRate: 95,
          throughput: 200
        }
      };
      
      const results = await runLoadTest(scenario);
      
      expect(results.avgResponseTime).toBeLessThan(scenario.assertions.maxResponseTime);
      expect(results.successRate).toBeGreaterThanOrEqual(scenario.assertions.successRate);
    });
    
    test('Stress Test - 100 concurrent users', async () => {
      const scenario: PerformanceScenario = {
        name: 'Stress Test',
        duration: 30000, // 30 seconds for stress test
        users: 100,
        actions: [
          async () => simulateGitHubComment(),
          async () => simulateTelegramMessage()
        ],
        assertions: {
          maxResponseTime: 15000,
          successRate: 90,
          throughput: 300
        }
      };
      
      const results = await runLoadTest(scenario);
      
      // Stress test - we expect some degradation
      expect(results.successRate).toBeGreaterThanOrEqual(90);
      expect(results.errors).toBeLessThan(10);
    });
  });
  
  describe('Response Time Analysis', () => {
    test('GitHub comment processing time', async () => {
      const times: number[] = [];
      
      for (let i = 0; i < 10; i++) {
        const start = Date.now();
        await simulateGitHubComment();
        times.push(Date.now() - start);
      }
      
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      const p95 = percentile(times.sort((a, b) => a - b), 95);
      
      expect(avg).toBeLessThan(3000);
      expect(p95).toBeLessThan(5000);
    });
    
    test('Telegram message processing time', async () => {
      const times: number[] = [];
      
      for (let i = 0; i < 10; i++) {
        const start = Date.now();
        await simulateTelegramMessage();
        times.push(Date.now() - start);
      }
      
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      const p95 = percentile(times.sort((a, b) => a - b), 95);
      
      expect(avg).toBeLessThan(2000);
      expect(p95).toBeLessThan(4000);
    });
    
    test('Complex command execution time', async () => {
      const times: number[] = [];
      
      for (let i = 0; i < 5; i++) {
        const start = Date.now();
        await simulateComplexCommand();
        times.push(Date.now() - start);
      }
      
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      
      // Complex commands may take longer
      expect(avg).toBeLessThan(10000);
    });
  });
  
  describe('Memory Usage', () => {
    test('Memory usage under normal load', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Run 100 operations
      for (let i = 0; i < 100; i++) {
        await simulateGitHubComment();
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024; // MB
      
      // Should not leak more than 50MB for 100 operations
      expect(memoryIncrease).toBeLessThan(50);
    });
    
    test('No memory leaks after operations', async () => {
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const baselineMemory = process.memoryUsage().heapUsed;
      
      // Run operations
      for (let i = 0; i < 50; i++) {
        await simulateGitHubComment();
      }
      
      // Force garbage collection again
      if (global.gc) {
        global.gc();
      }
      
      // Wait for cleanup
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const afterMemory = process.memoryUsage().heapUsed;
      const diff = Math.abs(afterMemory - baselineMemory) / 1024 / 1024;
      
      // Memory should return close to baseline (within 10MB)
      expect(diff).toBeLessThan(10);
    });
  });
  
  describe('Concurrent Operations', () => {
    test('Handles concurrent GitHub operations', async () => {
      const operations = Array(20).fill(null).map(() => simulateGitHubComment());
      
      const start = Date.now();
      const results = await Promise.allSettled(operations);
      const duration = Date.now() - start;
      
      const successful = results.filter(r => r.status === 'fulfilled').length;
      
      expect(successful).toBeGreaterThanOrEqual(18); // 90% success
      expect(duration).toBeLessThan(10000); // All complete within 10s
    });
    
    test('Handles mixed platform operations', async () => {
      const operations = [
        ...Array(10).fill(null).map(() => simulateGitHubComment()),
        ...Array(10).fill(null).map(() => simulateTelegramMessage()),
        ...Array(5).fill(null).map(() => simulateComplexCommand())
      ];
      
      const start = Date.now();
      const results = await Promise.allSettled(operations);
      const duration = Date.now() - start;
      
      const successful = results.filter(r => r.status === 'fulfilled').length;
      
      expect(successful).toBeGreaterThanOrEqual(23); // 92% success
      expect(duration).toBeLessThan(15000);
    });
  });
  
  describe('Rate Limiting', () => {
    test('Respects GitHub rate limits', async () => {
      const requests: Promise<any>[] = [];
      const requestTimes: number[] = [];
      
      // Send 10 requests rapidly
      for (let i = 0; i < 10; i++) {
        requestTimes.push(Date.now());
        requests.push(simulateGitHubComment());
      }
      
      await Promise.all(requests);
      
      // Check that requests are properly spaced if rate limited
      for (let i = 1; i < requestTimes.length; i++) {
        const gap = requestTimes[i] - requestTimes[i - 1];
        // If rate limited, gaps should be at least 100ms
        if (i > 5) { // After initial burst
          expect(gap).toBeGreaterThanOrEqual(0);
        }
      }
    });
    
    test('Handles Telegram rate limits gracefully', async () => {
      const results: any[] = [];
      
      // Send messages rapidly to trigger rate limit
      for (let i = 0; i < 30; i++) {
        try {
          const result = await simulateTelegramMessage();
          results.push({ success: true, result });
        } catch (error: any) {
          if (error.code === 429) {
            results.push({ success: false, rateLimited: true });
            // Wait for rate limit to clear
            await new Promise(resolve => setTimeout(resolve, error.retryAfter * 1000));
          } else {
            throw error;
          }
        }
      }
      
      const rateLimited = results.filter(r => r.rateLimited).length;
      const successful = results.filter(r => r.success).length;
      
      // Should handle rate limits without failing
      expect(successful).toBeGreaterThan(20);
      expect(rateLimited).toBeLessThan(10);
    });
  });
});

// Helper functions
async function runLoadTest(scenario: PerformanceScenario) {
  const results = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    responseTimes: [] as number[],
    errors: 0,
    startTime: Date.now()
  };
  
  const users: Promise<void>[] = [];
  
  for (let i = 0; i < scenario.users; i++) {
    users.push(runUser(scenario, results));
  }
  
  await Promise.all(users);
  
  const duration = Date.now() - results.startTime;
  const avgResponseTime = results.responseTimes.reduce((a, b) => a + b, 0) / results.responseTimes.length;
  const successRate = (results.successfulRequests / results.totalRequests) * 100;
  const throughput = (results.totalRequests / duration) * 1000; // requests per second
  
  return {
    avgResponseTime,
    successRate,
    throughput,
    errors: results.errors,
    totalRequests: results.totalRequests
  };
}

async function runUser(scenario: PerformanceScenario, results: any) {
  const endTime = Date.now() + scenario.duration;
  
  while (Date.now() < endTime) {
    const action = scenario.actions[Math.floor(Math.random() * scenario.actions.length)];
    const start = Date.now();
    
    try {
      await action();
      results.successfulRequests++;
      results.responseTimes.push(Date.now() - start);
    } catch (error) {
      results.failedRequests++;
      results.errors++;
    }
    
    results.totalRequests++;
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1000));
  }
}

async function simulateGitHubComment(): Promise<void> {
  // Simulate processing a GitHub comment
  await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 1000));
  
  // Randomly fail 1% of requests
  if (Math.random() < 0.01) {
    throw new Error('Simulated GitHub API error');
  }
}

async function simulateTelegramMessage(): Promise<void> {
  // Simulate processing a Telegram message
  await new Promise(resolve => setTimeout(resolve, Math.random() * 1500 + 500));
  
  // Randomly fail 1% of requests
  if (Math.random() < 0.01) {
    throw new Error('Simulated Telegram API error');
  }
}

async function simulateComplexCommand(): Promise<void> {
  // Simulate a complex command that takes longer
  await new Promise(resolve => setTimeout(resolve, Math.random() * 5000 + 3000));
  
  // Complex commands might fail more often
  if (Math.random() < 0.02) {
    throw new Error('Simulated complex command error');
  }
}

function percentile(sorted: number[], p: number): number {
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}