# Dual Personal Access Token System - Project Specification

## Executive Summary
Implement a dual-token authentication system for the Personal Agent that dynamically selects between read-only and full-access Personal Access Tokens (PATs) based on the invoker's identity. This provides maximum capability for self-invoked commands while maintaining security when the agent is invoked by external users.

## Current Architecture Overview

### System Components
1. **GitHub App**: Installed on all organization repositories
2. **Event Listener**: Monitors for `@username` mentions in issue comments
3. **Event Forwarder**: Dispatches events to the personal agent repository
4. **Personal Agent**: GitHub Action hosted on user's personal profile (`@0x4007/personal-agent`)
5. **Claude Integration**: Processes commands using Claude CLI with GitHub authentication

### Event Flow
```
External Repository → GitHub App → Event Forward → Personal Agent Action → Claude CLI → Response
```

## Problem Statement
Currently, the Personal Agent uses a single PAT for all operations, creating a security dilemma:
- **Too Permissive**: Write-access PAT allows external users to potentially trigger destructive operations
- **Too Restrictive**: Read-only PAT limits the agent owner's ability to perform useful automation

## Proposed Solution

### Dual-Token Architecture
Implement a system that selects the appropriate PAT based on the invoker:

```yaml
IF invoker == repository_owner ("0x4007"):
    USE full_access_pat
ELSE:
    USE read_only_pat
```

## Implementation Requirements

### 1. GitHub Secrets Configuration
Create two separate PATs and store them as GitHub Actions secrets:

```yaml
USER_PAT_FULL    # Full access token (self-invoked commands)
USER_PAT_READ    # Read-only token (external invocations)
```

#### Full Access PAT Permissions
- **Contents**: Read/Write
- **Pull requests**: Read/Write
- **Issues**: Read/Write
- **Actions**: Read/Write
- **Checks**: Write
- **Workflows**: Read/Write

#### Read-Only PAT Permissions
- **Contents**: Read
- **Pull requests**: Read
- **Issues**: Read
- **Actions**: Read
- **Metadata**: Read
- **Workflows**: Read

### 2. Invoker Detection Logic

#### Modify `src/handlers/claude-agent.ts`
Add logic to detect the invoker and select appropriate token:

```typescript
interface TokenSelectionContext {
  invokerLogin: string;        // GitHub username of comment author
  repositoryOwner: string;      // Owner of the repo where agent lives
  agentOwner: string;          // Owner of the personal agent (from AGENT_OWNER env)
  isSelfInvoked: boolean;      // Computed: invokerLogin === agentOwner
  selectedToken: string;        // The PAT to use
  tokenType: 'full' | 'read';  // For logging purposes
}

function selectAuthToken(context: Context): TokenSelectionContext {
  const invokerLogin = context.payload.comment.user?.login;
  const agentOwner = context.env.AGENT_OWNER;
  
  const isSelfInvoked = invokerLogin === agentOwner;
  
  const selectedToken = isSelfInvoked 
    ? process.env.USER_PAT_FULL || process.env.USER_PAT
    : process.env.USER_PAT_READ || process.env.USER_PAT;
    
  return {
    invokerLogin,
    repositoryOwner: context.payload.repository.owner.login,
    agentOwner,
    isSelfInvoked,
    selectedToken,
    tokenType: isSelfInvoked ? 'full' : 'read'
  };
}
```

### 3. Update Authentication Flow

#### Modify the `executeClaudeCommandInternal` function:
```typescript
async function executeClaudeCommandInternal(
  prompt: string,
  logger: Logger,
  context: Context  // Add context parameter
): Promise<string> {
  // Select appropriate token based on invoker
  const tokenContext = selectAuthToken(context);
  
  logger.info(`Invoker: ${tokenContext.invokerLogin}, Using ${tokenContext.tokenType} access token`);
  
  // Configure GitHub CLI with selected token
  if (tokenContext.selectedToken) {
    await configureGitHubAuth(tokenContext.selectedToken, logger);
  }
  
  // Include token context in Claude environment
  const claude = spawn(claudePath, claudeArgs, {
    env: {
      ...process.env,
      GITHUB_TOKEN: tokenContext.selectedToken,
      GH_TOKEN: tokenContext.selectedToken,
      TOKEN_ACCESS_LEVEL: tokenContext.tokenType,  // Let Claude know the access level
    }
  });
  
  // ... rest of implementation
}
```

### 4. Claude Prompt Enhancement
Modify the Claude prompt to include access level awareness:

```typescript
const claudePrompt = `You are a helpful GitHub assistant responding to a command in a GitHub issue comment.

IMPORTANT: You are operating with ${tokenContext.tokenType === 'read' ? 'READ-ONLY' : 'FULL'} access.
${tokenContext.tokenType === 'read' ? 
  '- You CANNOT: create commits, push branches, open PRs, or modify issues\n' +
  '- You CAN: read code, analyze repositories, search for information' :
  '- You have full read/write access to perform any GitHub operations'
}

Issue Context:
- Repository: ${owner}/${repo}
- Issue #${issueNumber}
- Comment by: ${sender} ${sender === agentOwner ? '(SELF-INVOKED)' : '(EXTERNAL USER)'}
- Command: ${command}

Please provide a helpful and concise response to this command. Be friendly and professional.
${tokenContext.tokenType === 'read' ? 'If the user requests write operations, politely explain that you only have read access.' : ''}`;
```

### 5. GitHub Actions Workflow Updates

