export class CredentialManager {
  private _credentials: Map<string, string | undefined>;

  constructor(env: Record<string, string | undefined>) {
    this._credentials = new Map();
    this._loadCredentials(env);
  }

  private _loadCredentials(env: Record<string, string | undefined>): void {
    // Load platform-specific credentials
    this._credentials.set("github", env.GITHUB_PAT || env.USER_PAT); // Fallback to USER_PAT for backwards compatibility
    this._credentials.set("telegram", env.TELEGRAM_BOT_TOKEN);
  }

  hasCredential(platform: string): boolean {
    const credential = this._credentials.get(platform.toLowerCase());
    return !!credential && credential.length > 0;
  }

  getCredential(platform: string): string | undefined {
    return this._credentials.get(platform.toLowerCase());
  }

  getAvailablePlatforms(): string[] {
    return Array.from(this._credentials.entries())
      .filter(([, token]) => !!token && token.length > 0)
      .map(([platform]) => platform);
  }

  /**
   * Get authentication status for all platforms
   * Used to populate EventContext.authentication field
   */
  getAuthenticationStatus(): Record<string, boolean> {
    const status: Record<string, boolean> = {};
    for (const [platform, credential] of this._credentials.entries()) {
      status[platform] = !!credential && credential.length > 0;
    }
    return status;
  }

  /**
   * Validate that required credentials are present for a given platform
   */
  validatePlatformCredentials(platform: string): { valid: boolean; message?: string } {
    const hasCredential = this.hasCredential(platform);

    if (!hasCredential) {
      const envVarName = this._getRequiredEnvVar(platform);
      return {
        valid: false,
        message: `Missing credential for ${platform}. Please set ${envVarName} environment variable.`,
      };
    }

    return { valid: true };
  }

  private _getRequiredEnvVar(platform: string): string {
    const mapping: Record<string, string> = {
      github: "GITHUB_PAT",
      telegram: "TELEGRAM_BOT_TOKEN",
    };
    return mapping[platform.toLowerCase()] || "UNKNOWN_TOKEN";
  }
}
