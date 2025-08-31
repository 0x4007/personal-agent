# Sprint 2: Platform Abstraction Layer
**Duration**: 3 days  
**Priority**: Critical  
**Dependencies**: Sprint 1 completion

## Sprint Goals
1. Remove GitHub-specific assumptions from core logic
2. Implement multi-platform credential management
3. Create platform-specific response formatters
4. Enable dynamic tool selection based on platform

## User Stories

### Story 2.1: Platform-Agnostic Core
**As a** system architect  
**I want to** remove all GitHub-specific code from core logic  
**So that** the agent can work with any platform

**Acceptance Criteria:**
- [ ] Core logic has no hardcoded GitHub references
- [ ] Platform detection uses EventContext.platform field
- [ ] Conditional logic based on platform parameter
- [ ] All GitHub-specific code isolated in adapters

**Tasks:**
- Audit codebase for GitHub assumptions
- Replace hardcoded values with platform conditionals
- Extract GitHub-specific logic to adapter layer
- Create platform registry for supported platforms

### Story 2.2: Multi-Platform Credential Management
**As a** platform operator  
**I want to** manage credentials for multiple platforms  
**So that** the agent can authenticate with various services

**Acceptance Criteria:**
- [ ] Support for multiple credential environment variables
- [ ] Credential availability passed in EventContext.authentication
- [ ] Secure credential isolation per platform
- [ ] Graceful handling of missing credentials

**Tasks:**
- Rename `USER_PAT` to `GITHUB_PAT`
- Add support for `TELEGRAM_BOT_TOKEN`, `DISCORD_BOT_TOKEN`, etc.
- Create credential manager service
- Implement credential validation on startup
- Add authentication field population in EventContext

### Story 2.3: Response Formatter System
**As a** user  
**I want to** receive properly formatted responses  
**So that** messages display correctly on each platform

**Acceptance Criteria:**
- [ ] Platform-specific formatters implemented
- [ ] GitHub: Full markdown with code blocks
- [ ] Telegram: MarkdownV2 format
- [ ] Discord: Discord-flavored markdown
- [ ] Fallback to plain text when needed

**Tasks:**
- Create formatter interface
- Implement GitHub markdown formatter
- Implement Telegram MarkdownV2 formatter
- Implement Discord formatter
- Add formatter selection based on platform
- Create unit tests for each formatter

### Story 2.4: Dynamic Tool Selection
**As a** Claude agent  
**I want to** know which tools are available  
**So that** I can use platform-appropriate operations

**Acceptance Criteria:**
- [ ] Tool availability communicated in prompts
- [ ] MCP tools listed based on platform
- [ ] GitHub CLI shown only for GitHub events
- [ ] Clear indication of available capabilities

**Tasks:**
- Create tool registry system
- Map platforms to available tools
- Inject tool list into prompts
- Document tool selection logic
- Test tool availability detection

## Technical Specifications

### Platform Registry
```typescript
interface PlatformConfig {
  name: string;
  formatter: ResponseFormatter;
  tools: string[];
  credentialEnvVar: string;
  features: {
    supportsMarkdown: boolean;
    supportsCodeBlocks: boolean;
    supportsInlineImages: boolean;
    maxMessageLength: number;
  };
}

const PLATFORM_REGISTRY: Map<string, PlatformConfig> = new Map([
  ['github', {
    name: 'GitHub',
    formatter: new GitHubFormatter(),
    tools: ['gh', 'git', 'shell'],
    credentialEnvVar: 'GITHUB_PAT',
    features: {
      supportsMarkdown: true,
      supportsCodeBlocks: true,
      supportsInlineImages: true,
      maxMessageLength: 65536
    }
  }],
  ['telegram', {
    name: 'Telegram',
    formatter: new TelegramFormatter(),
    tools: ['telegram-mcp', 'shell'],
    credentialEnvVar: 'TELEGRAM_BOT_TOKEN',
    features: {
      supportsMarkdown: true,
      supportsCodeBlocks: true,
      supportsInlineImages: false,
      maxMessageLength: 4096
    }
  }]
]);
```