#### Update `.github/workflows/compute.yml`:
```yaml
env:
  PLUGIN_GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  KERNEL_PUBLIC_KEY: ${{ secrets.KERNEL_PUBLIC_KEY }}
  LOG_LEVEL: ${{ secrets.LOG_LEVEL || 'info' }}
  AGENT_OWNER: ${{ github.repository_owner }}
  # Dual PAT system
  USER_PAT: ${{ secrets.USER_PAT_READ }}        # Fallback/default
  USER_PAT_FULL: ${{ secrets.USER_PAT_FULL }}   # Full access token
  USER_PAT_READ: ${{ secrets.USER_PAT_READ }}   # Read-only token
```

### 6. Security Audit Logging
Add comprehensive logging for security auditing:

```typescript
interface AuditLog {
  timestamp: Date;
  invoker: string;
  isSelfInvoked: boolean;
  tokenType: 'full' | 'read';
  command: string;
  repository: string;
  issueNumber: number;
  operations: string[];  // Track what operations were attempted
}

function logSecurityAudit(audit: AuditLog, logger: Logger): void {
  logger.info('SECURITY_AUDIT', {
    ...audit,
    timestamp: audit.timestamp.toISOString()
  });
  
  // If write operations were attempted with read token, log warning
  if (audit.tokenType === 'read' && hasWriteOperations(audit.operations)) {
    logger.warn('WRITE_ATTEMPT_WITH_READ_TOKEN', audit);
  }
}
```

## Testing Strategy

### 1. Unit Tests
Create tests for token selection logic:
```typescript
describe('Token Selection', () => {
  it('should select full access token for self-invoked commands', () => {
    const context = createMockContext({ invoker: '0x4007', owner: '0x4007' });
    const result = selectAuthToken(context);
    expect(result.tokenType).toBe('full');
  });
  
  it('should select read-only token for external invocations', () => {
    const context = createMockContext({ invoker: 'external-user', owner: '0x4007' });
    const result = selectAuthToken(context);
    expect(result.tokenType).toBe('read');
  });
});
```

### 2. Integration Tests
Test actual GitHub operations with both tokens:
- **Read-only test**: Verify read operations succeed, write operations fail gracefully
- **Full access test**: Verify all operations work when self-invoked

### 3. Manual Testing Checklist
- [ ] External user invokes agent → only read operations work
- [ ] Self-invoke agent → all operations work
- [ ] Missing USER_PAT_FULL falls back to USER_PAT
- [ ] Missing USER_PAT_READ falls back to USER_PAT
- [ ] Audit logs correctly identify token type and invoker

## Migration Plan

### Phase 1: Preparation
1. Create two new PATs with appropriate permissions
2. Add new secrets to GitHub repository settings
3. Document the new token system

### Phase 2: Implementation
1. Implement token selection logic
2. Update authentication flow
3. Add audit logging
4. Update tests

### Phase 3: Deployment
1. Deploy to development branch
2. Test with both self-invoked and external invocations
3. Monitor audit logs
4. Deploy to main branch

### Phase 4: Cleanup
1. Revoke old single PAT
2. Update documentation
3. Notify team of changes

## Security Considerations

### Token Storage
- Store tokens only in GitHub Secrets
- Never log token values
- Rotate tokens every 90 days

### Access Control Matrix
| Operation | Self-Invoked | External User |
|-----------|-------------|---------------|
| Read code | ✅ | ✅ |
| Search issues | ✅ | ✅ |
| Create commits | ✅ | ❌ |
| Push branches | ✅ | ❌ |
| Open PRs | ✅ | ❌ |
| Merge PRs | ✅ | ❌ |
| Delete branches | ✅ | ❌ |
| Force push | ✅ | ❌ |

### Risk Mitigation
1. **Branch Protection**: Maintain branch protection rules regardless of token permissions
2. **Rate Limiting**: Implement rate limiting for external invocations
3. **Command Filtering**: Consider blocking certain commands for external users at the application level
4. **Audit Trail**: Maintain comprehensive logs of all operations

## Success Criteria
1. ✅ External users cannot perform write operations
2. ✅ Agent owner retains full automation capabilities
3. ✅ Clear audit trail of who invoked what operations
4. ✅ Graceful handling of permission errors
5. ✅ No disruption to existing functionality

## Future Enhancements
1. **Role-based access**: Different permission levels for trusted collaborators
2. **Command allowlisting**: Specific commands available to external users
3. **Temporary elevation**: Time-limited permission elevation for specific tasks
4. **Organization-level tokens**: Different tokens for different organizations

## References
- [GitHub Fine-grained PAT Documentation](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token#creating-a-fine-grained-personal-access-token)
- [GitHub Actions Security Best Practices](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions)
- [Current Implementation](src/handlers/claude-agent.ts)

## Appendix: Environment Variables

### Required Secrets
```yaml
# GitHub Actions Secrets (Repository Settings)
USER_PAT_FULL         # Full access PAT (contents, PRs, issues: write)
USER_PAT_READ         # Read-only PAT (all permissions: read)
CLAUDE_CODE_OAUTH_TOKEN  # Claude authentication token (existing)
KERNEL_PUBLIC_KEY     # Kernel signature verification (existing)
```

### Runtime Environment Variables
```yaml
# Set by GitHub Actions
AGENT_OWNER          # Repository owner (e.g., "0x4007")
GITHUB_TOKEN         # Default Actions token (existing)
TOKEN_ACCESS_LEVEL   # "full" or "read" (passed to Claude)
```