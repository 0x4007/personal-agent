# Configuration Guide

## Environment Variables

The Personal Agent uses environment variables for configuration. These can be set in `.env` for local development or as GitHub Actions secrets for production.

### Core Configuration

#### `GITHUB_PAT` (Required)
Your GitHub Personal Access Token with appropriate permissions.

**Creating a PAT:**
1. Go to GitHub Settings > Developer settings > Personal access tokens
2. Generate a new token (classic) with these scopes:
   - `repo` - Full repository access
   - `workflow` - Update GitHub Actions
   - `read:org` - Read organization data

#### `CLAUDE_CODE_OAUTH_TOKEN` (Required)
Your Claude authentication token for the Claude Code Action.

**Getting your Claude token:**
1. Visit [Claude Code settings](https://claude.ai/code)
2. Generate an OAuth token
3. Copy the token value

#### `AGENT_OWNER` (Required)
Your GitHub username that triggers the agent.

```env
AGENT_OWNER=your-github-username
```

### Access Control

#### `ACCESS_MODE`
Controls the level of access for the agent.

- `full` (default) - Full read/write access
- `read-only` - Limited to read operations only

```env
ACCESS_MODE=full
```

### Platform Credentials

#### `TELEGRAM_BOT_TOKEN`
For Telegram integration.

**Creating a Telegram Bot:**
1. Message [@BotFather](https://t.me/botfather) on Telegram
2. Send `/newbot` and follow the prompts
3. Copy the bot token

#### `DISCORD_BOT_TOKEN`
For Discord integration.

**Creating a Discord Bot:**
1. Visit [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Go to Bot section
4. Create a bot and copy the token

#### `SLACK_APP_TOKEN`
For Slack integration.

**Creating a Slack App:**
1. Visit [Slack API](https://api.slack.com/apps)
2. Create a new app
3. Install to workspace
4. Copy the app token

### Deployment Configuration

#### `CLOUDFLARE_API_TOKEN`
For Cloudflare Worker deployment.

```env
CLOUDFLARE_API_TOKEN=your_cloudflare_api_token
CLOUDFLARE_ACCOUNT_ID=your_account_id
```

### Webhook Configuration

#### `WEBHOOK_SECRET`
Secret for webhook verification.

```env
WEBHOOK_SECRET=generate_a_random_secret_here
API_ENDPOINT=https://your-agent-api.com
```

### Monitoring Configuration

#### `LOG_LEVEL`
Controls logging verbosity.

- `debug` - Verbose logging
- `info` - Standard logging (default)
- `warn` - Warnings and errors only
- `error` - Errors only

```env
LOG_LEVEL=info
```

#### `DATADOG_API_KEY` (Optional)
For Datadog monitoring integration.

#### `SENTRY_DSN` (Optional)
For Sentry error tracking.

## Configuration Files

### `manifest.json`
Plugin configuration for UbiquityOS.

```json
{
  "name": "personal-agent",
  "description": "Universal automation agent",
  "ubiquity:listeners": [
    "issue_comment.created",
    "pull_request_review_comment.created"
  ]
}
```

### `wrangler.toml`
Cloudflare Worker configuration.

```toml
name = "personal-agent"
main = "src/worker.ts"
compatibility_date = "2024-01-01"

[env.production]
vars = { ENVIRONMENT = "production" }
```

## Platform-Specific Configuration

### GitHub Configuration

The agent responds to mentions in:
- Issue comments
- Pull request comments
- Pull request reviews

### Telegram Configuration

1. Set webhook URL:
```bash
curl -X POST https://api.telegram.org/bot<TOKEN>/setWebhook \
  -d url=https://your-agent.com/telegram
```

2. Configure allowed chat IDs in environment:
```env
TELEGRAM_ALLOWED_CHATS=123456789,987654321
```

### Access Patterns

#### Full Access Mode
Allows all operations including:
- Creating/editing files
- Running shell commands
- Making API calls
- Modifying repositories

#### Read-Only Mode
Limited to:
- Reading files
- Listing directories
- Fetching information
- Generating reports

## Security Best Practices

1. **Rotate tokens regularly** - Update PATs and API tokens every 90 days
2. **Use minimal permissions** - Only grant necessary scopes
3. **Separate environments** - Use different tokens for dev/staging/production
4. **Audit access logs** - Review GitHub Actions logs regularly
5. **Encrypt secrets** - Never commit credentials to the repository

## Validation

Test your configuration:

```bash
# Validate environment variables
bun run validate-config

# Test GitHub connection
bun run test:github

# Test Claude connection
bun run test:claude
```

## Common Configuration Issues

### Agent not responding
- Verify `AGENT_OWNER` matches your GitHub username exactly
- Check that `GITHUB_PAT` has correct permissions
- Ensure GitHub Actions are enabled on your repository

### Authentication errors
- Regenerate tokens if they've expired
- Verify tokens are correctly copied (no extra spaces)
- Check token scopes match requirements

### Platform connection issues
- Verify webhook URLs are correctly configured
- Check firewall/network restrictions
- Ensure API endpoints are accessible

## Advanced Configuration

### Custom MCP Servers
Add custom Model Context Protocol servers:

```env
MCP_SERVERS=telegram,discord,custom
CUSTOM_MCP_ENDPOINT=https://your-mcp-server.com
```

### Rate Limiting
Configure rate limits:

```env
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=3600
```

### Timeout Configuration
Set custom timeouts:

```env
COMMAND_TIMEOUT=120000
API_TIMEOUT=30000
```