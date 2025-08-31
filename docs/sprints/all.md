# Claude Code Action Integration Specification

## Project Overview
This specification outlines the integration of the Claude Code Action submodule into the Personal Agent system, transforming it from a GitHub-specific tool into a universal platform-agnostic automation agent.

## Objective
Adopt and extend the Claude Code Action to serve as the AI core for a multi-platform personal automation system that can execute commands and interact with various platforms based on user credentials.

## Background
- The Personal Agent currently uses basic Claude CLI integration
- Claude Code Action provides robust GitHub Actions integration with Claude
- We need to preserve Claude Code Action's functionality while extending it for multi-platform support
- UbiquityOS will handle event routing from various platforms to the GitHub Action

## Technical Requirements

### 1. Submodule Integration
- **Location**: `reference/claude-code-action/`
- **Integration Points**:
  - Preserve existing entry point structure
  - Maintain GitHub Actions workflow compatibility
  - Keep all security features (CI spoofing, retry logic, access control)

### 2. EventContext Enhancement

The current implementation must be modified to accept a generalized EventContext:

```typescript
interface EventContext {
  platform: string;                // Required: source platform identifier
  eventType: string;              // Event classification
  source?: string;                // Platform-specific source identifier
  repository?: string;            // GitHub: "owner/repo"
  issueNumber?: string;           // GitHub-specific
  pullRequestNumber?: string;     // GitHub-specific
  author: string;                 // Event initiator
  command: string;                // User command/message
  metadata?: {                    // Platform-specific data
    chatId?: string;              // Telegram
    messageId?: string;           
    channelId?: string;           // Discord/Slack
    threadId?: string;
    [key: string]: any;
  };
  authentication?: {              // Platform credentials reference
    github?: boolean;             // Has GitHub PAT
    telegram?: boolean;           // Has Telegram Bot Token
    discord?: boolean;            // Has Discord Bot Token
    [platform: string]: boolean;
  };
  [key: string]: any;            // Extensible
}
```

### 3. Prompt Engineering Modifications

#### Current State
The Claude Code Action currently generates GitHub-specific prompts with assumptions about issue comments and pull requests.

#### Required Changes
1. **Remove GitHub-specific language** from core prompts
2. **Inject platform context** at the beginning of every prompt:
   ```
   Event Source: [platform]
   Event Type: [eventType]
   Context: [Full EventContext as JSON]
   
   Available Tools:
   - Shell commands (full access)
   - GitHub CLI (if platform === 'github')
   - Telegram MCP (if platform === 'telegram')
   - [Other MCPs based on platform]
   
   User Command: [command]
   ```
3. **Dynamic tool availability** based on platform and available credentials
4. **Response formatting hints** based on platform (markdown for GitHub, plain text for Telegram, etc.)

### 4. Authentication Management

#### Current Implementation
- Single `USER_PAT` environment variable for GitHub

#### Required Enhancement
- Support multiple credential environment variables:
  - `GITHUB_PAT` (renamed from USER_PAT)
  - `TELEGRAM_BOT_TOKEN`
  - `DISCORD_BOT_TOKEN`
  - `SLACK_APP_TOKEN`
  - Platform-specific tokens as needed
- Pass credential availability in EventContext.authentication
- Let Claude determine which tools are available based on credentials

### 5. MCP Integration Points

#### Claude's Tool Selection Logic
Claude should autonomously select appropriate MCP tools based on:
1. **Platform field** in EventContext
2. **Available credentials** in environment
3. **User command intent**

Example: If `platform: "telegram"` and `TELEGRAM_BOT_TOKEN` exists, Claude should consider using Telegram MCP for responses.

### 6. Response Handling

#### Current State
Responses are formatted for GitHub comments/issues

#### Required Changes
1. **Platform-aware formatting**:
   - GitHub: Markdown with code blocks
   - Telegram: Plain text or basic markdown
   - Discord: Discord-flavored markdown
   - Slack: Slack blocks format
