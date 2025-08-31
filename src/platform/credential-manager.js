export class CredentialManager {
    credentials;
    constructor(env) {
        this.credentials = new Map();
        this.loadCredentials(env);
    }
    loadCredentials(env) {
        // Load platform-specific credentials
        this.credentials.set('github', env.GITHUB_PAT || env.USER_PAT); // Fallback to USER_PAT for backwards compatibility
        this.credentials.set('telegram', env.TELEGRAM_BOT_TOKEN);
        this.credentials.set('discord', env.DISCORD_BOT_TOKEN);
        this.credentials.set('slack', env.SLACK_APP_TOKEN);
    }
    hasCredential(platform) {
        const credential = this.credentials.get(platform.toLowerCase());
        return !!credential && credential.length > 0;
    }
    getCredential(platform) {
        return this.credentials.get(platform.toLowerCase());
    }
    getAvailablePlatforms() {
        return Array.from(this.credentials.entries())
            .filter(([_, token]) => !!token && token.length > 0)
            .map(([platform, _]) => platform);
    }
    /**
     * Get authentication status for all platforms
     * Used to populate EventContext.authentication field
     */
    getAuthenticationStatus() {
        const status = {};
        for (const [platform, credential] of this.credentials.entries()) {
            status[platform] = !!credential && credential.length > 0;
        }
        return status;
    }
    /**
     * Validate that required credentials are present for a given platform
     */
    validatePlatformCredentials(platform) {
        const hasCredential = this.hasCredential(platform);
        if (!hasCredential) {
            const envVarName = this.getRequiredEnvVar(platform);
            return {
                valid: false,
                message: `Missing credential for ${platform}. Please set ${envVarName} environment variable.`
            };
        }
        return { valid: true };
    }
    getRequiredEnvVar(platform) {
        const mapping = {
            github: 'GITHUB_PAT',
            telegram: 'TELEGRAM_BOT_TOKEN',
            discord: 'DISCORD_BOT_TOKEN',
            slack: 'SLACK_APP_TOKEN'
        };
        return mapping[platform.toLowerCase()] || 'UNKNOWN_TOKEN';
    }
}
