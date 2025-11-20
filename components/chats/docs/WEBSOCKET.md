# WebSocket Streaming Protocol

Complete documentation for the WebSocket-based real-time AI streaming protocol.

## Overview

The chats component uses WebSocket (Socket.IO) for real-time bidirectional communication between the client and server during AI response generation. This enables token-by-token streaming, thinking section rendering, and real-time TPS updates.

## Connection

### Client-Side Connection
```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:8080', {
  withCredentials: true,
  transports: ['websocket', 'polling']
});
```

### Server-Side Handler
Located in: `app/sockets/chatSocket.js`

The chat socket handler is registered automatically when the server starts.

---

## Events

### Client → Server Events

#### `start` - Initiate AI Response
Starts the AI response generation for a given chat.

**Payload:**
```javascript
{
  chatId: 123,           // Chat ID
  modelId: "1",          // Model ID
  userMessageId: 456,    // ID of the user's message
  noThinking: false      // Optional: disable thinking sections
}
```

**Example:**
```javascript
socket.emit('start', {
  chatId: 123,
  modelId: "1",
  userMessageId: 456,
  noThinking: false
});
```

**Server Response Flow:**
1. Validates authentication
2. Loads model configuration
3. Creates AI message stub in database
4. Loads chat history for context
5. Sends request to LLM with streaming enabled
6. Streams response back to client via events

---

### Server → Client Events

#### `connected` - Stream Started
Emitted when the streaming connection is established.

**Payload:**
```javascript
{
  type: 'connected',
  message: 'AI streaming started',
  model: 'gpt-4',        // Model name
  aiMessageId: 789,      // ID of the AI message being generated
  chatId: 123            // Chat ID
}
```

**Example:**
```javascript
socket.on('connected', (data) => {
  console.log(`Started streaming: ${data.model}`);
  setAiMessageId(data.aiMessageId);
});
```

---

#### `chunk` - Content Token
Emitted for each token/chunk of content.

**Payload:**
```javascript
{
  type: 'chunk',
  content: 'Hello',      // Token text
  delta: 'Hello',        // Same as content (for compatibility)
  model: 'gpt-4'         // Model name
}
```

**Example:**
```javascript
let fullContent = '';

socket.on('chunk', (data) => {
  fullContent += data.content;
  setMessageContent(fullContent);
});
```

---

#### `thinking_start` - Thinking Section Started
Emitted when the LLM starts a thinking section (extended thinking).

**Payload:**
```javascript
{
  type: 'thinking_start',
  sectionId: 'think_001',   // Unique section identifier
  timestamp: 1699999999050  // Start timestamp (ms)
}
```

**Example:**
```javascript
socket.on('thinking_start', (data) => {
  console.log(`Thinking section ${data.sectionId} started`);
  startThinkingSection(data.sectionId);
});
```

---

#### `thinking_chunk` - Thinking Content
Emitted for each token of thinking content.

**Payload:**
```javascript
{
  type: 'thinking_chunk',
  sectionId: 'think_001',   // Section identifier
  content: 'Let me think',  // Token text
  timestamp: 1699999999060  // Current timestamp (ms)
}
```

**Example:**
```javascript
let thinkingContent = {};

socket.on('thinking_chunk', (data) => {
  if (!thinkingContent[data.sectionId]) {
    thinkingContent[data.sectionId] = '';
  }
  thinkingContent[data.sectionId] += data.content;
  updateThinkingSection(data.sectionId, thinkingContent[data.sectionId]);
});
```

---

#### `thinking_end` - Thinking Section Ended
Emitted when a thinking section is complete.

**Payload:**
```javascript
{
  type: 'thinking_end',
  sectionId: 'think_001',        // Section identifier
  content: 'Let me think...',    // Full thinking content
  startTime: 1699999999050,      // Start timestamp (ms)
  endTime: 1699999999080,        // End timestamp (ms)
  duration: 30,                  // Duration in ms
  thinkingTokensUsed: 50         // Tokens used for thinking
}
```

**Example:**
```javascript
socket.on('thinking_end', (data) => {
  console.log(`Thinking completed in ${data.duration}ms`);
  finalizeThinkingSection(data.sectionId, data);
});
```

---

#### `tps_update` - Tokens Per Second Update
Emitted periodically with TPS metrics.

