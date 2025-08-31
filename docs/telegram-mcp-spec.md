# Telegram MCP Extension Specification

## Project Overview
This specification outlines the development of a Telegram Model Context Protocol (MCP) server that enables the Personal Agent to interact with Telegram as a platform, allowing Claude to send messages, manage chats, and perform bot operations.

## Objective
Create an MCP server that provides Claude with native Telegram capabilities, enabling the Personal Agent to respond to Telegram events and execute Telegram-specific operations seamlessly.

## Background
- The Personal Agent will receive Telegram events via UbiquityOS
- Claude needs platform-specific tools to interact with Telegram
- MCP provides a standardized way to expose platform capabilities to Claude
- This extends the agent's reach beyond GitHub to messaging platforms

## Architecture

### MCP Server Design
```
┌─────────────────┐     ┌──────────────┐     ┌─────────────┐
│  Claude Agent   │────▶│  Telegram    │────▶│  Telegram   │
│  (GitHub Action)│     │  MCP Server  │     │  Bot API    │
└─────────────────┘     └──────────────┘     └─────────────┘
        │                        │
        ▼                        ▼
   EventContext           Bot Credentials
   (platform: telegram)   (TELEGRAM_BOT_TOKEN)
```

## Technical Requirements

### 1. MCP Server Implementation

#### Core Structure
```typescript
interface TelegramMCPServer {
  name: "telegram-mcp";
  version: "1.0.0";
  description: "Telegram Bot API integration for Claude";
  
  tools: {
    // Message operations
    sendMessage: TelegramTool;
    editMessage: TelegramTool;
    deleteMessage: TelegramTool;
    forwardMessage: TelegramTool;
    
    // Media operations
    sendPhoto: TelegramTool;
    sendDocument: TelegramTool;
    sendVideo: TelegramTool;
    sendAudio: TelegramTool;
    
    // Chat management
    getChatInfo: TelegramTool;
    getChatMembers: TelegramTool;
    pinMessage: TelegramTool;
    unpinMessage: TelegramTool;
    
    // User operations
    getUserInfo: TelegramTool;
    getChatMember: TelegramTool;
    
    // Bot operations
    setWebhook: TelegramTool;
    getWebhookInfo: TelegramTool;
    getBotInfo: TelegramTool;
    
    // Inline operations
    answerInlineQuery: TelegramTool;
    answerCallbackQuery: TelegramTool;
  };
}
```

### 2. Tool Definitions

#### Send Message Tool
```typescript
{
  name: "telegram_send_message",
  description: "Send a text message to a Telegram chat",
  parameters: {
    chat_id: string | number;  // Chat ID from EventContext
    text: string;               // Message content
    parse_mode?: "Markdown" | "HTML" | "MarkdownV2";
    reply_to_message_id?: number;
    disable_notification?: boolean;
    reply_markup?: InlineKeyboardMarkup | ReplyKeyboardMarkup;
  },
  returns: {
    message_id: number;
    success: boolean;
    error?: string;
  }
}
```

#### Edit Message Tool
```typescript
{
  name: "telegram_edit_message",
  description: "Edit an existing message in a Telegram chat",
  parameters: {
    chat_id: string | number;
    message_id: number;
    text?: string;
    parse_mode?: "Markdown" | "HTML" | "MarkdownV2";
    reply_markup?: InlineKeyboardMarkup;
  },
  returns: {
    success: boolean;
    error?: string;
  }
}
```

### 3. EventContext Integration

#### Telegram Event Structure
```typescript
interface TelegramEventContext extends EventContext {
  platform: "telegram";
  eventType: "message" | "callback_query" | "inline_query" | "edited_message";
  metadata: {
    chatId: string | number;
    messageId?: number;
    userId: number;
    username?: string;
    firstName?: string;
    lastName?: string;
    chatType: "private" | "group" | "supergroup" | "channel";
    chatTitle?: string;
    replyToMessageId?: number;
    callbackData?: string;
    inlineQueryId?: string;
  };
}
```

### 4. Authentication & Authorization

#### Credential Management
```yaml
Environment Variables:
  TELEGRAM_BOT_TOKEN: "bot_token_from_botfather"
  TELEGRAM_WEBHOOK_SECRET: "optional_webhook_verification"
```

