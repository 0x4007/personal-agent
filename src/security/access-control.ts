/**
 * Access Control Module
 * Manages access levels based on Personal Access Token (PAT) permissions
 * Security is handled at the PAT level, not through command filtering
 */

export enum AccessMode {
  FULL = "full",
  READ_ONLY = "read-only",
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
  if (process.env.ACCESS_MODE === "read-only") {
    return AccessMode.READ_ONLY;
  }

  // Check if we have a PAT with write permissions
  // This is determined by the PAT itself, not by code-level checks
  if (process.env.GITHUB_PAT) {
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
export function getPlatformPat(platform: string): string | undefined {
  switch (platform) {
    case "github":
      return process.env.GITHUB_PAT;
    case "telegram":
      return process.env.TELEGRAM_BOT_TOKEN;
    default:
      return undefined;
  }
}

/**
 * Validates that required credentials are present for a platform
 */
export function validatePlatformCredentials(platform: string): boolean {
  const pat = getPlatformPat(platform);

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
    pat: getPlatformPat(platform),
    platform,
  };
}
