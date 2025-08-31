# Personal Agent - Universal Automation Platform

## Project Vision

A generalized personal agent that acts as a digital assistant with full access to command-line tools and platform APIs. The agent operates with the user's credentials across multiple platforms, providing a unified automation interface through natural language commands.

## Core Concept

The Personal Agent is designed to be a universal automation system where:

- Users provide their access keys and credentials for various platforms
- The agent has full shell access to execute any command-line tool
- It can authenticate and act on behalf of the user across any platform
- Initial deployment uses GitHub Actions as the execution environment
- UbiquityOS handles event capture and routing from multiple platforms

## Architecture Overview

This project leverages the Claude Code Action as its foundation, extending it to become a multi-platform automation agent.

### Key Components

- **Execution Environment**: GitHub Actions (provides compute and shell access)
- **AI Core**: Claude Code Action (submodule integration)
- **Event Router**: UbiquityOS (captures events from multiple platforms)
- **Invocation**: Username mentions trigger agent activation
- **Platform Support**: GitHub (implemented), Telegram, Google Drive (planned)
- **MCP Integration**: Model Context Protocol for platform-specific capabilities

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

The agent uses a generalized `EventContext` interface that can adapt to events from any platform:

```typescript
interface EventContext {
  platform: string; // e.g., "github", "telegram", "discord"
  eventType: string; // e.g., "issue_comment", "message", "command"
  source?: string; // e.g., "owner/repo", "chat_id", "channel_id"
  repository?: string; // GitHub-specific: "owner/repo"
  issueNumber?: string;
  pullRequestNumber?: string;
  author: string;
  command: string;
  metadata?: {
    // Platform-specific metadata
    chatId?: string; // Telegram
    messageId?: string; // Various platforms
    channelId?: string; // Discord/Slack
    [key: string]: any;
  };
  [key: string]: string | number | object | undefined; // Extensible for any event data
}
```

This structure is critical for informing Claude about:

- Which platform the event originated from
- What MCP tools might be relevant (e.g., Telegram MCP for Telegram events)
- How to format and deliver responses appropriately

### Prompt Generation

The prompt builder is platform-agnostic and dynamically formats context based on the provided event data. It:

- Adapts to events from any platform (GitHub, Telegram, Discord, etc.)
- Includes full EventContext to inform Claude about the event source
- Clearly communicates access level (read-only vs full)
- Provides platform-specific context to guide MCP tool selection
- Maintains flexibility for future platforms and event types
- Does NOT prescribe specific operations - Claude determines appropriate actions based on context

## Key Concepts

1. **Universal Agent**: Single agent that can operate across all platforms with user's credentials
2. **Personal Automation**: Each user forks and hosts their own agent instance
3. **Username Mentions**: Agent activates when `@username` appears in any supported platform
4. **Multi-Platform Authentication**: Stores credentials for various platforms (GitHub PAT, Telegram Bot Token, etc.)
5. **Decentralized**: Each user controls their own agent's behavior and permissions
6. **Platform-Agnostic Design**: Core logic remains independent of specific platforms
7. **MCP Extensibility**: New platforms added via Model Context Protocol servers
8. **Full Shell Access**: Agent can execute any CLI tool available in the environment

## Development Guidelines

### Testing

```bash
bun run test
```

### Local Development

```bash
bun run dev  # Starts the development server
```

### Code Structure

- `/src/handlers/` - Event handlers for different commands
- `/src/handlers/claude-agent.ts` - Main Claude CLI integration
- `/src/types/` - TypeScript type definitions
- `/src/index.ts` - Main plugin logic
- `/tests/` - Jest test suite with mocks

### Environment Variables

- `USER_PAT` - GitHub Personal Access Token (stored in GitHub Actions secrets)
- `CLAUDE_CODE_OAUTH_TOKEN` - Claude authentication token for CLI integration
- `ACCESS_MODE` - Set to "read-only" for limited access mode
- `AGENT_OWNER` - Username that triggers the agent
- `TELEGRAM_BOT_TOKEN` - Telegram Bot API token (planned)
- `GOOGLE_DRIVE_CREDENTIALS` - Google Drive API credentials (planned)
- Platform-specific credentials as needed

### Important Implementation Notes

1. **The agent is platform-agnostic** - core logic should work regardless of event source
2. **EventContext is mandatory** - always pass full context to Claude for informed decisions
3. **Platform detection drives tool selection** - Claude uses EventContext to determine relevant MCPs
4. **Authentication is platform-specific** - each platform requires its own credential management
5. **The prompt should provide context** about the triggering event and platform without being prescriptive
6. **All security-critical features must be preserved**:
   - Access control (read-only vs full)
   - CI environment spoofing (essential for shell access)
   - Retry logic for error handling
