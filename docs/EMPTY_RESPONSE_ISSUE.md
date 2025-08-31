# Critical Issue: Claude CLI Returns Empty Response for Complex Tasks

## Problem Statement
When the Personal Agent receives complex, multi-part questions via GitHub comments, Claude CLI successfully processes the request but returns an empty response. This is unacceptable as users expect comprehensive answers to their queries.

### Example of Failing Query
```
@0x4007 Here's a complex task: Can you analyze the entire codebase structure, 
explain the architecture, list all the main components and their interactions, 
and suggest potential improvements? Please be thorough.
```

### Observed Behavior
- Workflow runs successfully (1m 51s for complex task)
- Claude CLI executes without errors
- Response posted to GitHub shows: "Claude generated an empty response."
- No error messages in logs
- Process terminates cleanly

## Current Implementation Details

### File: `src/handlers/claude-agent.ts`

The handler executes Claude CLI using Node.js `spawn()`:

1. **Command Construction** (lines 77-84):
   ```typescript
   const claudeArgs = [
     "--dangerously-skip-permissions",
     "-p",
     promptPath,
     "--verbose",
     "--output-format",
     "text", // Use text format for simpler parsing
   ];
   ```

2. **Process Spawning** (lines 93-103):
   ```typescript
   const claude = spawn(claudePath, claudeArgs, {
     env: {
       ...process.env,
       CLAUDE_CODE_OAUTH_TOKEN: process.env.CLAUDE_CODE_OAUTH_TOKEN,
       HOME: process.env.HOME || "/home/runner",
     },
     stdio: ["ignore", "pipe", "pipe"],
     detached: false,
   });
   ```

3. **Output Collection** (lines 108-120):
   ```typescript
   claude.stdout.on("data", (data) => {
     const chunk = data.toString();
     output += chunk;
     hasOutput = true;
     logger.verbose(`Claude stdout chunk: ${chunk.substring(0, 100)}...`);
   });
   ```

4. **Output Cleaning** (lines 136-146):
   ```typescript
   const cleanOutput = output
     .replace(/\x1b\[[0-9;]*m/g, "") // Remove ANSI color codes
     .replace(/^\s*Claude\s+Code\s+v[\d.]+\s*/gm, "") // Remove version headers
     .trim();
   
   resolve(cleanOutput || "Claude generated an empty response.");
   ```

## Diagnostic Steps

### 1. Check Raw Output
Add logging before and after cleaning to see what Claude actually returns:

```typescript
logger.info(`Raw Claude output length: ${output.length}`);
logger.info(`Raw Claude output (first 500 chars): ${output.substring(0, 500)}`);
// ... cleaning logic ...
logger.info(`Cleaned output length: ${cleanOutput.length}`);
logger.info(`Cleaned output (first 500 chars): ${cleanOutput.substring(0, 500)}`);
```

### 2. Check Claude CLI Behavior
Test Claude CLI directly in the GitHub Action environment:

```yaml
- name: Test Claude CLI Directly
  run: |
    echo "What is 2+2?" > test-prompt.txt
    claude --dangerously-skip-permissions -p test-prompt.txt --verbose --output-format text
  env:
    CLAUDE_CODE_OAUTH_TOKEN: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}
```

### 3. Monitor Memory and Output Size
Large responses might be truncated or cause issues:

```typescript
let totalBytes = 0;
claude.stdout.on("data", (data) => {
  totalBytes += data.length;
  logger.verbose(`Received chunk: ${data.length} bytes, total: ${totalBytes} bytes`);
  // ...
});
```

## Potential Root Causes

### 1. Output Format Issues
**Problem**: Claude CLI might output in a format that gets completely stripped by cleaning regex.

**Investigation**: 
- Check if `--output-format text` is actually working
- Try `--output-format json` and parse accordingly
- Remove the cleaning step temporarily to see raw output

### 2. Buffering Issues
**Problem**: Large responses might not be fully captured.

**Fix Options**:
```typescript
// Option A: Increase buffer size
const claude = spawn(claudePath, claudeArgs, {
  // ...
  stdio: ["ignore", "pipe", "pipe"],
  maxBuffer: 10 * 1024 * 1024, // 10MB buffer
});

// Option B: Use streams properly
const chunks = [];
claude.stdout.on("data", (chunk) => {
  chunks.push(chunk);
});
claude.stdout.on("end", () => {
  const output = Buffer.concat(chunks).toString();
  // process output
});
```

### 3. Claude CLI Interactive Mode
**Problem**: Claude CLI might be waiting for input or confirmation.

**Investigation**:
- Check if Claude CLI has a non-interactive flag
- Try piping an empty stdin: `stdio: ["pipe", "pipe", "pipe"]` and immediately close stdin
- Add `--yes` or `--non-interactive` flag if available

### 4. Timeout or Response Size Limits
**Problem**: Claude CLI might have internal limits for complex queries.

**Investigation**:
```typescript
// Add stderr monitoring for warnings
claude.stderr.on("data", (data) => {
  const chunk = data.toString();
  logger.warn(`Claude stderr: ${chunk}`); // Change from verbose to warn
});
```

### 5. Prompt File Encoding
**Problem**: Complex prompts might have encoding issues.

**Fix**:
```typescript
// Ensure UTF-8 BOM is not added
await writeFile(promptPath, prompt, { encoding: "utf8", flag: "w" });

// Or try with explicit buffer
await writeFile(promptPath, Buffer.from(prompt, "utf8"));
```

## Recommended Fix Approach

