# Services Documentation

Complete documentation for the service layer of the Chats component.

## Overview

The service layer implements all business logic for the chat system, separating concerns from controllers and models. Services handle everything from message persistence to AI response streaming.

---

## Architecture

```
Service Layer Architecture:
┌─────────────────────────────────────────────────┐
│         Controller Layer (API Endpoints)         │
└──────────────────┬──────────────────────────────┘
                   │
        ┌──────────▼──────────┐
        │   Service Layer      │
        │  (Business Logic)    │
        └──────────┬──────────┘
                   │
        ┌──────────▼──────────┐
        │    Model Layer       │
        │   (ORM / Database)   │
        └─────────────────────┘
```

---

## Core Services

### StreamingService

**Location:** `app/service/streamingService.js`

**Purpose:** Manages Server-Sent Events (SSE) and WebSocket streaming for real-time AI responses.

**Pattern:** Singleton

**Key Responsibilities:**
- SSE connection initialization and management
- CORS header handling
- Stream state tracking
- Client disconnect handling
- Heartbeat management

**Methods:**

#### `initializeSSEConnection(obj)`
Initializes SSE connection with proper headers and error handling.

```javascript
const streamingService = new StreamingService();
const res = streamingService.initializeSSEConnection({
  request: req,
  response: res
});
```

**Features:**
- Duplicate initialization prevention
- Connection state validation
- Automatic header flushing
- Error recovery

#### `sendEvent(res, eventData)`
Sends an event to the client (supports both SSE and WebSocket).

```javascript
streamingService.sendEvent(res, {
  type: 'chunk',
  content: 'Hello',
  model: 'gpt-4'
});
```

**Supported Targets:**
- HTTP Response (SSE)
- Socket.IO socket (WebSocket)

#### `registerStream(streamId, res, interruptHandler)`
Registers a stream with disconnect handling.

```javascript
const streamInfo = streamingService.registerStream(
  'stream-123',
  res,
  () => {
    console.log('Client disconnected, cleaning up...');
    // Cleanup logic
  }
);
```

#### `endStream(res)`
Gracefully ends a stream with proper cleanup.

```javascript
streamingService.endStream(res);
```

**Events Sent:**
- `connected` - Stream established
- `aiChunk` - Content token
- `aiMessageCreated` - AI message stub created
- `aiMessageComplete` - Generation complete
- `error` - Error occurred
- `[DONE]` - Stream completion signal

---

### MessagePersistenceService

**Location:** `app/service/messagePersistenceService.js`

**Purpose:** Handles all database operations for messages and chats.

**Key Responsibilities:**
- Message CRUD operations
- Chat creation and management
- Token counting and tracking
- Database transaction management
- Retry logic for SQLite locks

**Constructor:**
```javascript
const persistenceService = new MessagePersistenceService(chatContext, currentUser);
```

**Methods:**

#### `saveUserMessage(formData, chatId)`
Creates a new user message (and chat if needed).

```javascript
const { userMessage, chatId } = await persistenceService.saveUserMessage(
  {
    content: 'Hello, AI!',
    modelId: '1',
    attachments: []
  },
  existingChatId // or null for new chat
);
```

**Features:**
- Automatic chat creation for new conversations
- Token count calculation
- Membership verification
- Attachment support

#### `createAssistantMessageOnStreamStart(chatId, modelConfig, modelSettings)`
Creates AI message placeholder before streaming begins.

```javascript
const { aiMessage, aiMessageId, generationStartTime } =
  await persistenceService.createAssistantMessageOnStreamStart(
    chatId,
    modelConfig,
    modelSettings
  );
```

**Why This Exists:**
- Frontend needs message ID immediately for UI updates
- Allows incremental updates during streaming
- Ensures message exists even if stream fails

#### `updateAIMessageStreaming(aiMessageId, cleanContent, tokenCount, currentTPS, thinkingSectionsCount, generationStartTime)`
Updates AI message during streaming (throttled + debounced).

