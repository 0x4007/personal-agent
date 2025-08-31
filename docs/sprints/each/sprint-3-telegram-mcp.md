# Sprint 3: Telegram MCP Development
**Duration**: 4 days  
**Priority**: High  
**Dependencies**: Sprint 2 completion, MCP SDK

## Sprint Goals
1. Build fully functional Telegram MCP server
2. Implement core Telegram Bot API operations
3. Enable Claude to send and receive Telegram messages
4. Create robust message formatting system

## User Stories

### Story 3.1: MCP Server Foundation
**As a** developer  
**I want to** create the Telegram MCP server structure  
**So that** Claude can access Telegram functionality

**Acceptance Criteria:**
- [ ] MCP server initialized with proper configuration
- [ ] Server exposes tools via MCP protocol
- [ ] Authentication with Telegram Bot API working
- [ ] Basic health check endpoint available

**Tasks:**
- Initialize MCP server project
- Set up TypeScript and build configuration
- Install Telegram Bot API SDK (telegraf/node-telegram-bot-api)
- Implement MCP server interface
- Create authentication service
- Add health monitoring

### Story 3.2: Core Messaging Tools
**As a** Claude agent  
**I want to** send and manage messages in Telegram  
**So that** I can respond to user requests

**Acceptance Criteria:**
- [ ] `telegram_send_message` tool functional
- [ ] `telegram_edit_message` tool functional
- [ ] `telegram_delete_message` tool functional
- [ ] `telegram_forward_message` tool functional
- [ ] Proper error handling for all operations

**Tasks:**
- Implement sendMessage with all parameters
- Add message editing capability
- Create delete message function
- Implement message forwarding
- Add retry logic for network failures
- Create comprehensive error responses

### Story 3.3: Media Operations
**As a** user  
**I want to** send and receive media files  
**So that** the agent can work with rich content

**Acceptance Criteria:**
- [ ] Send photos with captions
- [ ] Send documents up to 50MB
- [ ] Send videos with thumbnails
- [ ] Send audio files with metadata
- [ ] Handle file upload errors gracefully

**Tasks:**
- Implement sendPhoto tool
- Create sendDocument handler
- Add sendVideo functionality
- Implement sendAudio tool
- Add file size validation
- Create upload progress tracking

### Story 3.4: Message Formatting System
**As a** Claude agent  
**I want to** format messages properly for Telegram  
**So that** they display correctly to users

**Acceptance Criteria:**
- [ ] Markdown to MarkdownV2 conversion
- [ ] Code block formatting preserved
- [ ] Special characters properly escaped
- [ ] Message truncation for 4096 char limit
- [ ] Link and mention formatting

**Tasks:**
- Create MarkdownV2 converter
- Implement code block handler
- Add special character escaping
- Create message truncation logic
- Implement mention formatter
- Add link formatting support

### Story 3.5: Interactive Features
**As a** user  
**I want to** use inline keyboards and buttons  
**So that** I can interact with the agent easily

**Acceptance Criteria:**
- [ ] Inline keyboard creation
- [ ] Callback query handling
- [ ] Reply keyboard support
- [ ] Button action processing
- [ ] State management for interactions

**Tasks:**
- Implement inline keyboard builder
- Create callback query handler
- Add reply keyboard support
- Implement button action router
- Create conversation state manager
- Add keyboard removal functionality

## Technical Specifications

### MCP Server Structure
```typescript
// telegram-mcp/src/server.ts
import { MCPServer } from '@modelcontextprotocol/sdk';
import TelegramBot from 'node-telegram-bot-api';

class TelegramMCPServer extends MCPServer {
  private bot: TelegramBot;
  
  constructor(token: string) {
    super({
      name: 'telegram-mcp',
      version: '1.0.0',
      description: 'Telegram Bot API integration for Claude'
    });
    
    this.bot = new TelegramBot(token, { polling: false });
    this.registerTools();
  }
  
  private registerTools(): void {
    this.addTool({
      name: 'telegram_send_message',
      description: 'Send a text message to a Telegram chat',
      parameters: {
        type: 'object',
        properties: {
          chat_id: { 
            type: ['string', 'number'],
            description: 'Unique identifier for the target chat'
          },
          text: {
            type: 'string',
            description: 'Text of the message to be sent'
          },
          parse_mode: {
            type: 'string',
            enum: ['Markdown', 'MarkdownV2', 'HTML'],
            description: 'Mode for parsing entities in the message text'
          },
          reply_to_message_id: {
            type: 'number',
            description: 'If the message is a reply, ID of the original message'
          }
        },
        required: ['chat_id', 'text']
      },
      handler: this.sendMessage.bind(this)
    });
  }
  
  private async sendMessage(params: any): Promise<any> {
    try {
      const message = await this.bot.sendMessage(
        params.chat_id,
        params.text,
        {
          parse_mode: params.parse_mode || 'MarkdownV2',
          reply_to_message_id: params.reply_to_message_id
        }
      );
      
      return {
        success: true,
        message_id: message.message_id,
        chat_id: message.chat.id
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}
```

