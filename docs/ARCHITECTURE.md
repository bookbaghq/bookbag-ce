# Architecture

System design and architecture documentation for BookBag.

## Table of Contents

- [Overview](#overview)
- [System Architecture](#system-architecture)
- [Backend Architecture](#backend-architecture)
- [Frontend Architecture](#frontend-architecture)
- [Database Architecture](#database-architecture)
- [Component System](#component-system)
- [Plugin System](#plugin-system)
- [Authentication & Authorization](#authentication--authorization)
- [Real-time Communication](#real-time-communication)
- [RAG System](#rag-system)
- [Data Flow](#data-flow)
- [Deployment Architecture](#deployment-architecture)

## Overview

BookBag is a self-hosted LLM management platform built with a modular, component-based architecture. The system is designed for scalability, maintainability, and extensibility.

### Key Design Principles

- **Modular Components**: Each feature is self-contained
- **Separation of Concerns**: Clear boundaries between layers
- **MVC Pattern**: Model-View-Controller architecture
- **Plugin System**: Extensible without modifying core
- **Database per Component**: Isolated data contexts
- **Stateless API**: RESTful API design

### Technology Stack

**Backend:**
- Node.js (18+)
- MasterController (MVC framework)
- MasterRecord (ORM)
- Express.js (HTTP server)
- Socket.IO (WebSocket)
- SQLite/MySQL (Database)

**Frontend:**
- Next.js 14+ (React framework)
- React 18+ (UI library)
- Tailwind CSS (Styling)
- Shadcn/ui (Component library)
- Socket.IO Client (WebSocket)

**AI/ML:**
- LangChain (Document processing)
- Xenova Transformers (Local embeddings)
- LanceDB (Vector storage)
- Multiple LLM providers (OpenAI, Anthropic, etc.)

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Client Layer                         │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Web Browser │  │    Mobile    │  │     API      │      │
│  │   (Next.js)  │  │   (Future)   │  │   Clients    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTPS / WSS
┌──────────────────────────┴──────────────────────────────────┐
│                    API Gateway / Nginx                       │
│                     (Reverse Proxy)                          │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────┴──────────────────────────────────┐
│                      Application Layer                       │
│                                                               │
│  ┌────────────────────────────────────────────────────┐     │
│  │              MasterController Framework            │     │
│  │                                                      │     │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐        │     │
│  │  │   Auth   │  │   Chat   │  │  Models  │  ...   │     │
│  │  │Middleware│  │ Socket   │  │  Router  │        │     │
│  │  └──────────┘  └──────────┘  └──────────┘        │     │
│  └────────────────────────────────────────────────────┘     │
│                                                               │
│  ┌────────────────────────────────────────────────────┐     │
│  │              Component Layer (MVC)                 │     │
│  │                                                      │     │
│  │  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐│     │
│  │  │ User │  │ Chat │  │Model │  │ RAG  │  │Admin ││     │
│  │  └──────┘  └──────┘  └──────┘  └──────┘  └──────┘│     │
│  └────────────────────────────────────────────────────┘     │
└───────────────────────────┬───────────────────────────────────┘
                            │
┌───────────────────────────┴───────────────────────────────────┐
│                      Data Layer                               │
│                                                                │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐        │
│  │  User   │  │  Chat   │  │  Model  │  │   RAG   │  ...   │
│  │   DB    │  │   DB    │  │   DB    │  │   DB    │        │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘        │
│                                                                │
│  ┌──────────────────────────────────────────────────┐        │
│  │              File Storage (bb-storage)           │        │
│  │     (Media files, RAG documents, uploads)        │        │
│  └──────────────────────────────────────────────────┘        │
└────────────────────────────────────────────────────────────────┘
                            │
┌───────────────────────────┴───────────────────────────────────┐
│                   External Services                           │
│                                                                │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐        │
│  │ OpenAI  │  │Anthropic│  │  Grok   │  │  SMTP   │        │
│  │   API   │  │   API   │  │   API   │  │ Server  │        │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘        │
└────────────────────────────────────────────────────────────────┘
```

### Request Flow

1. **Client Request** → Browser sends HTTP/WebSocket request
2. **Reverse Proxy** → Nginx routes to backend/frontend
3. **Authentication** → JWT validation, session check
4. **Controller** → Routes to appropriate controller method
5. **Service Logic** → Business logic execution
6. **Data Access** → ORM queries database
7. **Response** → JSON response sent back to client

## Backend Architecture

### MVC Pattern

BookBag follows the Model-View-Controller pattern:

```
┌─────────────────────────────────────────────────┐
│                 Controller                      │
│  (Handles HTTP requests, validates input)       │
│                                                 │
│  ┌────────────────────────────────────────┐    │
│  │  exampleController.js                  │    │
│  │  - list(obj)                           │    │
│  │  - get(obj)                            │    │
│  │  - create(obj)                         │    │
│  │  - update(obj)                         │    │
│  │  - delete(obj)                         │    │
│  └────────────────────────────────────────┘    │
└─────────────────┬───────────────────────────────┘
                  │
                  ├──> Service Layer (optional)
                  │    (Business logic, validation)
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│                  Model                          │
│  (Data structure, relationships, queries)       │
│                                                 │
│  ┌────────────────────────────────────────┐    │
│  │  exampleModel.js                       │    │
│  │  - Fields (id, name, etc.)             │    │
│  │  - Relationships (belongsTo, hasMany)  │    │
│  │  - Queries (find, where, all)          │    │
│  └────────────────────────────────────────┘    │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│               Database                          │
│  (SQLite/MySQL storage)                         │
│                                                 │
│  ┌────────────────────────────────────────┐    │
│  │  example.sqlite3 / MySQL database      │    │
│  │  - Tables, indexes, relationships      │    │
│  └────────────────────────────────────────┘    │
└─────────────────────────────────────────────────┘
```

### Component Structure

Each component is self-contained with its own MVC structure:

```
components/[component-name]/
├── app/
│   ├── controllers/
│   │   └── api/
│   │       └── [name]Controller.js    # API endpoints
│   ├── models/
│   │   ├── [model].js                 # Data models
│   │   └── db/
│   │       ├── [env].sqlite3          # Database file
│   │       └── migrations/            # Schema migrations
│   │           └── [timestamp]_[name].js
│   └── services/                      # Business logic (optional)
│       └── [name]Service.js
└── routes.json                        # Route definitions
```

### Core Components

**1. User Component** (`components/user/`)
- User authentication
- Profile management
- Session handling
- Role-based access control

**2. Chat Component** (`components/chats/`)
- Conversation management
- Message history
- Token tracking
- Chat sharing

**3. Model Component** (`components/models/`)
- LLM provider management
- Model configuration
- API key storage
- Configuration profiles

**4. RAG Component** (`components/rag/`)
- Document upload and processing
- Text extraction
- Embedding generation
- Vector search

**5. Workspace Component** (`components/workspace/`)
- Workspace management
- Member management
- Model assignments
- Workspace-level documents

**6. Media Component** (`components/media/`)
- File uploads
- Image storage
- Media metadata
- Storage quota management

**7. Admin Component** (`components/admin/`)
- System settings
- Plugin management
- Analytics
- User administration

## Frontend Architecture

### Next.js App Router Structure

```
nextjs-app/
├── app/                        # App Router (pages)
│   ├── layout.js              # Root layout
│   ├── page.js                # Home page
│   ├── bb-auth/               # Authentication pages
│   │   ├── login/
│   │   └── register/
│   ├── bb-chats/              # Chat interface
│   ├── bb-models/             # Model management
│   ├── bb-rag/                # RAG documents
│   ├── bb-workspace/          # Workspaces
│   └── bb-admin/              # Admin pages
│       ├── users/
│       ├── models/
│       ├── settings/
│       └── workspaces/
├── components/                # React components
│   ├── ui/                    # Shadcn/ui components
│   ├── chat/                  # Chat-specific components
│   ├── admin/                 # Admin components
│   └── shared/                # Shared components
├── services/                  # API service layer
│   ├── authService.js
│   ├── chatService.js
│   ├── modelService.js
│   └── ...
├── lib/                       # Utilities
│   └── utils.js
├── public/                    # Static assets
└── apiConfig.json             # API configuration
```

### Component Hierarchy

```
Layout (Root)
  ├── Sidebar
  │   ├── Navigation Menu
  │   ├── User Menu
  │   └── Workspace Selector
  ├── Main Content
  │   ├── Page Header
  │   ├── Page Content (Dynamic)
  │   └── Page Footer
  └── Modals/Dialogs (Portal)
```

### Service Layer Pattern

```javascript
// Frontend service abstracts API calls
class ChatService {
  async list() { /* fetch chats */ }
  async get(id) { /* fetch chat */ }
  async create(data) { /* create chat */ }
  // ...
}

// Components use services
const chats = await chatService.list();
```

## Database Architecture

### Database Per Component Pattern

Each component has its own isolated database:

```
User Database (user.sqlite3)
  ├── User
  └── Session

Chat Database (chat.sqlite3)
  ├── Chat
  ├── Message
  └── ChatUser

Model Database (model.sqlite3)
  ├── Model
  ├── Provider
  ├── Profile
  └── PromptTemplate

RAG Database (rag.sqlite3)
  ├── Document
  ├── DocumentChunk
  └── Embedding (metadata)

Workspace Database (workspace.sqlite3)
  ├── Workspace
  ├── WorkspaceUser
  └── WorkspaceModel
```

### Database Schema Examples

**User Table:**
```sql
CREATE TABLE User (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT DEFAULT 'subscriber',
  is_active INTEGER DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT,
  deleted_at TEXT
);
```

**Chat Table:**
```sql
CREATE TABLE Chat (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  workspace_id INTEGER,
  title TEXT,
  is_archived INTEGER DEFAULT 0,
  is_favorite INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT,
  deleted_at TEXT,
  FOREIGN KEY (user_id) REFERENCES User(id)
);
```

**Message Table:**
```sql
CREATE TABLE Message (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id INTEGER NOT NULL,
  model_id INTEGER,
  role TEXT NOT NULL,  -- 'user' or 'assistant'
  content TEXT NOT NULL,
  thinking TEXT,
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (chat_id) REFERENCES Chat(id),
  FOREIGN KEY (model_id) REFERENCES Model(id)
);
```

**Document Table:**
```sql
CREATE TABLE Document (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  workspace_id INTEGER,
  chat_id INTEGER,
  filename TEXT NOT NULL,
  filepath TEXT NOT NULL,
  mimetype TEXT,
  size INTEGER,
  status TEXT DEFAULT 'pending',  -- pending, processing, completed, error
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES User(id)
);
```

### Relationships

```
User 1─────┬── Chat
           ├── Document
           ├── WorkspaceUser
           └── Session

Chat 1───── Message

Workspace 1─────┬── WorkspaceUser
                ├── WorkspaceModel
                └── Document

Model 1────┬── Message
           ├── WorkspaceModel
           └── Profile

Document 1───── DocumentChunk ───── Vector (LanceDB)
```

## Component System

### Component Registration

Components are automatically loaded from `components/` directory:

```javascript
// config/initializers/config.js
const config = require('../environments/env.' + env + '.json');

// Each context from config is registered
// exampleContext → loads components/example/
```

### Component Lifecycle

1. **Registration**: Component registered in config
2. **Database Init**: Database connection established
3. **Migration**: Schema migrations run
4. **Model Loading**: Models loaded into context
5. **Route Registration**: Routes mapped to controllers
6. **Ready**: Component ready to handle requests

### Inter-Component Communication

Components can access other components via contexts:

```javascript
// In chat controller, access user data
const user = this._userContext.User.find(userId);

// In workspace controller, access chat data
const chats = this._chatContext.Chat.where(c =>
  c.workspace_id === workspaceId
);
```

## Plugin System

### Architecture

```
┌──────────────────────────────────────────┐
│          Plugin Manager                  │
│  (Loads and manages plugins)             │
└──────────────────┬───────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
        ▼                     ▼
┌─────────────┐       ┌─────────────┐
│  Plugin A   │       │  Plugin B   │
├─────────────┤       ├─────────────┤
│ - Hooks     │       │ - Hooks     │
│ - Filters   │       │ - Filters   │
│ - Actions   │       │ - Actions   │
└──────┬──────┘       └──────┬──────┘
       │                     │
       └──────────┬──────────┘
                  │
                  ▼
┌──────────────────────────────────────────┐
│           Hook Service                   │
│  (Executes hooks and filters)            │
└──────────────────────────────────────────┘
```

### Hook Types

**Filters**: Modify data before processing
```javascript
hookService.addFilter('chat_message', (message) => {
  // Modify and return message
  return modifiedMessage;
});
```

**Actions**: Execute side effects
```javascript
hookService.addAction('after_chat_create', (chat) => {
  // Perform action (logging, notification, etc.)
});
```

### Plugin Loading

1. **Database Query**: Load enabled plugins from database
2. **File Load**: Load plugin files from `bb-plugins/`
3. **Initialization**: Call plugin `init()` method
4. **Hook Registration**: Register plugin hooks
5. **Execution**: Hooks execute on events

## Authentication & Authorization

### Authentication Flow

```
┌──────────┐
│  Client  │
└────┬─────┘
     │ 1. POST /api/auth/login
     │    { email, password }
     ▼
┌────────────────────────────┐
│  Auth Controller           │
│  - Validate credentials    │
│  - Generate JWT tokens     │
└────┬───────────────────────┘
     │ 2. Return tokens
     │    { accessToken, refreshToken }
     ▼
┌──────────┐
│  Client  │
│  Stores tokens in memory   │
└────┬─────┘
     │ 3. API Request
     │    Authorization: Bearer <token>
     ▼
┌────────────────────────────┐
│  Auth Middleware           │
│  - Verify JWT              │
│  - Load user               │
│  - Attach to request       │
└────┬───────────────────────┘
     │ 4. Request continues
     ▼
┌────────────────────────────┐
│  Controller                │
│  - Access req.currentUser  │
│  - Perform action          │
└────────────────────────────┘
```

### Authorization Levels

**Roles:**
- **Administrator**: Full system access
- **Subscriber**: Standard user access

**Workspace Roles:**
- **Admin**: Manage workspace settings, members
- **Member**: Access workspace content

**Resource-Level:**
- User can access their own chats
- User can access workspace chats if member
- Admin can access all resources

## Real-time Communication

### WebSocket Architecture

```
┌──────────┐
│  Client  │
└────┬─────┘
     │ 1. Connect WebSocket
     │    socket.io.connect()
     ▼
┌────────────────────────────┐
│  Socket.IO Server          │
│  - Handle connection       │
│  - Authenticate user       │
└────┬───────────────────────┘
     │ 2. Join rooms
     │    socket.join(`chat-${chatId}`)
     ▼
┌────────────────────────────┐
│  Chat Socket Handler       │
│  - Handle 'sendMessage'    │
│  - Stream to LLM           │
│  - Emit chunks             │
└────┬───────────────────────┘
     │ 3. Stream response
     │    socket.emit('messageChunk', data)
     ▼
┌──────────┐
│  Client  │
│  Receives and renders      │
│  message in real-time      │
└──────────┘
```

### Chat Streaming Flow

1. **Client Sends**: User types message, clicks send
2. **Socket Emits**: `socket.emit('sendMessage', data)`
3. **Server Receives**: Chat socket handler processes
4. **LLM Request**: Stream request to OpenAI/Anthropic/etc
5. **Chunk Streaming**: Each chunk emitted to client
6. **Client Updates**: UI updates with each chunk
7. **Complete**: Final message saved to database

## RAG System

### Document Processing Pipeline

```
┌──────────────┐
│ File Upload  │
└──────┬───────┘
       │
       ▼
┌────────────────────────────┐
│  Text Extraction           │
│  - PDF: pdf-parse          │
│  - DOCX: mammoth           │
│  - TXT: fs.readFile        │
│  - CSV: csv-parse          │
└──────┬─────────────────────┘
       │
       ▼
┌────────────────────────────┐
│  Text Chunking             │
│  - LangChain splitter      │
│  - Chunk size: 1000        │
│  - Overlap: 200            │
└──────┬─────────────────────┘
       │
       ▼
┌────────────────────────────┐
│  Embedding Generation      │
│  - Model: all-MiniLM-L6-v2 │
│  - Local processing        │
│  - Vector dimension: 384   │
└──────┬─────────────────────┘
       │
       ▼
┌────────────────────────────┐
│  Vector Storage            │
│  - LanceDB                 │
│  - Metadata: chunk info    │
└──────┬─────────────────────┘
       │
       ▼
┌────────────────────────────┐
│  Ready for Retrieval       │
└────────────────────────────┘
```

### Retrieval Process

```
┌──────────────┐
│ User Message │
└──────┬───────┘
       │
       ▼
┌────────────────────────────┐
│  Query Embedding           │
│  - Same model as docs      │
│  - Generate query vector   │
└──────┬─────────────────────┘
       │
       ▼
┌────────────────────────────┐
│  Vector Search             │
│  - Cosine similarity       │
│  - Top K chunks (5-10)     │
│  - Relevance threshold     │
└──────┬─────────────────────┘
       │
       ▼
┌────────────────────────────┐
│  Context Assembly          │
│  - Format chunks           │
│  - Add to prompt           │
│  - Include metadata        │
└──────┬─────────────────────┘
       │
       ▼
┌────────────────────────────┐
│  LLM Request               │
│  - User message + context  │
│  - Generate response       │
└────────────────────────────┘
```

## Data Flow

### Chat Message Flow

```
User types message
  │
  ▼
Frontend validates input
  │
  ▼
Socket.IO emits 'sendMessage'
  │
  ▼
Backend receives message
  │
  ├─> Check authentication
  ├─> Load chat and workspace
  ├─> Check permissions
  └─> Load model configuration
  │
  ▼
RAG retrieval (if documents exist)
  │
  ├─> Generate query embedding
  ├─> Search vector database
  └─> Retrieve relevant chunks
  │
  ▼
Construct LLM prompt
  │
  ├─> System prompt (from model)
  ├─> Context (from RAG)
  └─> User message
  │
  ▼
Stream to LLM provider
  │
  ├─> OpenAI / Anthropic / Grok
  ├─> Receive response stream
  └─> Parse chunks
  │
  ▼
Emit chunks to client
  │
  ├─> socket.emit('messageChunk')
  └─> Client renders in real-time
  │
  ▼
Save complete message
  │
  ├─> Save to Message table
  ├─> Update token counts
  └─> Emit 'messageComplete'
```

### Document Upload Flow

```
User selects file
  │
  ▼
Frontend uploads via FormData
  │
  ▼
Backend receives file
  │
  ├─> Validate file type
  ├─> Check file size
  └─> Save to bb-storage/
  │
  ▼
Create Document record
  │
  └─> status: 'pending'
  │
  ▼
Extract text (async)
  │
  ├─> PDF: pdf-parse
  ├─> DOCX: mammoth
  └─> status: 'processing'
  │
  ▼
Split into chunks
  │
  ├─> LangChain splitter
  └─> Save DocumentChunk records
  │
  ▼
Generate embeddings (async)
  │
  ├─> For each chunk
  ├─> Generate vector
  └─> Store in LanceDB
  │
  ▼
Update document status
  │
  └─> status: 'completed'
  │
  ▼
Ready for retrieval
```

## Deployment Architecture

### Development Deployment

```
┌─────────────────────────────┐
│     Local Development       │
├─────────────────────────────┤
│  Terminal 1: Backend        │
│  - npm run dev              │
│  - Port 8080                │
│                             │
│  Terminal 2: Frontend       │
│  - cd nextjs-app            │
│  - npm run dev              │
│  - Port 3000                │
├─────────────────────────────┤
│  SQLite Databases           │
│  - components/*/db/*.sqlite3│
│                             │
│  File Storage               │
│  - bb-storage/media/        │
└─────────────────────────────┘
```

### Production Deployment

```
┌──────────────────────────────────────┐
│         Nginx Reverse Proxy          │
│  - SSL/TLS termination               │
│  - Rate limiting                     │
│  - Static file serving               │
├──────────────────────────────────────┤
│         PM2 Process Manager          │
│  ┌────────────┐  ┌────────────┐     │
│  │  Backend   │  │  Frontend  │     │
│  │  (Node)    │  │  (Next.js) │     │
│  │  Port 8080 │  │  Port 3000 │     │
│  └────────────┘  └────────────┘     │
├──────────────────────────────────────┤
│         Database Layer               │
│  - MySQL 8+ (production)             │
│  - Separate databases per component  │
│                                      │
│  - LanceDB (vector storage)          │
│  - File storage (bb-storage/)        │
└──────────────────────────────────────┘
```

### Scaling Considerations

**Horizontal Scaling:**
- Multiple backend instances behind load balancer
- Sticky sessions for WebSocket connections
- Shared database and file storage

**Vertical Scaling:**
- Increase CPU for LLM processing
- Increase RAM for embedding generation
- Increase storage for documents

**Database Scaling:**
- Move from SQLite to MySQL
- Database replication
- Read replicas for analytics

**Caching:**
- Redis for session storage
- CDN for static assets
- Application-level caching

## Security Architecture

### Security Layers

```
┌────────────────────────────────┐
│     Network Security           │
│  - HTTPS (TLS 1.3)             │
│  - Firewall rules              │
│  - Rate limiting               │
└─────────────┬──────────────────┘
              │
┌─────────────┴──────────────────┐
│   Application Security         │
│  - Input validation            │
│  - SQL injection prevention    │
│  - XSS protection              │
└─────────────┬──────────────────┘
              │
┌─────────────┴──────────────────┐
│   Authentication               │
│  - JWT tokens                  │
│  - bcrypt password hashing     │
│  - Session management          │
└─────────────┬──────────────────┘
              │
┌─────────────┴──────────────────┐
│   Authorization                │
│  - Role-based access control   │
│  - Resource-level permissions  │
│  - Workspace isolation         │
└─────────────┬──────────────────┘
              │
┌─────────────┴──────────────────┐
│   Data Security                │
│  - Encrypted passwords         │
│  - Secure API keys             │
│  - File permissions            │
└────────────────────────────────┘
```

## Performance Considerations

### Backend Performance

- **Connection Pooling**: Reuse database connections
- **Query Optimization**: Index frequently queried fields
- **Caching**: Cache expensive operations
- **Async Operations**: Non-blocking I/O
- **Streaming**: Stream large responses

### Frontend Performance

- **Code Splitting**: Load only needed code
- **Lazy Loading**: Load components on demand
- **Memoization**: Cache computed values
- **Virtual Scrolling**: For long lists
- **Image Optimization**: Compress and resize

### Database Performance

- **Indexes**: On foreign keys and query fields
- **Pagination**: Limit result sets
- **Soft Deletes**: Avoid hard deletes
- **Query Optimization**: Avoid N+1 queries
- **Connection Management**: Pool connections

## Monitoring & Observability

### Logging

- Application logs (console)
- Error logs (file-based)
- Access logs (Nginx)
- Audit logs (database)

### Metrics

- Request count and latency
- Token usage per user/model
- Database query performance
- Memory and CPU usage
- Active WebSocket connections

### Alerting

- Error rate thresholds
- Resource usage alerts
- Failed authentication attempts
- API key expiration

## Future Architecture Enhancements

- **PostgreSQL Support**: Additional database option
- **Redis Integration**: Session and caching layer
- **Kubernetes Deployment**: Container orchestration
- **Microservices**: Split into smaller services
- **Message Queue**: Async job processing
- **CDN Integration**: Static asset delivery
- **Multi-tenancy**: Organization-level isolation

## Related Documentation

- [Developer Guide](DEVELOPER_GUIDE.md) - Development practices
- [API Documentation](api/API_DOCUMENTATION.md) - API reference
- [Plugin Development](plugins/PLUGIN_DEVELOPMENT.md) - Plugin system
- [Configuration](CONFIGURATION.md) - System configuration

---

For questions about architecture, open an issue or discussion on GitHub.