7. **Credential permissions handle security** - no need for command filtering at the code level
8. **Claude Code Action integration** - leverage existing functionality, don't recreate

### Current Implementation

- **Invocation**: Currently triggered via GitHub issue/PR comments with username mention
- **Planned Platforms**: Telegram (bot messages), Google Drive (file operations)
- **Future Events**: Any platform event (messages, reactions, file uploads, etc.)
- **Context Preservation**: Full EventContext always passed to Claude for platform awareness
- **Claude Integration**: Adopting Claude Code Action as submodule for core functionality
- **Execution**: GitHub Actions provides compute and shell environment

### GitHub Actions Execution

- **Entry Point**: `dist/index.js` (bundled action)
- **Build Command**: `bun build-action.js` (uses @vercel/ncc to bundle)
- **Workflow**: `.github/workflows/compute.yml`
- **Test Mode**: Set `testMode=true` for manual workflow dispatch

### Deployment

1. Fork repository under personal account (keep name as `personal-agent`)
2. Add credentials to GitHub Actions secrets:
   - `USER_PAT` - GitHub Personal Access Token
   - `CLAUDE_CODE_OAUTH_TOKEN` - Claude authentication token
   - Platform-specific tokens as needed
3. Configure access mode if needed (default is full access)
4. Install UbiquityOS app on the fork for event routing
5. Plugin auto-deploys via GitHub Actions
6. Configure MCP servers for additional platforms

### Bridge Communication

The UbiquityOS Bridge handles:

- Capturing events from multiple platforms (GitHub, Telegram, Discord, etc.)
- Routing username mentions to correct agent instances
- Forwarding event payloads with full EventContext
- Managing cross-platform authentication and permissions
- Normalizing events into consistent EventContext format

### Best Practices

- Keep core logic platform-agnostic
- Always include full EventContext in prompts to Claude
- Let Claude determine appropriate MCP tools based on platform context
- Preserve all error handling and retry logic
- Don't add platform-specific code to core logic
- Use MCP servers for platform-specific functionality
- Trust credential permissions for security rather than code-level filtering
- Leverage Claude Code Action functionality rather than recreating it
- Test with events from multiple platforms to ensure generalization

## Integration Roadmap

### Phase 1: Claude Code Action Integration

- Adopt Claude Code Action as submodule
- Modify to accept generalized EventContext
- Ensure platform field drives MCP tool selection
- Maintain all existing security features

### Phase 2: Multi-Platform Support

- Extend EventContext for platform-specific metadata
- Implement Telegram Bot API integration
- Add Google Drive integration for file operations
- Ensure consistent response formatting per platform

### Phase 3: Enhanced Capabilities

- Add more MCP servers for additional platforms
- Implement cross-platform workflows
- Enable agent-to-agent communication
- Support scheduled and triggered automations

## Implementation Sprint Documentation

Detailed implementation has been broken down into 5 sprints located in `/docs/sprints/`:

### Active Sprints

1. **Sprint 1: Core Claude Integration** (`sprint-1-core-integration.md`)
   - Submodule integration at `reference/claude-code-action/`
   - EventContext adapter implementation
   - Preserve CI spoofing, retry logic, and access control
2. **Sprint 2: Platform Abstraction** (`sprint-2-platform-abstraction.md`)
   - Remove GitHub-specific assumptions from core
   - Multi-platform credential management (rename `USER_PAT` to `GITHUB_PAT`)
   - Platform-specific response formatters
3. **Sprint 3: Telegram MCP** (`sprint-3-telegram-mcp.md`)
   - Full Telegram Bot API integration
   - Message formatting (MarkdownV2)
   - Interactive features (inline keyboards)
4. **Sprint 4: Testing & Security** (`sprint-4-testing-security.md`)
   - Comprehensive test coverage (>80%)
   - Security validation and penetration testing
   - Monitoring and observability setup
5. **Sprint 5: Production Deployment** (`sprint-5-deployment.md`)
   - CI/CD pipeline configuration
   - Documentation and runbooks
   - Production deployment procedures

### Product Backlog

See `docs/sprints/product-backlog.md` for future enhancements including Discord/Slack integration, agent-to-agent communication, and more.

## Critical Implementation Requirements

### NEVER REMOVE OR MODIFY

1. **CI Environment Spoofing**: The `GITHUB_ACTIONS=false` and `CI=false` environment variables are CRITICAL. Without these, Claude will refuse to execute shell commands in GitHub Actions.

2. **Access Control via PAT**: Security is handled ENTIRELY through PAT permissions. Do NOT add command filtering or sanitization at the code level.

3. **Retry Logic**: The exponential backoff retry mechanism (max 3 attempts) for API errors is battle-tested and essential.

### Platform Integration Checklist

When adding a new platform:

- [ ] Create platform adapter in `/src/adapters/`
- [ ] Add credential environment variable (e.g., `TELEGRAM_BOT_TOKEN`)
- [ ] Implement response formatter in `/src/formatters/`
- [ ] Update platform registry with tools and features
- [ ] Create MCP server if needed for platform-specific operations
- [ ] Add platform to EventContext.authentication field
- [ ] Test with real platform events (not just simulated)

### EventContext Requirements

The EventContext must ALWAYS include:

- `platform`: Platform identifier (required)
- `eventType`: Type of event
- `author`: Who triggered the event
- `command`: The actual command/message
- `metadata`: Platform-specific data

## CRITICAL: Anti-Patterns to Avoid

### ❌ DO NOT Create Test Theater

**What NOT to do:**

```typescript
// WRONG: Fake test that always passes
test("Agent responds to issue comment", async () => {
  const response = await processGitHubEvent(event);
  expect(response.success).toBe(true); // This always returns true!
});

// WRONG: Mock that doesn't test real functionality
async function processGitHubEvent(event) {
  return { success: true, responded: true }; // Hardcoded success
}
```

**What TO do:**

```typescript
// RIGHT: Test actual critical functionality
test("CI spoofing prevents restricted mode", () => {
  spoofCIEnvironment();
  expect(process.env.GITHUB_ACTIONS).toBe("false"); // Actually prevents Claude restrictions
});
```

### ❌ DO NOT Over-Engineer Abstractions

**What NOT to do:**

```typescript
// WRONG: 280-line prompt builder that's never used
export class PlatformAgnosticPromptBuilder {
  private contexts: Map<string, PromptContext>;
  private formatters: Map<string, Formatter>;
  // ... 250 more lines of unused abstraction
}

// Meanwhile, actual implementation:
function buildPrompt(context) {
  return `You are processing: ${context.command}`; // 1 line
}
```

**What TO do:**

```typescript
// RIGHT: Simple, direct implementation that works
function buildPrompt(context: EventContext): string {
  return `Platform: ${context.platform}\nCommand: ${context.command}`;
}
```

### ❌ DO NOT Create Placeholder Implementations

**What NOT to do:**

```typescript
// WRONG: Placeholder that pretends to work
[
  "discord",
  {
    formatter: new GitHubFormatter(), // Using wrong formatter as placeholder!
    tools: ["discord-mcp"], // Tool doesn't exist!
  },
];
```

**What TO do:**

```typescript
// RIGHT: Only implement what actually exists
// Don't add Discord until Discord is actually implemented
```

### ❌ DO NOT Commit Generated Files

**What NOT to do:**

```
src/handler.ts    # Source file
src/handler.js    # Generated file - DON'T COMMIT THIS!
```

**What TO do:**

```bash
# Add to .gitignore
*.js
!jest.config.js
dist/
```

### ❌ DO NOT Write Tests for Trivial Assignments

**What NOT to do:**

```typescript
// WRONG: Testing object property assignment
test("sets platform correctly", () => {
  const context = { platform: "github" };
  expect(context.platform).toBe("github"); // Duh!
});
```

**What TO do:**

```typescript
// RIGHT: Test business logic and edge cases
test("escapes Telegram MarkdownV2 special characters", () => {
  const result = formatter.format("Hello_world[test]");
  expect(result).toBe("Hello\\_world\\[test\\]"); // Prevents production errors
});
```

## Best Practices for Minimal, Working Code

### ✅ Keep It Simple and Direct

1. **Start with the simplest working implementation**

   - Get it working first, abstract later (if needed)
   - Most systems need <1000 lines of actual code

2. **Only test what can actually break**

   - Security boundaries (access control)
   - Critical workarounds (CI spoofing)
   - Data transformations that prevent errors (escaping, formatting)
   - Retry logic and error handling

3. **Delete aggressively**

   - If a file isn't imported anywhere, delete it
   - If a test uses mocks with hardcoded responses, delete it
   - If documentation duplicates what's in code comments, delete it

4. **Real integration > Mock integration**
   - Either test against real APIs or don't test at all
   - Mock tests provide false confidence

### Example of Good vs Bad Implementation

**BAD (Over-engineered):**

- 5000+ lines of code
- 65% fake tests
- Multiple abstraction layers
- Placeholder implementations
- Generated files committed

**GOOD (Minimal, working):**

- ~500 lines of actual functionality
- Tests only for critical paths
- Direct implementations
- No placeholders
- Clean repository

### Testing Requirements (Revised)

Before deployment:

- [ ] CI spoofing verified working (CRITICAL)
- [ ] PAT access control tested with real tokens
- [ ] Error retry logic tested with real failures
- [ ] NO test theater - only real functionality tests
- [ ] Delete all tests that return hardcoded success