**Payload:**
```javascript
{
  type: 'tps_update',
  tps: 25.5,              // Current tokens per second
  totalTokens: 100,       // Total tokens generated so far
  elapsedMs: 4000         // Elapsed time in ms
}
```

**Example:**
```javascript
socket.on('tps_update', (data) => {
  setTps(data.tps);
  setProgress({
    tokens: data.totalTokens,
    elapsed: data.elapsedMs
  });
});
```

---

#### `complete` - Stream Complete
Emitted when the AI response is fully generated.

**Payload:**
```javascript
{
  type: 'complete',
  content: 'Full response text...',   // Complete response
  totalTokens: 150,                   // Total tokens in response
  generationTimeMs: 6000,             // Total generation time
  averageTps: 25,                     // Average TPS
  model: 'gpt-4',                     // Model name
  aiMessageId: 789,                   // AI message ID
  thinkingSections: [                 // All thinking sections
    {
      id: 1,
      sectionId: 'think_001',
      content: '...',
      duration: 30,
      thinkingTokensUsed: 50
    }
  ]
}
```

**Example:**
```javascript
socket.on('complete', (data) => {
  console.log(`Response complete: ${data.totalTokens} tokens in ${data.generationTimeMs}ms`);
  setIsStreaming(false);
  setFinalMessage(data);
});
```

---

#### `error` - Error Occurred
Emitted when an error occurs during streaming.

**Payload:**
```javascript
{
  type: 'error',
  error: 'Error message',   // Error description
  code: 'RATE_LIMIT',       // Error code (optional)
  model: 'gpt-4'            // Model name
}
```

**Example:**
```javascript
socket.on('error', (data) => {
  console.error(`Streaming error: ${data.error}`);
  setError(data.error);
  setIsStreaming(false);
});
```

**Common Error Codes:**
- `AUTH_ERROR` - Authentication failed
- `RATE_LIMIT` - Rate limit exceeded
- `CONTEXT_LENGTH` - Context too long
- `MODEL_ERROR` - Model API error
- `NETWORK_ERROR` - Network error
- `TIMEOUT` - Request timeout

---

## Complete Client Example

```javascript
import { useState, useEffect } from 'react';
import io from 'socket.io-client';

function ChatStream({ chatId, modelId, userMessageId }) {
  const [socket, setSocket] = useState(null);
  const [content, setContent] = useState('');
  const [thinkingSections, setThinkingSections] = useState({});
  const [tps, setTps] = useState(0);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Connect to WebSocket
    const newSocket = io('http://localhost:8080', {
      withCredentials: true,
      transports: ['websocket', 'polling']
    });

    setSocket(newSocket);

    // Event listeners
    newSocket.on('connected', (data) => {
      console.log('Stream connected:', data);
      setIsStreaming(true);
    });

    newSocket.on('chunk', (data) => {
      setContent((prev) => prev + data.content);
    });

    newSocket.on('thinking_start', (data) => {
      setThinkingSections((prev) => ({
        ...prev,
        [data.sectionId]: { content: '', startTime: data.timestamp }
      }));
    });

    newSocket.on('thinking_chunk', (data) => {
      setThinkingSections((prev) => ({
        ...prev,
        [data.sectionId]: {
          ...prev[data.sectionId],
          content: (prev[data.sectionId]?.content || '') + data.content
        }
      }));
    });

    newSocket.on('thinking_end', (data) => {
      setThinkingSections((prev) => ({
        ...prev,
        [data.sectionId]: {
          ...prev[data.sectionId],
          ...data,
          completed: true
        }
      }));
    });

    newSocket.on('tps_update', (data) => {
      setTps(data.tps);
    });

    newSocket.on('complete', (data) => {
      console.log('Stream complete:', data);
      setIsStreaming(false);
    });

    newSocket.on('error', (data) => {
      console.error('Stream error:', data);
      setError(data.error);
      setIsStreaming(false);
    });

    // Cleanup
    return () => {
      newSocket.disconnect();
    };
  }, []);

  const startStreaming = () => {
    if (!socket) return;

    setContent('');
    setThinkingSections({});
    setError(null);

    socket.emit('start', {
      chatId,
      modelId,
      userMessageId,
      noThinking: false
    });
  };

  return (
    <div>
      <button onClick={startStreaming} disabled={isStreaming}>
        Start Streaming
      </button>

      {error && <div className="error">{error}</div>}

      <div className="thinking-sections">
        {Object.entries(thinkingSections).map(([id, section]) => (
          <div key={id} className="thinking-section">
            <h4>Thinking...</h4>
            <p>{section.content}</p>
            {section.completed && <span>✓ Complete ({section.duration}ms)</span>}
          </div>
        ))}
      </div>

      <div className="content">
        {content}
      </div>

      {isStreaming && <div>TPS: {tps.toFixed(1)}</div>}
    </div>
  );
}
```