### Message Formatter
```typescript
// telegram-mcp/src/formatter.ts
export class TelegramFormatter {
  private static readonly SPECIAL_CHARS = /([_*\[\]()~`>#+\-=|{}.!])/g;
  private static readonly MAX_MESSAGE_LENGTH = 4096;
  
  /**
   * Convert standard markdown to Telegram's MarkdownV2
   */
  static toMarkdownV2(text: string): string {
    // Escape special characters
    let formatted = text.replace(this.SPECIAL_CHARS, '\\$1');
    
    // Handle code blocks
    formatted = formatted.replace(
      /```(\w*)\n([\s\S]*?)```/g,
      (match, lang, code) => {
        const escapedCode = code.replace(/\\/g, '\\\\');
        return `\`\`\`${lang}\n${escapedCode}\n\`\`\``;
      }
    );
    
    // Handle inline code
    formatted = formatted.replace(
      /`([^`]+)`/g,
      (match, code) => `\`${code.replace(/\\/g, '\\\\')}\``
    );
    
    return formatted;
  }
  
  /**
   * Truncate message to Telegram's limit
   */
  static truncate(text: string): string {
    if (text.length <= this.MAX_MESSAGE_LENGTH) {
      return text;
    }
    
    const truncated = text.substring(0, this.MAX_MESSAGE_LENGTH - 10);
    const lastNewline = truncated.lastIndexOf('\n');
    
    if (lastNewline > this.MAX_MESSAGE_LENGTH - 100) {
      return truncated.substring(0, lastNewline) + '\n\\.\\.\\.';
    }
    
    return truncated + '\\.\\.\\.';
  }
  
  /**
   * Format user mention
   */
  static mention(userId: number, name: string): string {
    return `[${this.escape(name)}](tg://user?id=${userId})`;
  }
  
  /**
   * Format link
   */
  static link(url: string, text?: string): string {
    const escaped = this.escape(text || url);
    return `[${escaped}](${url})`;
  }
  
  private static escape(text: string): string {
    return text.replace(this.SPECIAL_CHARS, '\\$1');
  }
}
```

### Inline Keyboard Builder
```typescript
// telegram-mcp/src/keyboard.ts
export class InlineKeyboardBuilder {
  private rows: Array<Array<any>> = [];
  private currentRow: Array<any> = [];
  
  addButton(text: string, data: string): this {
    this.currentRow.push({
      text,
      callback_data: data
    });
    return this;
  }
  
  addUrlButton(text: string, url: string): this {
    this.currentRow.push({
      text,
      url
    });
    return this;
  }
  
  nextRow(): this {
    if (this.currentRow.length > 0) {
      this.rows.push(this.currentRow);
      this.currentRow = [];
    }
    return this;
  }
  
  build(): any {
    if (this.currentRow.length > 0) {
      this.rows.push(this.currentRow);
    }
    
    return {
      inline_keyboard: this.rows
    };
  }
}
```

## Testing Requirements

### Unit Tests
```typescript
describe('Telegram MCP Server', () => {
  describe('Message Operations', () => {
    test('sendMessage with valid parameters');
    test('sendMessage with invalid chat_id');
    test('editMessage on existing message');
    test('deleteMessage with permissions');
  });
  
  describe('Formatting', () => {
    test('Markdown to MarkdownV2 conversion');
    test('Code block preservation');
    test('Special character escaping');
    test('Message truncation at limit');
    test('Mention formatting');
  });
  
  describe('Media Operations', () => {
    test('sendPhoto with caption');
    test('sendDocument with size validation');
    test('sendVideo with thumbnail');
    test('File upload error handling');
  });
  
  describe('Interactive Features', () => {
    test('Inline keyboard creation');
    test('Callback query processing');
    test('Reply keyboard setup');
    test('Button action routing');
  });
});
```

### Integration Tests
- Test with real Telegram bot (test environment)
- Verify message delivery
- Test media uploads
- Validate callback handling
- Check rate limit compliance

### End-to-End Tests
- Full flow from Telegram message to Claude response
- Multi-turn conversations
- Error recovery scenarios
- Performance under load

## Definition of Done
- [ ] All core tools implemented
- [ ] Message formatting working correctly
- [ ] Media operations functional
- [ ] Interactive features operational
- [ ] All tests passing
- [ ] Documentation complete
- [ ] Error handling comprehensive

## Risk Assessment

### High Priority Risks
1. **API Rate Limits**: Hitting Telegram's 30 msg/sec limit
   - Mitigation: Implement queuing and rate limiting
2. **Token Exposure**: Bot token leaked in logs
   - Mitigation: Strict logging controls, env var only

### Medium Priority Risks
1. **Message Formatting Issues**: MarkdownV2 parsing errors
   - Mitigation: Comprehensive formatter testing
2. **Network Failures**: Connection issues with Telegram API
   - Mitigation: Retry logic with exponential backoff

## Success Metrics
- 100% of core tools functional
- < 2 second response time for messages
- 99.9% message delivery success rate
- Zero token exposures
- All formatting tests passing

## Dependencies
- MCP SDK
- Telegram Bot API SDK (telegraf or node-telegram-bot-api)
- TypeScript 5.0+
- Test bot token from BotFather
- Test group/channel for validation

## Deliverables
1. Complete Telegram MCP server package
2. All messaging tools implemented
3. Media operation handlers
4. Message formatting system
5. Interactive feature support
6. Comprehensive test suite
7. API documentation
8. Integration guide