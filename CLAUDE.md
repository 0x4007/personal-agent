# Personal Agent - UbiquityOS Plugin

## Project Overview
This is a Personal Agent plugin for UbiquityOS that enables users to create self-hosted automation agents. The agent listens for username mentions in GitHub issue comments and executes custom actions using the user's Personal Access Token (PAT).

## Architecture
- **Plugin Type**: UbiquityOS plugin (Cloudflare Worker)
- **Event Handler**: `issue_comment.created`
- **Bridge**: Communicates via Personal Agent Bridge plugin
- **SDK**: Uses `@ubiquity-os/plugin-sdk` for GitHub interactions

## Key Concepts
1. **Personal Automation**: Each user forks and hosts their own agent instance
2. **Username Tags**: Agent activates when `@username` appears at the beginning of issue comments
3. **PAT Authentication**: Uses user's GitHub PAT for authenticated actions
4. **Decentralized**: Each user controls their own agent's behavior and permissions

## Development Guidelines

### Testing
```bash
bun run test
```

### Local Development
```bash
bun run worker  # Starts Wrangler dev server on port 4000
```

### Code Structure
- `/src/handlers/` - Event handlers for different commands
- `/src/types/` - TypeScript type definitions
- `/src/worker.ts` - Cloudflare Worker entry point
- `/src/index.ts` - Main plugin logic
- `/tests/` - Jest test suite with mocks

### Adding New Commands
1. Create a new handler in `/src/handlers/`
2. Parse command from issue comment body
3. Use SDK context for GitHub API interactions
4. Return response to be posted as comment

### Environment Variables
- `USER_PAT` - GitHub Personal Access Token (stored in GitHub Actions secrets)
- `CLAUDE_CODE_OAUTH_TOKEN` - Claude authentication token for CLI integration

### Important Considerations
- **Security**: Never expose PAT in logs or responses
- **Rate Limits**: Be mindful of GitHub API rate limits
- **Permissions**: Agent operates with user's permissions via PAT
- **Error Handling**: Always provide clear error messages to users

### Current Features
- `@username [command]` - Processes commands using Claude CLI for intelligent responses
- Workflow dispatch testing with default payloads
- Bundled action with @vercel/ncc for fast cold starts

### Implementation Status
- ✅ Claude CLI integration in `src/handlers/claude-agent.ts`
- ✅ GitHub Actions workflow with manual trigger for testing
- ✅ Bundle action with ncc for direct execution (no npm install)
- ⚠️ **Issue**: Action not processing events correctly (exits after reassembly check)
- ⚠️ **Root Cause**: `dist/index.js` contains wrong entry point (reassembly script instead of bundled action)

### Planned Features (from specification)
- Comment rewrites for typo fixes
- Automatic PR follow-ups
- Conditional PR merging
- XP tracking system
- Cross-platform integrations (Telegram, etc.)
- LLM-powered context understanding

### Testing Approach
- Unit tests for handlers
- Mock GitHub API responses
- Test event payload processing
- Validate PAT usage patterns

### Deployment
1. Fork repository under personal account (keep name as `personal-agent`)
2. Add `USER_PAT` to GitHub Actions secrets
3. Add `CLAUDE_CODE_OAUTH_TOKEN` to GitHub Actions secrets
4. Install UbiquityOS app on the fork
5. Plugin auto-deploys via GitHub Actions to Cloudflare Workers

### GitHub Actions Execution
- **Entry Point**: `dist/index.js` (should be bundled action, not reassembly script)
- **Build Command**: `bun build-action.js` (uses @vercel/ncc to bundle)
- **Workflow**: `.github/workflows/compute.yml` 
- **Test Mode**: Set `testMode=true` for manual workflow dispatch

### Bridge Communication
The Personal Agent Bridge handles:
- Routing username mentions to correct agent instances
- Forwarding event payloads
- Managing cross-repository permissions

### Best Practices
- Keep handlers focused and single-purpose
- Log important actions for debugging
- Validate input commands thoroughly
- Use TypeScript types from SDK
- Follow existing code patterns in the repository