### Credential Manager
```typescript
class CredentialManager {
  private credentials: Map<string, string>;
  
  constructor() {
    this.loadCredentials();
  }
  
  private loadCredentials(): void {
    this.credentials = new Map([
      ['github', process.env.GITHUB_PAT || ''],
      ['telegram', process.env.TELEGRAM_BOT_TOKEN || ''],
      ['discord', process.env.DISCORD_BOT_TOKEN || ''],
      ['slack', process.env.SLACK_APP_TOKEN || '']
    ]);
  }
  
  hasCredential(platform: string): boolean {
    return !!this.credentials.get(platform);
  }
  
  getCredential(platform: string): string | undefined {
    return this.credentials.get(platform);
  }
  
  getAvailablePlatforms(): string[] {
    return Array.from(this.credentials.entries())
      .filter(([_, token]) => !!token)
      .map(([platform, _]) => platform);
  }
}
```

### Response Formatters
```typescript
interface ResponseFormatter {
  format(text: string): string;
  formatCode(code: string, language?: string): string;
  formatError(error: string): string;
  formatList(items: string[]): string;
  truncate(text: string): string;
}

class GitHubFormatter implements ResponseFormatter {
  format(text: string): string {
    return text; // GitHub supports full markdown
  }
  
  formatCode(code: string, language = ''): string {
    return `\`\`\`${language}\n${code}\n\`\`\``;
  }
  
  formatError(error: string): string {
    return `❌ **Error**: ${error}`;
  }
  
  formatList(items: string[]): string {
    return items.map(item => `- ${item}`).join('\n');
  }
  
  truncate(text: string): string {
    return text; // GitHub has high limit
  }
}

class TelegramFormatter implements ResponseFormatter {
  format(text: string): string {
    // Convert to MarkdownV2
    return text
      .replace(/([_*\[\]()~`>#+\-=|{}.!])/g, '\\$1');
  }
  
  formatCode(code: string, language = ''): string {
    return `\`\`\`${language}\n${code}\n\`\`\``;
  }
  
  formatError(error: string): string {
    return `❌ *Error*: ${this.format(error)}`;
  }
  
  formatList(items: string[]): string {
    return items.map(item => `• ${this.format(item)}`).join('\n');
  }
  
  truncate(text: string): string {
    if (text.length > 4096) {
      return text.substring(0, 4090) + '...';
    }
    return text;
  }
}
```

## Testing Requirements

### Unit Tests
- Platform registry lookups
- Credential manager operations
- Each formatter implementation
- Tool selection logic
- Platform detection from EventContext

### Integration Tests
- Multi-platform event processing
- Credential loading and validation
- Response formatting per platform
- Tool availability in prompts

### End-to-End Tests
- GitHub event with GitHub formatting
- Simulated Telegram event with Telegram formatting
- Missing credential handling
- Platform fallback scenarios

## Definition of Done
- [ ] All GitHub-specific code extracted
- [ ] Platform registry implemented
- [ ] Credential manager functional
- [ ] All formatters working
- [ ] Tests passing
- [ ] Documentation updated

## Risk Assessment

### High Priority Risks
1. **Breaking existing GitHub functionality**: Abstraction might break current features
   - Mitigation: Comprehensive regression testing
2. **Credential leakage**: Multi-platform credentials increase attack surface
   - Mitigation: Strict isolation, no logging of credentials

### Medium Priority Risks
1. **Formatter compatibility**: Platform formatting differences cause issues
   - Mitigation: Extensive testing with real platforms
2. **Tool confusion**: Claude selecting wrong tools
   - Mitigation: Clear tool descriptions in prompts

## Success Metrics
- Platform detection 100% accurate
- No GitHub-specific code in core
- All formatters produce valid output
- Credentials properly isolated
- Tool selection appropriate for platform

## Dependencies
- Sprint 1 completion
- Platform documentation for formatting rules
- Test accounts for each platform
- Environment variable configuration

## Deliverables
1. Platform registry implementation
2. Credential manager service
3. Response formatter system
4. Platform-agnostic core logic
5. Updated prompt templates
6. Comprehensive test coverage