---

## Server-Side Flow

### 1. Connection Establishment
```
Client connects → Socket.IO handshake → Authentication check
```

### 2. Stream Initialization
```
Client emits 'start' → Validate params → Create AI message stub → Load context
```

### 3. LLM Request
```
Build prompt → Send to LLM with streaming → Receive SSE stream
```

### 4. Token Processing
```
For each token:
  - Extract thinking content (if any)
  - Emit 'thinking_start', 'thinking_chunk', 'thinking_end' events
  - Emit 'chunk' event for regular content
  - Update TPS metrics
  - Emit 'tps_update' every 1s
```

### 5. Stream Completion
```
Final token received → Save message to DB → Save thinking sections → Emit 'complete'
```

### 6. Error Handling
```
Error occurs → Log error → Emit 'error' event → Close stream
```

---

## Thinking Sections

### Format
Thinking sections are detected via XML-style tags in the LLM response:

```
<thinking>
Let me analyze this problem...
</thinking>

Here's the answer.
```

### Detection
The `ThinkingDetectionService` extracts thinking sections using regex and emits separate events for them.

### Storage
Thinking sections are stored in the `thinking` table with:
- `messages_id` - Link to parent message
- `section_id` - Unique identifier (e.g., "think_001")
- `content` - Thinking content
- `start_time`, `end_time` - Timestamps
- `thinking_tokens_used` - Token count

### Client Rendering
Clients should render thinking sections separately from main content, typically in a collapsible UI element.

---

## Performance Optimization

### Batching
- Token chunks can be batched for better performance
- Recommended batch size: 5-10 tokens

### Throttling
- TPS updates are throttled to once per second
- Thinking chunks are emitted immediately for better UX

### Connection Management
- Use connection pooling for multiple concurrent streams
- Implement automatic reconnection on disconnect
- Set appropriate timeout values (default: 2 minutes)

---

## Error Recovery

### Automatic Retry
For transient errors, implement exponential backoff:

```javascript
let retryCount = 0;
const maxRetries = 3;

socket.on('error', (data) => {
  if (retryCount < maxRetries && data.code === 'NETWORK_ERROR') {
    const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
    setTimeout(() => {
      socket.emit('start', params);
      retryCount++;
    }, delay);
  } else {
    // Show error to user
    setError(data.error);
  }
});
```

### Manual Retry
Provide a retry button for user-triggered retries.

---

## Security Considerations

1. **Authentication**: All socket connections require valid session cookies
2. **Rate Limiting**: Implement per-user rate limits (consider Redis-based rate limiting)
3. **Validation**: Validate all incoming events server-side
4. **Sanitization**: Sanitize all content before storing to prevent XSS
5. **CORS**: Configure CORS appropriately for production

---

## Testing

### Unit Tests
Test individual event handlers:

```javascript
describe('chatSocket', () => {
  it('should emit connected event on start', async () => {
    const mockSocket = createMockSocket();
    await chatSocket.start(mockData, mockSocket);
    expect(mockSocket.emit).toHaveBeenCalledWith('connected', expect.any(Object));
  });
});
```

### Integration Tests
Test full streaming flow with mock LLM responses.

### Load Tests
Test concurrent streaming sessions to determine capacity limits.

---

## Monitoring

### Metrics to Track
- Active connections count
- Average stream duration
- Token generation rate (TPS)
- Error rate by type
- Peak concurrent streams

### Logging
Log all streaming sessions with:
- User ID
- Chat ID
- Model used
- Duration
- Token count
- Errors (if any)

---

## Future Enhancements

- Resume interrupted streams
- Multiple concurrent AI responses
- Voice streaming support
- Image generation streaming
- Client-side caching of partial responses
- Compression for large responses
