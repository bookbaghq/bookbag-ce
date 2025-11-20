# Chats Component Documentation

## Overview

The Chats component is the core conversational AI system in Bookbag CE. It handles all chat-related functionality including message persistence, real-time streaming, token tracking, thinking sections (extended thinking for LLMs), and multi-user workspace support.

## Architecture

The chats component follows a layered MVC architecture with clear separation of concerns:

```
components/chats/
├── app/
│   ├── controllers/          # API endpoint handlers
│   │   └── api/
│   │       ├── chatController.js           # Chat CRUD operations
│   │       ├── messageController.js        # Message management
│   │       ├── adminChatController.js      # Admin-only operations
│   │       ├── favoritesController.js      # Chat favorites
│   │       ├── thinkingController.js       # Thinking sections API
│   │       ├── tpsController.js            # Tokens Per Second tracking
│   │       ├── tokenAnalyticsController.js # Token usage analytics
│   │       └── chatSettingsController.js   # Chat settings
│   ├── models/               # Database models (ORM)
│   │   ├── chat.js           # Chat entity
│   │   ├── messages.js       # Messages entity
│   │   ├── userchat.js       # User-Chat membership (many-to-many)
│   │   ├── chatContext.js    # Chat context entity
│   │   └── thinking.js       # Thinking sections entity
│   ├── service/              # Business logic layer
│   │   ├── streamingService.js           # SSE/WebSocket streaming
│   │   ├── messagePersistenceService.js  # Message DB operations
│   │   ├── chatHistoryService.js         # Chat history management
│   │   ├── modelService.js               # LLM model integration
│   │   ├── modelRouterService.js         # Model selection/routing
│   │   ├── promptTemplateService.js      # Prompt templating
│   │   ├── toolsService.js               # Tool/function calling
│   │   ├── thinkingDetectionService.js   # Extended thinking detection
│   │   ├── tpsService.js                 # TPS calculation
│   │   ├── responseNormalizationService.js # Response formatting
│   │   └── adapters/
│   │       └── openaiAdapter.js          # OpenAI API adapter
│   ├── dto/                  # Data Transfer Objects
│   │   ├── chatDetail.js     # Chat detail DTO
│   │   └── messageList.js    # Message list DTO
│   └── vm/                   # View Models
│       └── chatVM.js         # Chat view model
├── config/
│   ├── routes.js             # API route definitions
│   └── initializers/
│       └── config.js         # Component configuration
├── db/                       # SQLite database (development)
└── docs/                     # Documentation (you are here)
```

## Key Features

### 1. Real-Time Streaming
- WebSocket-based streaming for AI responses
- Server-Sent Events (SSE) fallback support
- Token-by-token streaming with TPS tracking
- Extended thinking sections support

### 2. Message Management
- User and AI messages with full metadata
- Message editing and deletion (soft deletes)
- Token counting and cost tracking
- Rich attachments support (images, files)

### 3. Chat Organization
- Chat creation, editing, archiving, deletion
- Search functionality across titles and content
- Favorites system
- Time-based grouping (recent, week, month, older)

### 4. Multi-User Support
- User-Chat membership model (many-to-many)
- Workspace-based chats
- Admin-created chats
- Permission-based access control

### 5. Token Analytics
- Real-time token usage tracking
- Tokens Per Second (TPS) calculation
- Per-user and per-chat analytics
- Historical token usage data

### 6. Extended Thinking
- Claude extended thinking support
- Thinking sections stored separately
- Thinking token usage tracking
- Client-side rendering of thinking sections

## Data Flow

### Chat Creation Flow
```
1. Client → POST /bb-chat/api/chat/create
2. chatController#createChat
3. MessagePersistenceService creates Chat entity
4. Creates UserChat membership record
5. Returns chat ID and session ID
```

### Message Streaming Flow
```
1. Client → WebSocket.emit('start', { chatId, modelId, userMessageId })
2. chatSocket#start
3. MessagePersistenceService creates AI message stub
4. ChatHistoryService loads context
5. ModelService sends request to LLM
6. StreamingService streams tokens to client
7. ThinkingDetectionService extracts thinking sections
8. MessagePersistenceService updates final message
```

### Chat Retrieval Flow
```
1. Client → GET /bb-chat/api/chat/:chatId
2. chatController#getChatById
3. Membership verification (direct or workspace)
4. Load chat with messages (ORM eager loading)
5. Load thinking sections for each message
6. MediaService loads image attachments
7. Format and return complete chat data
```

## Database Schema

See [DATABASE.md](./DATABASE.md) for detailed schema documentation.

## API Endpoints

See [API.md](./API.md) for complete API documentation.

## WebSocket Protocol

See [WEBSOCKET.md](./WEBSOCKET.md) for WebSocket streaming documentation.

## Services

See [SERVICES.md](./SERVICES.md) for service layer documentation.

## Configuration

Chat component configuration is loaded from:
- `config/initializers/config.js` - Component-level config
- `config/routes.js` - API route definitions

## Dependencies

- **MasterController** - Core framework for routing and ORM
- **Models Component** - LLM model configuration
- **Media Component** - Image and file attachment handling
- **Workspace Component** - Multi-user workspace support
- **Plugins Component** - Hook system integration

## Integration Points

### Hooks
The chats component fires and listens to several hooks:

**Fired Hooks:**
- `HOOKS.CHAT_MESSAGE_BEFORE_SEND` - Before message is sent to LLM
- `HOOKS.CHAT_MESSAGE_AFTER_RECEIVE` - After AI response is received
- `HOOKS.CHAT_CREATED` - After new chat is created
- `HOOKS.CHAT_DELETED` - After chat is deleted

**Listened Hooks:**
- `HOOKS.LLM_BEFORE_GENERATE` - RAG plugin injects context here

### WebSocket Events
- `start` - Start AI response generation
- `chunk` - Token chunk received
- `thinking_start` - Thinking section started
- `thinking_chunk` - Thinking content chunk
- `thinking_end` - Thinking section ended
- `complete` - Message generation complete
- `error` - Error occurred

## Testing

The chats component includes:
- Unit tests for services
- Integration tests for API endpoints
- WebSocket streaming tests

Run tests with:
```bash
npm test components/chats
```

## Performance Considerations

1. **Message Loading**: Messages are eager-loaded with chats for optimal performance
2. **Token Counting**: Calculated incrementally during streaming
3. **Thinking Sections**: Stored separately to avoid bloating message content
4. **Image Loading**: Loaded on-demand via MediaService
5. **Search**: Basic text search on title and first message (consider full-text search for production)

## Security

- All endpoints require authentication
- Membership verification for chat access
- Workspace-based access control
- Soft deletes for audit trail
- SQL injection protection via ORM

## Future Enhancements

- Full-text search across all messages
- Message reactions and annotations
- Chat sharing and collaboration
- Export chat history
- Advanced analytics dashboard
- Voice/audio message support
- Multi-modal attachments (video, documents)

## Related Documentation

- [API.md](./API.md) - Complete API reference
- [WEBSOCKET.md](./WEBSOCKET.md) - WebSocket protocol
- [DATABASE.md](./DATABASE.md) - Database schema
- [SERVICES.md](./SERVICES.md) - Service documentation
- [../../docs/DEVELOPER_GUIDE.md](../../docs/DEVELOPER_GUIDE.md) - Main developer guide