```javascript
const result = await persistenceService.updateAIMessageStreaming(
  aiMessageId,
  'Hello, I am an AI...',
  50,
  25.5,
  1,
  generationStartTime
);
```

**Features:**
- **Hybrid Throttle + Debounce**: Prevents database overload
- **Leading Edge Flush**: Updates immediately if enough time passed
- **Trailing Edge Flush**: Ensures final state is persisted
- **Configurable Interval**: Default 500ms between updates

#### `saveThinkingSection(messageId, sectionId, content, startTime, endTime, thinkingTokensUsed)`
Persists a thinking section immediately when detected.

```javascript
await persistenceService.saveThinkingSection(
  messageId,
  'think_001',
  'Let me analyze this problem...',
  1699999999050,
  1699999999080,
  50
);
```

#### `flushPendingStreamingUpdate(aiMessageId)`
Forces immediate write of any pending debounced update.

```javascript
await persistenceService.flushPendingStreamingUpdate(aiMessageId);
```

**When to Use:**
- Before ending a stream
- Before displaying final message
- Before navigating away from chat

**Retry Logic:**
The service includes automatic retry logic for SQLite database locks:

```javascript
async _saveWithRetry(maxRetries = 5, baseDelayMs = 100) {
  // Exponential backoff with jitter
  // Handles SQLITE_BUSY errors gracefully
}
```

---

### ChatHistoryService

**Location:** `app/service/chatHistoryService.js`

**Purpose:** Manages conversation history and context window optimization.

**Key Responsibilities:**
- Loading chat history from database
- Context window management and trimming
- Token estimation
- Conversation balance maintenance
- Image attachment loading

**Constructor:**
```javascript
const historyService = new ChatHistoryService(chatContext, modelSettings);
```

**Methods:**

#### `loadChatHistory(chatId, baseUrl)`
Loads complete chat history with attachments.

```javascript
const messageHistory = await historyService.loadChatHistory(
  123,
  'http://localhost:8080'
);
```

**Returns:**
```javascript
[
  {
    role: 'user',
    content: 'Hello!',
    attachments: ['http://localhost:8080/media/img1.jpg']
  },
  {
    role: 'assistant',
    content: 'Hi there!'
  }
]
```

**Features:**
- Eager loading of messages via ORM
- Image URL resolution from MediaService
- Attachment merging (from message and MediaFile table)
- Role normalization (Assistant → assistant)

#### `manageContextWindow(messageHistory)`
Trims message history to fit within model's context window.

```javascript
const trimmedHistory = await historyService.manageContextWindow(messageHistory);
```

