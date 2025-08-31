# Sprint 1: Core Claude Integration
**Duration**: 3 days  
**Priority**: Critical  
**Dependencies**: Claude Code Action submodule

## Sprint Goals
1. Integrate Claude Code Action as a submodule
2. Create adapter layer for EventContext transformation
3. Preserve all security features (CI spoofing, retry logic, access control)
4. Establish baseline GitHub functionality

## User Stories

### Story 1.1: Submodule Integration
**As a** developer  
**I want to** integrate Claude Code Action as a submodule  
**So that** we can leverage existing Claude GitHub Actions functionality

**Acceptance Criteria:**
- [ ] Submodule added at `reference/claude-code-action/`
- [ ] Git configuration properly set up
- [ ] Submodule can be updated independently
- [ ] Build process includes submodule code

**Tasks:**
- Add Claude Code Action as git submodule
- Configure submodule initialization in CI/CD
- Document submodule update process
- Test submodule integration in GitHub Actions

### Story 1.2: EventContext Adapter
**As a** system architect  
**I want to** create an adapter for EventContext transformation  
**So that** we can pass platform-agnostic events to Claude

**Acceptance Criteria:**
- [ ] EventContext interface defined with all required fields
- [ ] Adapter transforms GitHub events to EventContext
- [ ] Platform field correctly identifies source
- [ ] Metadata preserved for platform-specific data

**Tasks:**
- Define TypeScript interface for EventContext
- Implement GitHub-to-EventContext transformer
- Add validation for required fields
- Create unit tests for transformation logic

### Story 1.3: Security Features Preservation
**As a** security engineer  
**I want to** ensure all security features remain intact  
**So that** the system remains secure and functional

**Acceptance Criteria:**
- [ ] CI environment spoofing working (`GITHUB_ACTIONS=false`, `CI=false`)
- [ ] Access control modes preserved (read-only vs full)
- [ ] Retry logic functioning for API errors
- [ ] No command filtering added (security via PAT only)

**Tasks:**
- Verify CI spoofing in action execution
- Test access control with different PAT types
- Validate retry logic with simulated failures
- Remove any command sanitization code

### Story 1.4: Prompt Engineering Foundation
**As a** Claude integration developer  
**I want to** modify prompt generation to be platform-aware  
**So that** Claude understands the event context

**Acceptance Criteria:**
- [ ] Prompts include platform identification
- [ ] EventContext passed as structured data
- [ ] GitHub-specific language removed from core prompts
- [ ] Tool availability communicated based on platform

**Tasks:**
- Refactor prompt builder to accept EventContext
- Remove hardcoded GitHub assumptions
- Add platform context injection
- Create prompt templates for different platforms

## Technical Specifications

### EventContext Interface
```typescript
interface EventContext {
  platform: string;                // "github", "telegram", "discord"
  eventType: string;              // "issue_comment", "message", etc.
  source?: string;                // Platform-specific identifier
  repository?: string;            // GitHub: "owner/repo"
  issueNumber?: string;
  pullRequestNumber?: string;
  author: string;
  command: string;
  metadata?: {
    chatId?: string;              // Telegram
    messageId?: string;           
    channelId?: string;           // Discord/Slack
    threadId?: string;
    [key: string]: any;
  };
  authentication?: {
    github?: boolean;
    telegram?: boolean;
    discord?: boolean;
    [platform: string]: boolean;
  };
}
```

### Directory Structure
```
personal-agent/
├── reference/
│   └── claude-code-action/     # Submodule
├── src/
│   ├── adapters/
│   │   ├── event-context.ts    # EventContext adapter
│   │   └── github-adapter.ts   # GitHub event transformer
│   ├── prompts/
│   │   ├── builder.ts          # Platform-agnostic prompt builder
│   │   └── templates/          # Platform-specific templates
│   └── security/
│       ├── access-control.ts   # PAT-based access control
│       └── ci-spoofing.ts      # CI environment spoofing
```

## Testing Requirements

### Unit Tests
- EventContext transformation from GitHub events
- Prompt generation with different platforms
- Access control mode detection
- CI environment variable spoofing

### Integration Tests
- Full GitHub event flow (baseline)
- Claude Code Action invocation
- Error handling and retry logic
- PAT permission validation

### End-to-End Tests
- Complete workflow from event to response
- Multiple retry scenarios
- Access control enforcement
- Shell command execution in CI

## Definition of Done
- [ ] All unit tests passing
- [ ] Integration tests validated
- [ ] Security features verified working
- [ ] Documentation updated
- [ ] Code reviewed and approved
- [ ] No regression in GitHub functionality

## Risk Assessment

### High Priority Risks
1. **Breaking CI spoofing**: Could prevent all shell commands
   - Mitigation: Extensive testing before deployment
2. **Claude Code Action incompatibility**: Submodule may not integrate cleanly
   - Mitigation: Fork and modify if necessary

### Medium Priority Risks
1. **EventContext data loss**: Missing fields during transformation
   - Mitigation: Comprehensive field mapping and validation
2. **Prompt confusion**: Claude misinterpreting platform context
   - Mitigation: Clear, structured prompt templates

## Success Metrics
- Zero regression in existing GitHub functionality
- All security features operational
- EventContext successfully passed to Claude
- Claude correctly identifies platform in responses

## Team Assignments
- **Lead Developer**: Submodule integration, adapter development
- **Security Engineer**: Verify security features, access control
- **QA Engineer**: Test suite development, validation
- **DevOps**: CI/CD configuration, environment setup

## Daily Standup Topics

### Day 1
- Submodule integration status
- EventContext interface finalization
- Initial adapter implementation

### Day 2
- Security feature verification
- Prompt engineering progress
- Integration test results

### Day 3
- End-to-end testing
- Documentation completion
- Deployment preparation

## Dependencies
- Claude Code Action repository access
- GitHub Actions test environment
- Multiple PAT types for testing
- Claude API access token

## Deliverables
1. Integrated Claude Code Action submodule
2. EventContext adapter layer
3. Platform-agnostic prompt builder
4. Comprehensive test suite
5. Security validation report
6. Updated documentation