### Step 1: Add Comprehensive Logging
```typescript
async function executeClaudeCommand(prompt: string, logger: any): Promise<string> {
  logger.info(`Prompt length: ${prompt.length} characters`);
  logger.info(`First 200 chars of prompt: ${prompt.substring(0, 200)}`);
  
  // ... existing code ...
  
  let output = "";
  let errorOutput = "";
  let hasOutput = false;
  let chunkCount = 0;
  let totalBytes = 0;
  
  claude.stdout.on("data", (data) => {
    const chunk = data.toString();
    chunkCount++;
    totalBytes += data.length;
    output += chunk;
    hasOutput = true;
    
    logger.info(`Chunk ${chunkCount}: ${data.length} bytes`);
    logger.verbose(`Chunk content preview: ${chunk.substring(0, 100)}`);
  });
  
  // ... rest of implementation
}
```

### Step 2: Try Alternative Output Handling
```typescript
// Instead of concatenating strings, use array of buffers
const outputChunks: Buffer[] = [];

claude.stdout.on("data", (data) => {
  outputChunks.push(data);
  hasOutput = true;
});

claude.on("close", async (code) => {
  const output = Buffer.concat(outputChunks).toString("utf8");
  logger.info(`Total output: ${output.length} characters from ${outputChunks.length} chunks`);
  
  // Try without any cleaning first
  if (output.length === 0) {
    logger.error("Claude returned absolutely no output");
    reject(new Error("Claude CLI produced no output"));
  } else {
    logger.info(`Raw output first 1000 chars: ${output.substring(0, 1000)}`);
    resolve(output); // Return raw output initially for debugging
  }
});
```

### Step 3: Test with Simple vs Complex Prompts
Create a test to identify the threshold where responses become empty:

```typescript
// Add a test endpoint or temporary handler
export async function testClaudeScaling(context: Context) {
  const testPrompts = [
    "What is 2+2?", // Simple
    "Explain this codebase in 50 words", // Medium
    "Analyze the architecture in detail", // Complex
    // ... increasingly complex prompts
  ];
  
  for (const prompt of testPrompts) {
    const response = await executeClaudeCommand(prompt, context.logger);
    context.logger.info(`Prompt: "${prompt.substring(0, 50)}..." -> Response length: ${response.length}`);
  }
}
```

### Step 4: Implement Fallback Strategy
```typescript
// If Claude returns empty, try alternative approach
if (!cleanOutput || cleanOutput.length === 0) {
  logger.warn("Claude returned empty response, attempting retry with simplified prompt");
  
  // Simplify the prompt
  const simplifiedPrompt = `Please provide a brief response to: ${command.substring(0, 500)}`;
  
  // Retry with simplified version
  const retryResponse = await executeClaudeCommand(simplifiedPrompt, logger);
  
  if (retryResponse) {
    return `[Note: Complex query was simplified] ${retryResponse}`;
  }
}
```

## Testing Protocol

1. **Create test issue** with various complexity levels:
   ```bash
   gh issue create --title "Claude Response Testing" --body "Test issue for Claude responses"
   ```

2. **Test escalating complexity**:
   ```bash
   # Simple
   gh issue comment --body "@0x4007 What is 2+2?"
   
   # Medium
   gh issue comment --body "@0x4007 List the files in src/"
   
   # Complex
   gh issue comment --body "@0x4007 Analyze the entire codebase"
   ```

3. **Monitor logs** for each test:
   ```bash
   gh run view RUN_ID --log | grep -A10 -B10 "Claude"
   ```

## Success Criteria

1. ✅ Simple queries return appropriate responses
2. ✅ Complex queries return detailed responses (not empty)
3. ✅ Error messages are informative when issues occur
4. ✅ Response time remains reasonable (<3 minutes for complex tasks)
5. ✅ No workflow hanging or timeout issues

## Emergency Workaround

If Claude CLI continues to fail with complex prompts, implement a chunking strategy:

```typescript
function chunkPrompt(prompt: string, maxLength: number = 1000): string[] {
  const sentences = prompt.match(/[^.!?]+[.!?]+/g) || [prompt];
  const chunks: string[] = [];
  let current = "";
  
  for (const sentence of sentences) {
    if ((current + sentence).length > maxLength) {
      chunks.push(current.trim());
      current = sentence;
    } else {
      current += " " + sentence;
    }
  }
  
  if (current) chunks.push(current.trim());
  return chunks;
}

// Process in chunks and combine responses
const chunks = chunkPrompt(command);
const responses = [];

for (const chunk of chunks) {
  const response = await executeClaudeCommand(chunk, logger);
  responses.push(response);
}

return responses.join("\n\n");
```

## Files to Review

1. **Primary**: `/src/handlers/claude-agent.ts` (lines 63-169)
2. **Entry point**: `/src/action.ts` (lines 7-34)
3. **Workflow**: `/.github/workflows/compute.yml`
4. **Types**: `/src/types/context.ts`

## Environment Variables to Check

- `CLAUDE_CODE_OAUTH_TOKEN`: Ensure it's valid and has sufficient quota
- `CI`: Should be "true" in GitHub Actions
- `HOME`: Should be set correctly for Claude CLI to find config

## Related Issues

- Original integration PR: Check the PR that merged Claude integration
- GitHub Action runs: https://github.com/0x4007/personal-agent/actions
- Test issue: https://github.com/0x4007/personal-agent/issues/2

## Contact for Questions

- Check the Claude CLI documentation for updates
- Review the UbiquityOS SDK for any similar issues
- Test with different Claude CLI versions if available

---

**Priority**: HIGH - Users cannot receive responses to complex queries
**Estimated Fix Time**: 2-4 hours with proper debugging
**Risk**: Low - Changes are isolated to output handling