**Algorithm:**
1. Calculate available tokens (contextSize - maxResponseTokens - reservedTokens)
2. Estimate tokens for each message (content + formatting overhead)
3. If total exceeds limit, trim from oldest messages
4. Always keep most recent user message
5. Maintain conversation balance (don't have too many user messages without responses)

**Example Output:**
```
=== CONTEXT WINDOW MANAGEMENT ===
Model: gpt-4
Total context size: 8192 tokens
Reserved for response: 2048 tokens
Reserved for system/formatting: 200 tokens
Available for history: 5944 tokens

Total estimated tokens in history: 7500
⚠️ Context window exceeded, trimming messages...
  Keeping most recent user message: 20 tokens
  Added assistant message: 150 tokens (total: 170)
  Added user message: 30 tokens (total: 200)
  Stopping at message 5: would exceed limit

📝 Context trimming summary:
  Original: 25 messages (7500 tokens)
  Trimmed: 15 messages (5800 tokens)
  Removed: 10 messages
  Token usage: 5800/5944 (98%)
  Conversation balance: 8 user, 7 assistant
```

#### `prepareMessageHistory(chatId, currentUserMessage)`
Complete workflow: load history + add current message + trim to fit.

```javascript
const managedHistory = await historyService.prepareMessageHistory(
  chatId,
  'What is the capital of France?'
);
```

#### `validateMessageHistory(messageHistory)`
Validates message history format and structure.

```javascript
try {
  historyService.validateMessageHistory(messageHistory);
  // Valid format
} catch (error) {
  console.error('Invalid message history:', error.message);
}
```

**Validation Rules:**
- Must be an array
- Each message must have `role` and `content`
- Role must be one of: user, assistant, system

---

### ModelService

**Location:** `app/service/modelService.js`

**Purpose:** Multi-provider AI model service (routing layer).

**Pattern:** Singleton

**Supported Providers:**
- OpenAI
- Azure OpenAI
- Grok (xAI)
- Any OpenAI-compatible API

**Key Responsibilities:**
- Provider routing
- Adapter selection
- Context lifecycle management
- Graceful shutdown handling

**Methods:**

#### `_generate(messageHistory, onChunk, noThinking, modelConfig)`
Routes generation request to appropriate provider adapter.

```javascript
const modelService = new ModelService();
const result = await modelService._generate(
  messageHistory,
  (chunk) => {
    console.log('Received chunk:', chunk);
  },
  false,
  modelConfig
);
```

**Currently:** All providers use the OpenAI-compatible adapter.

**Lifecycle Management:**
```javascript
// Automatic cleanup on process exit
modelService.setupGracefulShutdown();

// Manual disposal
await modelService.dispose();
```

---

### ThinkingDetectionService

**Location:** `app/service/thinkingDetectionService.js`

**Purpose:** Detects and extracts thinking sections from AI responses.

**Key Responsibilities:**
- Loading thinking detection rules from database
- Processing streamed chunks for thinking triggers
- Extracting thinking content
- Persisting thinking sections
- Real-time thinking buffer management

**Constructor:**
```javascript
const thinkingService = new ThinkingDetectionService(
  persistenceService,
  modelId,
  generationStartTime,
  aiMessageId
);
```

**How It Works:**

1. **Load Rules:**
```javascript
thinkingService.loadRules();
// Loads StartThinkingStrings rules for this model from database
```

Rules look like:
```javascript
[
  { startWord: '', endWord: 'Done thinking' },  // End-only trigger
  { startWord: 'Let me think', endWord: 'Conclusion' }  // Start/end pair
]
```

2. **Process Chunks:**
```javascript
const result = await thinkingService.processChunk('Done thinking about this...');
```

Returns:
```javascript
{
  rawBuffer: 'Full raw response including thinking',
  thinkingBuffer: 'Accumulated thinking content',
  responseBuffer: 'Clean response without thinking',
  tailWindow: 'Last 128 chars for trigger detection',
  thinkingStartTime: 1699999999050,
  thinkingEndTime: 1699999999080  // Only set when section completes
}
```

**Detection Algorithm:**

```
Stream: "Let me analyze... Done thinking. Here's the answer."

1. Chunk arrives: "Done thinking"
2. Check pending buffer for end-only trigger
3. Find match: "Done thinking"
4. Split at trigger word:
   - Thinking content: Everything up to and including trigger
   - Remaining: " Here's the answer."
5. Persist thinking section to database
6. Clear pending buffer
7. Put remaining content in responseBuffer
```

**Features:**
- **Whole Word Matching**: "the" won't match "there"
- **Pending Buffer**: Holds content until trigger is confirmed
- **Immediate Flush**: Flushes content after 100 chars if no trigger found
- **Duplicate Prevention**: Won't save the same section twice
- **Section Counter**: Tracks multiple thinking sections per message

**Methods:**

#### `checkForEndOnlyRules(chunk)`
Returns true if chunk contains an end-only trigger word.

#### `processChunk(chunk)`
Main processing method - returns updated buffers.

#### `getDetectedSectionsCount()`
Returns number of thinking sections detected so far.

---

### ToolsService

**Location:** `app/service/toolsService.js`

**Purpose:** Utility functions for token counting and text processing.

**Key Responsibilities:**
- Token counting and estimation
- Text processing utilities
- Conversation token analysis

**Methods:**

#### `calculateTokenCount(text)`
Estimates token count from text using rough approximation.

```javascript
const toolsService = new ToolsService();
const tokens = toolsService.calculateTokenCount('Hello, world!');
// Returns: ~3 tokens
```

**Formula:** `tokens ≈ text.length / 4`

**Supports:**
- Strings
- Arrays of messages
- Message objects with `content` field

#### `calculateTokenCountWithOverhead(text, role)`
Includes formatting overhead for role tags.

```javascript
const tokens = toolsService.calculateTokenCountWithOverhead('Hello!', 'assistant');
// Returns: base tokens + 15 (assistant overhead)
```

**Overhead:**
- User: +10 tokens
- Assistant: +15 tokens
- System: +8 tokens
- Default: +5 tokens

#### `estimateConversationTokens(messageHistory)`
Provides detailed token breakdown for entire conversation.

```javascript
const estimate = toolsService.estimateConversationTokens(messageHistory);
```

Returns:
```javascript
{
  totalTokens: 1500,
  breakdown: [
    {
      index: 0,
      role: 'user',
      contentLength: 100,
      contentTokens: 25,
      formattingTokens: 10,
      totalTokens: 35
    },
    // ... more messages
  ]
}
```

---

## Adapter Layer

### OpenAIAdapter

**Location:** `app/service/adapters/openaiAdapter.js`

**Purpose:** Handles communication with OpenAI-compatible APIs.

**Supports:**
- OpenAI (api.openai.com)
- Azure OpenAI (*.openai.azure.com)
- Grok (api.x.ai)
- Any OpenAI-compatible API

**Key Responsibilities:**
- Message formatting for OpenAI API
- Prompt template rendering
- Image attachment handling (Vision API)
- RAG context injection
- Streaming response processing
- Error handling

**Methods:**

#### `generate(messageHistory, onChunk, noThinking, modelConfig)`
Main generation method.

```javascript
const adapter = new OpenAIAdapter();
const result = await adapter.generate(
  messageHistory,
  (chunk) => console.log(chunk),
  false,
  modelConfig
);
```

**Internal Flow:**

1. **Build Messages:**
```javascript
_buildMessages(messageHistory, modelConfig)
```
- Extracts system prompt (with RAG context if injected)
- Renders prompt template if defined
- Adds image attachments for Vision API
- Falls back to naive message conversion

2. **Build Payload:**
```javascript
_buildPayload(modelName, messages, settings)
```
Creates OpenAI API payload:
```json
{
  "model": "gpt-4",
  "messages": [...],
  "temperature": 0.7,
  "max_tokens": 2048,
  "stream": true
}
```

3. **Make Request:**
```javascript
fetch(url, { method: 'POST', headers, body })
```

4. **Handle Response:**
- SSE stream: `_handleStreamingResponse()`
- JSON response: `_handleNonStreamingResponse()`

**Vision API Support:**

Messages with images use array content format:
```json
{
  "role": "user",
  "content": [
    {
      "type": "text",
      "text": "What's in this image?"
    },
    {
      "type": "image_url",
      "image_url": {
        "url": "http://localhost:8080/media/img.jpg"
      }
    }
  ]
}
```

**RAG Integration:**

Critical fix for RAG context injection:
```javascript
// Extract system message from messageHistory (contains RAG context)
const systemMessageFromHistory = messageHistory.find(m => m.role === 'system');
const systemPrompt = systemMessageFromHistory
  ? systemMessageFromHistory.content
  : modelConfig.system_prompt;
```

This ensures RAG-injected context is preserved during template rendering.

**Error Handling:**

```javascript
_handleError(res)
```

Handles various error types:
- `401`: Invalid API key
- `429`: Rate limit exceeded
- `500`: Model API error
- `ECONNREFUSED`: Network error

---

## Service Interaction Patterns

### Pattern 1: Message Creation Flow

```
Controller
  ↓
MessagePersistenceService.saveUserMessage()
  ↓
ToolsService.calculateTokenCount()
  ↓
Database (ORM)
```

### Pattern 2: Streaming Flow

```
Socket Handler
  ↓
MessagePersistenceService.createAssistantMessageOnStreamStart()
  ↓
ChatHistoryService.prepareMessageHistory()
  ↓
ModelService._generate()
  ↓
OpenAIAdapter.generate()
  ↓
[For each chunk]
  ↓
ThinkingDetectionService.processChunk()
  ↓
StreamingService.sendEvent()
  ↓
MessagePersistenceService.updateAIMessageStreaming()
```

### Pattern 3: Context Window Management

```
ChatHistoryService.loadChatHistory()
  ↓
[For each message]
  ↓
ToolsService.calculateTokenCount()
  ↓
ChatHistoryService.manageContextWindow()
  ↓
[Returns trimmed history]
```

---

## Service Dependencies

```
┌─────────────────────────────────────────────┐
│           MessagePersistenceService          │
│  (depends on: chatContext, currentUser)     │
└─────────────┬───────────────────────────────┘
              │
              ├─→ ToolsService (token counting)
              │
              └─→ ThinkingDetectionService (optional)
                      │
                      └─→ MessagePersistenceService (recursive for saving thinking)

┌─────────────────────────────────────────────┐
│            ChatHistoryService                │
│  (depends on: chatContext, modelSettings)   │
└─────────────┬───────────────────────────────┘
              │
              ├─→ ToolsService (token estimation)
              │
              └─→ MediaService (image URL resolution)

┌─────────────────────────────────────────────┐
│               ModelService                   │
│           (singleton, stateless)             │
└─────────────┬───────────────────────────────┘
              │
              └─→ OpenAIAdapter
                      │
                      └─→ PromptTemplateService

┌─────────────────────────────────────────────┐
│            StreamingService                  │
│           (singleton, stateless)             │
└─────────────────────────────────────────────┘
              ↑
              │ (used by multiple components)
              │
     [chatSocket.js, controllers, etc.]
```

---

## Best Practices

### 1. Service Initialization

Always initialize services with required dependencies:

```javascript
// ✅ Correct
const persistenceService = new MessagePersistenceService(
  chatContext,
  currentUser
);

// ❌ Wrong - missing dependencies
const persistenceService = new MessagePersistenceService();
```

### 2. Error Handling

Always wrap service calls in try-catch:

```javascript
try {
  const result = await persistenceService.saveUserMessage(formData, chatId);
} catch (error) {
  console.error('Failed to save message:', error);
  // Handle error appropriately
}
```

### 3. Stream Cleanup

Always clean up streams properly:

```javascript
try {
  // Streaming logic
} finally {
  await persistenceService.flushPendingStreamingUpdate(aiMessageId);
  streamingService.endStream(res);
  streamingService.cleanupStream(streamId);
}
```

### 4. Token Counting

Use token counting before operations to validate context size:

```javascript
const toolsService = new ToolsService();
const estimatedTokens = toolsService.calculateTokenCount(userMessage);

if (estimatedTokens > maxAllowedTokens) {
  throw new Error('Message too long');
}
```

### 5. Context Window Management

Always use `manageContextWindow` before sending to LLM:

```javascript
// Load history
const history = await historyService.loadChatHistory(chatId);

// Add current message
history.push({ role: 'user', content: userMessage });

// Trim to fit context window
const managedHistory = await historyService.manageContextWindow(history);

// Send to LLM
await modelService._generate(managedHistory, ...);
```

---

## Testing Services

### Unit Testing Example

```javascript
const MessagePersistenceService = require('./messagePersistenceService');

describe('MessagePersistenceService', () => {
  let service;
  let mockContext;
  let mockUser;

  beforeEach(() => {
    mockContext = createMockChatContext();
    mockUser = { id: 1, email: 'test@example.com' };
    service = new MessagePersistenceService(mockContext, mockUser);
  });

  it('should create a new chat and message', async () => {
    const result = await service.saveUserMessage({
      content: 'Hello',
      modelId: '1'
    }, null);

    expect(result.chatId).toBeDefined();
    expect(result.userMessage.content).toBe('Hello');
  });

  it('should add message to existing chat', async () => {
    const result = await service.saveUserMessage({
      content: 'Second message',
      modelId: '1'
    }, 123);

    expect(result.chatId).toBe(123);
  });
});
```

### Integration Testing Example

```javascript
describe('Streaming Flow Integration', () => {
  it('should complete full streaming cycle', async () => {
    const persistenceService = new MessagePersistenceService(chatContext, user);
    const streamingService = new StreamingService();
    const thinkingService = new ThinkingDetectionService(
      persistenceService,
      modelId,
      Date.now(),
      aiMessageId
    );

    // Create AI message
    const { aiMessageId } = await persistenceService.createAssistantMessageOnStreamStart(
      chatId,
      modelConfig,
      modelSettings
    );

    // Simulate streaming
    const chunks = ['Hello', ' ', 'world', '!'];
    for (const chunk of chunks) {
      const result = await thinkingService.processChunk(chunk);
      streamingService.sendEvent(mockRes, {
        type: 'chunk',
        content: result.responseBuffer
      });
      await persistenceService.updateAIMessageStreaming(
        aiMessageId,
        result.responseBuffer,
        ...
      );
    }

    // Verify final state
    const message = await persistenceService.getMessageById(aiMessageId);
    expect(message.content).toBe('Hello world!');
  });
});
```

---

## Performance Considerations

### 1. Database Operations

**Problem:** Frequent updates during streaming can overwhelm SQLite.

**Solution:** Hybrid throttle + debounce in `MessagePersistenceService`:
- Leading edge: Update immediately if enough time passed
- Trailing edge: Ensure final state is persisted
- Default interval: 500ms

### 2. Token Counting

**Problem:** Accurate token counting requires expensive tokenization.

**Solution:** Use rough approximation (4 chars per token) for real-time operations:
```javascript
tokens ≈ text.length / 4
```

For precise counting, use dedicated tokenizer libraries (not implemented).

### 3. Context Window Management

**Problem:** Loading and trimming large chat histories is expensive.

**Solution:**
- Eager load via ORM (single query)
- Estimate tokens (no actual tokenization)
- Trim from oldest messages first
- Cache trimmed history per request

### 4. Streaming Memory

**Problem:** Large responses consume memory.

**Solution:**
- Buffer only necessary data (128 char tail window)
- Flush to database incrementally
- Clear buffers after completion

---

## Security Considerations

### 1. API Key Management

```javascript
// ✅ Per-model API keys (secure)
const apiKey = modelConfig.api_key;
headers['Authorization'] = `Bearer ${apiKey}`;

// ❌ Global API keys (insecure)
const apiKey = process.env.OPENAI_API_KEY;
```

### 2. User Context Validation

```javascript
// Always verify user has access to chat
const membership = chatContext.UserChat
  .where(uc => uc.chat_id == $$ && uc.user_id == $$, chatId, currentUser.id)
  .single();

if (!membership) {
  throw new Error('Access denied');
}
```

### 3. Content Sanitization

Services do NOT sanitize content - this is the controller's responsibility.

### 4. Rate Limiting

Not implemented at service layer - should be implemented at controller/middleware level.

---

## Future Enhancements

1. **Token Counting**: Integrate accurate tokenizer (tiktoken, sentencepiece)
2. **Caching**: Add Redis caching for chat history
3. **Batch Operations**: Support bulk message operations
4. **Analytics**: Track service performance metrics
5. **Compression**: Compress large responses before storage
6. **Retry Logic**: Add exponential backoff for all external API calls
7. **Circuit Breaker**: Prevent cascading failures from external APIs

---

## Related Documentation

- [API.md](./API.md) - REST API endpoints
- [WEBSOCKET.md](./WEBSOCKET.md) - WebSocket streaming protocol
- [DATABASE.md](./DATABASE.md) - Database schema
- [README.md](./README.md) - Component overview
