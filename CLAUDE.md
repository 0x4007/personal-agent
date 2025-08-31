# Personal Agent - UbiquityOS Plugin

## Project Overview
This is a Personal Agent plugin for UbiquityOS that enables users to create self-hosted automation agents. The agent listens for username mentions in GitHub issue comments and executes custom actions using the user's Personal Access Token (PAT).

## Architecture Overview

This project is a generalized agent that can be triggered by GitHub events. The agent executes Claude CLI to process commands and respond to events.

- **Plugin Type**: UbiquityOS plugin (Cloudflare Worker)
- **Event Handler**: `issue_comment.created` (and future GitHub events)
- **Bridge**: Communicates via Personal Agent Bridge plugin
- **SDK**: Uses `@ubiquity-os/plugin-sdk` for GitHub interactions
- **AI Integration**: Claude CLI for intelligent command processing

## Key Design Decisions

### Essential Features to Retain

1. **Access Control System**
   - Two access modes via Personal Access Tokens (PATs):
     - **Admin Mode**: Full write access PAT for trusted operations
     - **Read-Only Mode**: Limited PAT that anyone can invoke for read-only operations
   - Access level determines what operations Claude can perform
   - Security is handled at the PAT level, not through command filtering

2. **Error Handling & Retry Logic**
   - Retry mechanism for handling 500 errors from API
   - Exponential backoff strategy for retries (max 3 attempts)
   - Fallback to simplified prompts when complex requests fail
   - Essential for reliability in production environment

3. **CI Environment Spoofing**
   - **CRITICAL**: Must spoof CI environment variables to prevent Claude from entering restricted mode
   - Sets `GITHUB_ACTIONS=false` and `CI=false` to allow shell command execution
   - Without this, Claude refuses to run shell commands in CI environments
   - This is a required workaround for GitHub Actions deployment

### Event Context Structure

The agent uses a generalized `EventContext` interface that can adapt to any GitHub event:

```typescript
interface EventContext {
  eventType: string;              // e.g., "issue_comment", "push", "pull_request"
  repository: string;              // e.g., "owner/repo"
  issueNumber?: string;
  pullRequestNumber?: string;
  author: string;
  command: string;
  [key: string]: string | number | undefined;  // Extensible for any event data
}
```

### Prompt Generation

The prompt builder is event-agnostic and dynamically formats context based on the provided event data. It:
- Adapts to any GitHub event type
- Clearly communicates access level (read-only vs full)
- Provides relevant context without hardcoding GitHub-specific language
- Maintains flexibility for future event types
- Does NOT prescribe specific GitHub operations - Claude determines appropriate actions

## Key Concepts

1. **Personal Automation**: Each user forks and hosts their own agent instance
2. **Username Tags**: Agent activates when `@username` appears at the beginning of issue comments
3. **PAT Authentication**: Uses user's GitHub PAT for authenticated actions
4. **Decentralized**: Each user controls their own agent's behavior and permissions
5. **Generalized Design**: Intentionally avoids GitHub-specific logic where possible

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
- `/src/handlers/claude-agent.ts` - Main Claude CLI integration
- `/src/types/` - TypeScript type definitions
- `/src/worker.ts` - Cloudflare Worker entry point
- `/src/index.ts` - Main plugin logic
- `/tests/` - Jest test suite with mocks

### Environment Variables
- `USER_PAT` - GitHub Personal Access Token (stored in GitHub Actions secrets)
- `CLAUDE_CODE_OAUTH_TOKEN` - Claude authentication token for CLI integration
- `ACCESS_MODE` - Set to "read-only" for limited access mode
- `AGENT_OWNER` - Username that triggers the agent

### Important Implementation Notes

1. **The agent is intentionally generalized** - avoid adding GitHub-specific logic unless absolutely necessary
2. **Git configuration and GitHub CLI authentication** remain essential for repository operations
3. **The prompt should provide context** about the triggering event without being overly prescriptive
4. **All security-critical features must be preserved**:
   - Access control (read-only vs full)
   - CI environment spoofing
   - Retry logic for error handling
5. **PAT permissions handle security** - no need for command filtering at the code level

### Current Implementation

- **Invocation**: Currently triggered via GitHub issue/PR comments with username mention
- **Future**: Designed to handle any GitHub event (push, workflow_run, PR creation, etc.)
- **Context Preservation**: Event context is always passed to Claude for informed responses
- **Claude Integration**: Uses Claude CLI with `--dangerously-skip-permissions` flag

### GitHub Actions Execution
- **Entry Point**: `dist/index.js` (bundled action)
- **Build Command**: `bun build-action.js` (uses @vercel/ncc to bundle)
- **Workflow**: `.github/workflows/compute.yml`
- **Test Mode**: Set `testMode=true` for manual workflow dispatch

### Deployment

1. Fork repository under personal account (keep name as `personal-agent`)
2. Add `USER_PAT` to GitHub Actions secrets (with appropriate permissions)
3. Add `CLAUDE_CODE_OAUTH_TOKEN` to GitHub Actions secrets
4. Configure access mode if needed (default is full access)
5. Install UbiquityOS app on the fork
6. Plugin auto-deploys via GitHub Actions to Cloudflare Workers

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
- Preserve all error handling and retry logic
- Don't add GitHub-specific prompting unless necessary
- Trust PAT permissions for security rather than code-level filtering