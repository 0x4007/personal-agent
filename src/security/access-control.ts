/**
 * Access Control Module
 * Manages access levels based on Personal Access Token (PAT) permissions
 * Security is handled at the PAT level, not through command filtering
 */

export enum AccessMode {
  FULL = 'full',
  READ_ONLY = 'read-only',
}

export interface AccessControlConfig {
  mode: AccessMode;
  pat?: string;
  platform: string;
}

/**
 * Determines access mode based on environment variables
 */
export function getAccessMode(): AccessMode {
  // Check if explicitly set to read-only
  if (process.env.ACCESS_MODE === 'read-only') {
    return AccessMode.READ_ONLY;
  }
  
  // Check if we have a PAT with write permissions
  // This is determined by the PAT itself, not by code-level checks
  if (process.env.USER_PAT || process.env.GITHUB_PAT) {
    // Default to full access if PAT is provided
    // The PAT's actual permissions determine what operations succeed
    return AccessMode.FULL;
  }
  
  // Default to read-only if no PAT
  return AccessMode.READ_ONLY;
}

/**
 * Gets the appropriate PAT for the given platform
 */
export function getPlatformPAT(platform: string): string | undefined {
  switch (platform) {
    case 'github':
      return process.env.GITHUB_PAT || process.env.USER_PAT;
    case 'telegram':
      return process.env.TELEGRAM_BOT_TOKEN;
    case 'discord':
      return process.env.DISCORD_BOT_TOKEN;
    case 'slack':
      return process.env.SLACK_APP_TOKEN;
    default:
      return undefined;
  }
}

/**
 * Validates that required credentials are present for a platform
 */
export function validatePlatformCredentials(platform: string): boolean {
  const pat = getPlatformPAT(platform);
  
  if (!pat) {
    console.error(`Missing credentials for platform: ${platform}`);
    return false;
  }
  
  return true;
}

/**
 * Gets access control configuration for the current environment
 */
export function getAccessControlConfig(platform: string): AccessControlConfig {
  return {
    mode: getAccessMode(),
    pat: getPlatformPAT(platform),
    platform,
  };
}

/**
 * Logs current access control configuration
 */
export function logAccessControl(config: AccessControlConfig): void {
  console.log('Access Control Configuration:');
  console.log(`  Platform: ${config.platform}`);
  console.log(`  Mode: ${config.mode}`);
  console.log(`  PAT Present: ${!!config.pat}`);
  
  if (config.mode === AccessMode.READ_ONLY) {
    console.log('  ⚠️  Running in READ-ONLY mode');
    console.log('  Claude will not be able to make changes');
  } else {
    console.log('  ✓ Running in FULL ACCESS mode');
    console.log('  Claude can perform write operations');
  }
}