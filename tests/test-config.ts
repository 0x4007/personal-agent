export const TEST_CONFIG = {
  unit: {
    coverage: {
      threshold: 80,
      reporters: ['text', 'lcov', 'html'],
      exclude: ['**/*.test.ts', '**/node_modules/**', '**/dist/**', '**/tests/**']
    }
  },
  integration: {
    timeout: 30000,
    retries: 2,
    parallel: false
  },
  e2e: {
    timeout: 60000,
    headless: true,
    slowMo: 0
  },
  performance: {
    duration: 300000, // 5 minutes
    concurrency: 10,
    rampUp: 60000    // 1 minute
  }
};