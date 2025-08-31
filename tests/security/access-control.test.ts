import { describe, expect, it, beforeEach, afterEach } from '@jest/globals';
import {
  AccessMode,
  getAccessMode,
  getPlatformPAT,
  validatePlatformCredentials,
  getAccessControlConfig,
} from '../../src/security/access-control';

describe('Access Control', () => {
  // Store original environment
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Reset environment before each test
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original environment after each test
    process.env = originalEnv;
  });

  describe('getAccessMode', () => {
    it('should return READ_ONLY when explicitly set', () => {
      process.env.ACCESS_MODE = 'read-only';
      process.env.USER_PAT = 'some-token';

      expect(getAccessMode()).toBe(AccessMode.READ_ONLY);
    });

    it('should return FULL when PAT is present and not read-only', () => {
      delete process.env.ACCESS_MODE;
      process.env.USER_PAT = 'some-token';

      expect(getAccessMode()).toBe(AccessMode.FULL);
    });

    it('should return FULL when GITHUB_PAT is present', () => {
      delete process.env.ACCESS_MODE;
      delete process.env.USER_PAT;
      process.env.GITHUB_PAT = 'github-token';

      expect(getAccessMode()).toBe(AccessMode.FULL);
    });

    it('should return READ_ONLY when no PAT is present', () => {
      delete process.env.ACCESS_MODE;
      delete process.env.USER_PAT;
      delete process.env.GITHUB_PAT;

      expect(getAccessMode()).toBe(AccessMode.READ_ONLY);
    });
  });

  describe('getPlatformPAT', () => {
    it('should return GITHUB_PAT for github platform', () => {
      process.env.GITHUB_PAT = 'github-specific-token';
      process.env.USER_PAT = 'fallback-token';

      expect(getPlatformPAT('github')).toBe('github-specific-token');
    });

    it('should fallback to USER_PAT for github if GITHUB_PAT not present', () => {
      delete process.env.GITHUB_PAT;
      process.env.USER_PAT = 'fallback-token';

      expect(getPlatformPAT('github')).toBe('fallback-token');
    });

    it('should return TELEGRAM_BOT_TOKEN for telegram platform', () => {
      process.env.TELEGRAM_BOT_TOKEN = 'telegram-token';

      expect(getPlatformPAT('telegram')).toBe('telegram-token');
    });

    it('should return DISCORD_BOT_TOKEN for discord platform', () => {
      process.env.DISCORD_BOT_TOKEN = 'discord-token';

      expect(getPlatformPAT('discord')).toBe('discord-token');
    });

    it('should return SLACK_APP_TOKEN for slack platform', () => {
      process.env.SLACK_APP_TOKEN = 'slack-token';

      expect(getPlatformPAT('slack')).toBe('slack-token');
    });

    it('should return undefined for unknown platform', () => {
      expect(getPlatformPAT('unknown')).toBeUndefined();
    });
  });

  describe('validatePlatformCredentials', () => {
    it('should return true when credentials exist', () => {
      process.env.GITHUB_PAT = 'token';

      expect(validatePlatformCredentials('github')).toBe(true);
    });

    it('should return false when credentials are missing', () => {
      delete process.env.GITHUB_PAT;
      delete process.env.USER_PAT;

      expect(validatePlatformCredentials('github')).toBe(false);
    });

    it('should validate telegram credentials', () => {
      process.env.TELEGRAM_BOT_TOKEN = 'bot-token';

      expect(validatePlatformCredentials('telegram')).toBe(true);
    });

    it('should return false for unknown platform', () => {
      expect(validatePlatformCredentials('unknown')).toBe(false);
    });
  });

  describe('getAccessControlConfig', () => {
    it('should return full config for github with full access', () => {
      process.env.GITHUB_PAT = 'github-token';
      delete process.env.ACCESS_MODE;

      const config = getAccessControlConfig('github');

      expect(config.platform).toBe('github');
      expect(config.mode).toBe(AccessMode.FULL);
      expect(config.pat).toBe('github-token');
    });

    it('should return read-only config when set', () => {
      process.env.GITHUB_PAT = 'github-token';
      process.env.ACCESS_MODE = 'read-only';

      const config = getAccessControlConfig('github');

      expect(config.platform).toBe('github');
      expect(config.mode).toBe(AccessMode.READ_ONLY);
      expect(config.pat).toBe('github-token');
    });

    it('should return config for telegram', () => {
      process.env.TELEGRAM_BOT_TOKEN = 'telegram-token';

      const config = getAccessControlConfig('telegram');

      expect(config.platform).toBe('telegram');
      expect(config.mode).toBe(AccessMode.READ_ONLY); // No PAT, defaults to read-only
      expect(config.pat).toBe('telegram-token');
    });

    it('should handle missing credentials', () => {
      delete process.env.GITHUB_PAT;
      delete process.env.USER_PAT;

      const config = getAccessControlConfig('github');

      expect(config.platform).toBe('github');
      expect(config.mode).toBe(AccessMode.READ_ONLY);
      expect(config.pat).toBeUndefined();
    });
  });
});