#### Security Features
1. **Token Validation**: Verify bot token with Telegram API
2. **Chat Authorization**: Validate bot has access to target chat
3. **Rate Limiting**: Respect Telegram API rate limits (30 msgs/sec)
4. **Error Handling**: Graceful handling of API errors

### 5. Message Formatting

#### Markdown Support
```typescript
interface MessageFormatter {
  // Convert Claude's markdown to Telegram's MarkdownV2
  formatForTelegram(text: string): string;
  
  // Handle code blocks
  formatCodeBlock(code: string, language?: string): string;
  
  // Handle mentions
  formatMention(userId: number, name: string): string;
  
  // Handle links
  formatLink(url: string, text?: string): string;
}
```

#### Rich Media Support
- **Photos**: Upload and send images with captions
- **Documents**: Send files up to 50MB
- **Videos**: Send video files with thumbnails
- **Audio**: Send audio files with metadata

### 6. Webhook Integration

#### Webhook Handler
```typescript
interface WebhookHandler {
  // Process incoming Telegram updates
  handleUpdate(update: TelegramUpdate): EventContext;
  
  // Verify webhook signature
  verifyWebhook(signature: string, body: string): boolean;
  
  // Transform Telegram update to EventContext
  transformToEventContext(update: TelegramUpdate): TelegramEventContext;
}
```

### 7. Interactive Features

#### Inline Keyboards
```typescript
interface InlineKeyboard {
  // Create button rows
  addRow(buttons: InlineKeyboardButton[]): void;
  
  // Add callback button
  addCallbackButton(text: string, data: string): void;
  
  // Add URL button
  addUrlButton(text: string, url: string): void;
  
  // Build keyboard markup
  build(): InlineKeyboardMarkup;
}
```

#### Callback Query Handling
- Process button clicks
- Update messages based on callbacks
- Maintain conversation state

## Implementation Plan

### Phase 1: Core MCP Server (Day 1-2)
1. **Project Setup** (Hours 1-4)
   - Initialize MCP server project
   - Set up TypeScript configuration
   - Install Telegram Bot API SDK

2. **Basic Tools Implementation** (Hours 5-12)
   - sendMessage
   - editMessage
   - deleteMessage
   - getChatInfo

3. **Authentication** (Hours 13-16)
   - Bot token validation
   - Credential management

### Phase 2: Extended Features (Day 2-3)
1. **Media Operations** (Hours 17-24)
   - Photo sending
   - Document handling
   - Video/Audio support

2. **Interactive Features** (Hours 25-32)
   - Inline keyboards
   - Callback query handling
   - Reply keyboards

3. **Message Formatting** (Hours 33-40)
   - Markdown conversion
   - Code block formatting
   - Mention handling

### Phase 3: Integration & Testing (Day 3-4)
1. **EventContext Integration** (Hours 41-48)
   - Update transformer
   - Context enrichment
   - Metadata extraction

2. **Testing Suite** (Hours 49-56)
   - Unit tests for each tool
   - Integration tests with bot API
   - Mock Telegram server for testing

3. **Documentation** (Hours 57-64)
   - Tool usage examples
   - Integration guide
   - Troubleshooting guide

**Total Duration**: 4 days (accelerated from 3 weeks)

## Claude Integration Examples

### Example 1: Responding to a Message
```typescript
// EventContext received by Claude
{
  platform: "telegram",
  eventType: "message",
  command: "@agent help me debug this code",
  metadata: {
    chatId: -1001234567890,
    messageId: 123,
    userId: 987654321,
    username: "johndoe",
    chatType: "group"
  }
}

// Claude's response using MCP tools
await telegram_send_message({
  chat_id: -1001234567890,
  text: "I'll help you debug that code. Let me analyze it...",
  reply_to_message_id: 123,
  parse_mode: "MarkdownV2"
});
```

