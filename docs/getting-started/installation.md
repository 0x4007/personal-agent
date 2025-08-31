# Installation Guide

## Prerequisites

- Node.js 18+ or Bun runtime
- GitHub account (for hosting the agent)
- Claude account with API access
- Platform credentials (GitHub PAT, Telegram Bot Token, etc.)

## Step 1: Fork the Repository

1. Go to the [Personal Agent repository](https://github.com/your-username/personal-agent)
2. Click the "Fork" button to create your own copy
3. Keep the repository name as `personal-agent`

## Step 2: Clone Your Fork

```bash
git clone https://github.com/YOUR_USERNAME/personal-agent.git
cd personal-agent
```

## Step 3: Install Dependencies

Using Bun (recommended):
```bash
bun install
```

Using npm:
```bash
npm install
```

## Step 4: Configure Environment Variables

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Edit `.env` with your credentials:
```bash
# Required
GITHUB_PAT=ghp_your_github_personal_access_token
CLAUDE_CODE_OAUTH_TOKEN=your_claude_token
AGENT_OWNER=your_github_username

# Optional (for additional platforms)
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
DISCORD_BOT_TOKEN=your_discord_bot_token
```

## Step 5: Set Up GitHub Actions Secrets

1. Go to your repository settings
2. Navigate to "Secrets and variables" > "Actions"
3. Add the following secrets:
   - `USER_PAT` - Your GitHub Personal Access Token
   - `CLAUDE_CODE_OAUTH_TOKEN` - Your Claude authentication token
   - `CLOUDFLARE_API_TOKEN` - (Optional) For Cloudflare Worker deployment

## Step 6: Install UbiquityOS

1. Go to [UbiquityOS GitHub App](https://github.com/apps/ubiquityos)
2. Install the app on your forked repository
3. Configure the app to route events to your agent

## Step 7: Deploy to Cloudflare Workers (Optional)

If you want to use Cloudflare Workers for the routing layer:

```bash
# Configure Wrangler
bunx wrangler login

# Deploy the worker
bun run deploy
```

## Step 8: Verify Installation

Test your agent by mentioning it in a GitHub issue:

```markdown
@your-username help
```

Your agent should respond within a few seconds.

## Next Steps

- [Configure your agent](configuration.md)
- [Learn available commands](../user-guide/commands.md)
- [Set up additional platforms](../user-guide/telegram-usage.md)

## Troubleshooting

If your agent doesn't respond:

1. Check GitHub Actions logs for errors
2. Verify all secrets are correctly configured
3. Ensure UbiquityOS is installed and active
4. Check the [troubleshooting guide](../user-guide/troubleshooting.md)

## System Requirements

- **Memory**: 512MB minimum
- **Storage**: 100MB for core installation
- **Network**: HTTPS access to GitHub, Claude API, and configured platforms
- **Compute**: GitHub Actions free tier (2000 minutes/month) or self-hosted runners