2. **Response routing** through UbiquityOS bridge
3. **Error messages** appropriate for each platform

### 7. Security Considerations

#### Must Preserve
1. **CI Environment Spoofing**
   - CRITICAL: Keep `GITHUB_ACTIONS=false` and `CI=false`
   - Without this, Claude refuses shell commands
2. **Access Control Modes**
   - Read-only vs Full access
   - Based on credential permissions
3. **Retry Logic**
   - Exponential backoff for API errors
   - Fallback to simplified prompts

#### New Considerations
1. **Credential Isolation**: Each platform's credentials isolated
2. **Platform Verification**: Validate EventContext.platform against known platforms
3. **Command Scope**: Let credential permissions define scope, not code-level filtering

## Implementation Steps

### Phase 1: Core Integration (Day 1-2)
1. Import Claude Code Action as submodule
2. Create adapter layer for EventContext transformation
3. Modify prompt generation to be platform-agnostic
4. Test with existing GitHub events to ensure backward compatibility

### Phase 2: Platform Abstraction (Day 2-3)
1. Replace GitHub-specific code with platform conditionals
2. Implement credential management for multiple platforms
3. Add platform detection logic in prompt generation
4. Create response formatter based on platform

### Phase 3: Testing & Validation (Day 3-4)
1. Test with simulated events from different platforms
2. Verify Claude's tool selection based on platform context
3. Ensure security features remain intact
4. Validate response formatting per platform

## Success Criteria

1. **Backward Compatibility**: Existing GitHub functionality unchanged
2. **Platform Agnostic**: Core logic works regardless of event source
3. **Claude Awareness**: Claude correctly identifies platform and uses appropriate tools
4. **Security Preserved**: All existing security features maintained
5. **Extensibility**: Easy to add new platforms via MCP servers

## Testing Strategy

### Unit Tests
- EventContext transformation
- Platform detection logic
- Credential management
- Response formatting

### Integration Tests
- GitHub events (baseline)
- Simulated Telegram events
- Simulated Discord events
- Multi-platform scenarios

### End-to-End Tests
- Full workflow from event capture to response
- Error handling and retry logic
- Access control modes
- CI environment execution

## Dependencies

1. **Claude Code Action** submodule (existing)
2. **UbiquityOS** for event routing (existing)
3. **GitHub Actions** for execution environment (existing)
4. **MCP Servers** for platform-specific operations (future)

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking existing GitHub functionality | High | Comprehensive backward compatibility testing |
| Claude misinterpreting platform context | Medium | Clear, structured prompt engineering |
| Credential leakage across platforms | High | Strict isolation and environment variable management |
| CI environment detection changes | High | Monitor Claude's behavior, maintain spoofing |

## Future Considerations

1. **MCP Server Development**: Create custom MCP servers for each platform
2. **Agent Communication**: Enable agent-to-agent messaging
3. **Workflow Automation**: Support scheduled and triggered tasks
4. **Platform Webhooks**: Direct webhook integration for faster response

## Deliverables

1. Modified Claude Code Action with platform-agnostic core
2. EventContext adapter layer
3. Multi-platform credential management
4. Platform-specific response formatters
5. Comprehensive test suite
6. Updated documentation

## Timeline

- **Day 1-2**: Core integration and adapter development
- **Day 2-3**: Platform abstraction and credential management  
- **Day 3-4**: Testing, validation, and documentation
- **Day 5**: Buffer for issues and refinements

**Total Duration**: 5 days (accelerated from 4 weeks)

## Notes for Implementation Team

1. **DO NOT remove CI spoofing** - it's critical for shell access
2. **DO NOT add platform-specific logic to core** - use conditionals only where necessary
3. **DO preserve all retry and error handling** - these are battle-tested
4. **DO test with real platform events** - simulated events may miss edge cases
5. **DO maintain clear EventContext structure** - it's the key to platform awareness