### Example 2: Sending Code with Formatting
```typescript
await telegram_send_message({
  chat_id: chatId,
  text: `Here's the corrected code:\n\n\`\`\`python\ndef fix_bug(data):\n    return data.strip()\n\`\`\`\n\nThe issue was with whitespace handling.`,
  parse_mode: "MarkdownV2"
});
```

## Security Considerations

### 1. Token Protection
- Never log bot tokens
- Use environment variables only
- Rotate tokens periodically

### 2. Access Control
- Verify bot permissions in chats
- Implement user allowlists if needed
- Log all operations for audit

### 3. Rate Limiting
- Implement exponential backoff
- Queue messages if hitting limits
- Monitor API usage

### 4. Input Validation
- Sanitize user inputs
- Validate chat IDs
- Check message length limits (4096 chars)

## Testing Strategy

### Unit Tests
```typescript
describe('Telegram MCP Server', () => {
  test('sendMessage with valid parameters');
  test('sendMessage with invalid chat_id');
  test('editMessage on existing message');
  test('markdown formatting conversion');
  test('rate limit handling');
});
```

### Integration Tests
- Test with real Telegram bot (test environment)
- Verify webhook processing
- Test media uploads
- Validate callback handling

### End-to-End Tests
- Full flow from Telegram message to Claude response
- Multi-turn conversations
- Error recovery scenarios
- Performance under load

## Performance Requirements

1. **Response Time**: < 2 seconds for message sending
2. **Throughput**: Handle 30 messages/second (Telegram limit)
3. **Reliability**: 99.9% uptime for MCP server
4. **Scalability**: Support multiple simultaneous chats

## Monitoring & Logging

### Metrics to Track
- Message send success rate
- API response times
- Error rates by type
- Active chat count
- Token usage

### Logging Requirements
```typescript
interface LogEntry {
  timestamp: Date;
  operation: string;
  chatId: string | number;
  userId?: number;
  success: boolean;
  error?: string;
  responseTime: number;
}
```

## Dependencies

1. **Telegram Bot API SDK**: `node-telegram-bot-api` or `telegraf`
2. **MCP SDK**: Official MCP server SDK
3. **TypeScript**: For type safety
4. **Environment Management**: `dotenv` for credentials
5. **Testing**: `jest` for unit tests
6. **HTTP Client**: `axios` for API requests

## Deliverables

1. **Telegram MCP Server Package**
   - Fully functional MCP server
   - All tools implemented
   - TypeScript definitions

2. **Integration Module**
   - EventContext transformer
   - Webhook handler
   - Message formatter

3. **Documentation**
   - API reference
   - Integration guide
   - Usage examples

4. **Testing Suite**
   - Unit tests
   - Integration tests
   - Test fixtures

5. **Deployment Guide**
   - Server setup instructions
   - Environment configuration
   - Security checklist

## Future Enhancements

### Phase 4: Advanced Features
1. **Voice Messages**: Transcription and response
2. **Stickers/GIFs**: Rich media responses
3. **Groups Management**: Admin operations
4. **Payments**: Telegram payment integration
5. **Games**: Bot game integration

### Phase 5: AI Enhancements
1. **Context Awareness**: Message history analysis
2. **Smart Replies**: Suggested responses
3. **Language Detection**: Multi-language support
4. **Sentiment Analysis**: Tone-appropriate responses

## Success Criteria

1. **Functional**: All core Telegram operations work via MCP
2. **Reliable**: 99.9% success rate for API operations
3. **Performant**: Sub-second response times
4. **Secure**: No token leaks or unauthorized access
5. **Intuitive**: Claude can naturally use Telegram tools
6. **Documented**: Complete documentation and examples

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| API Rate Limits | High | Implement queuing and backoff |
| Token Exposure | Critical | Strict env var management |
| Message Formatting Issues | Medium | Comprehensive formatter testing |
| Network Failures | Medium | Retry logic with exponential backoff |
| Large Media Handling | Low | Stream processing for large files |

## Notes for Implementation Team

1. **Start Simple**: Begin with text messages, add media later
2. **Test Early**: Set up test bot immediately
3. **Document Everything**: Every tool needs clear examples
4. **Handle Errors Gracefully**: Telegram API can be flaky
5. **Consider UX**: Format messages for readability
6. **Security First**: Never compromise on token safety
7. **Claude Context**: Always provide rich context about the chat
8. **Respect Limits**: Telegram has strict rate limits