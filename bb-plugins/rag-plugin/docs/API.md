# RAG Plugin API Documentation

**Plugin Version:** 1.0.0  
**API Prefix:** `bb-rag/api/rag`  
**Authentication:** Required (User context via authService)  
**Database Models:** Document, DocumentChunk, Settings  

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication & Authorization](#authentication--authorization)
3. [Document Management API](#document-management-api)
4. [Knowledge Base Query API](#knowledge-base-query-api)
5. [Storage & Statistics API](#storage--statistics-api)
6. [Settings Management API](#settings-management-api)
7. [Data Models](#data-models)
8. [Error Handling](#error-handling)

---

## Overview

The RAG (Retrieval-Augmented Generation) Plugin provides a comprehensive API for managing documents and querying knowledge bases. It supports:

- **Document Ingestion**: Upload files or ingest content from URLs
- **Multi-Format Support**: PDF, DOCX, TXT, MD, HTML, CSV
- **Vector Search**: Semantic similarity search using local embeddings
- **Hierarchical Storage**: Chat-specific and workspace-level documents
- **Smart Chunking**: Automatic document segmentation with 500-char chunks and 50-char overlap
- **Local Embeddings**: Using Xenova's all-MiniLM-L6-v2 model (384 dimensions)

### Supported File Formats

| Format | Extension | Description |
|--------|-----------|-------------|
| Plain Text | `.txt`, `.md`, `.markdown` | UTF-8 text files |
| PDF | `.pdf` | PDF documents with text extraction |
| Word | `.docx` | Microsoft Word documents |
| HTML | `.html`, `.htm` | Web pages and HTML documents |
| CSV | `.csv` | Spreadsheet data (converted to text) |

---

## Authentication & Authorization

### Authentication Mechanism

All API endpoints require user authentication via the `authService.currentUser()` method:

```javascript
const currentUser = req.authService.currentUser(req.request, req.userContext);
if (!currentUser || !currentUser.id) {
    return { success: false, error: 'User not authenticated' };
}
```

### Authorization Rules

**Document Access Control:**
- **Chat Documents**: User must be a member of the chat (verified via UserChat table)
- **Workspace Documents**: User must be a workspace member (admin only for now)
- **Admin Endpoints**: No explicit role check (relies on framework-level admin permissions)

**RAG Disabling Rules:**
- `disable_rag`: Globally disables RAG for all chats/workspaces
- `disable_rag_chat`: Disables RAG only for regular user chats
- `disable_rag_workspace`: Disables RAG only for workspace-created chats

---

## Document Management API

### 1. POST - Ingest Document (File Upload)

**Endpoint:** `POST /bb-rag/api/rag/ingest`

**Purpose:** Upload and ingest a document file into the knowledge base

**Request Format:** `multipart/form-data`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `file` | File | Yes | Document file to upload (PDF, DOCX, TXT, CSV, HTML, MD) |
| `chatId` | number | No | Chat ID for chat-specific document. If not provided, creates new chat |
| `workspaceId` | number | No | Workspace ID for workspace-level shared document |
| `title` | string | No | Custom document title. Defaults to filename |
| `tenantId` | string | No | Tenant/user ID (legacy, auto-detected if omitted) |

**Response (Success):**

```json
{
    "success": true,
    "documentId": 123,
    "chatId": 456,
    "message": "Document ingested successfully"
}
```

**Response (Error):**

```json
{
    "success": false,
    "error": "No file uploaded" | 
             "User not authenticated" |
             "Unsupported file type: .xyz. Supported formats: ..." |
             "RAG for chats is disabled" |
             "Storage quota exceeded (1500MB / 1024MB)"
}
```

**Processing Steps:**
1. Validates user authentication
2. Checks if RAG is disabled for the document type
3. Validates file type (extension-based)
4. Extracts text using format-specific extractor
5. Chunks text using RecursiveCharacterTextSplitter (500 chars, 50 overlap)
6. Generates embeddings for each chunk (local Xenova model)
7. Stores document metadata and chunks in database
8. Creates new chat if needed (with auto-generated session ID)

**Storage Quota:**
- Uses MediaSettings storage_limit_mb (default: 1024 MB)
- Calculates usage based on file size
- Returns error if quota exceeded

---

### 2. POST - Ingest URL Content

**Endpoint:** `POST /bb-rag/api/rag/ingest-url`

**Purpose:** Fetch and ingest content from a URL

**Request Format:** `application/x-www-form-urlencoded` or `application/json`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `url` | string | Yes | Full URL to fetch content from (http or https) |
| `tenantId` | string | No | Tenant/user ID (auto-detected if omitted) |

**Response (Success):**

```json
{
    "success": true,
    "documentId": 123,
    "message": "URL content ingested successfully"
}
```

**Response (Error):**

```json
{
    "success": false,
    "error": "URL is required" |
             "Invalid URL format" |
             "Could not extract meaningful content from URL" |
             "Storage quota exceeded (1500MB / 1024MB)"
}
```

**Processing Steps:**
1. Validates URL format
2. Checks storage quota
3. Fetches HTML content via HTTPS/HTTP
4. Strips scripts, styles, and HTML tags
5. Validates extracted text (minimum 50 characters)
6. Creates filename from URL hostname and path
7. Ingests as plain text document with chunking and embedding

---

### 3. DELETE - Delete Document

**Endpoint:** `DELETE /bb-rag/api/rag/delete/:id`

**Purpose:** Delete a document and all associated chunks

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | number | Yes | Document ID to delete |

**Response (Success):**

```json
{
    "success": true,
    "message": "Document deleted successfully"
}
```

**Response (Error):**

```json
{
    "success": false,
    "error": "Document not found" |
             "Unauthorized" |
             "Document ID is required"
}
```

**Authorization Check:**
- If document has chat_id: Verifies user is member of that chat
- If document has workspace_id only: Allows deletion (workspace documents)
- Fallback to tenant_id check for legacy documents

---

### 4. GET - List All Documents (Admin)

**Endpoint:** `GET /bb-rag/api/rag/admin/list`

**Purpose:** List ALL documents in the system (admin panel)

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `search` | string | No | Search documents by title or filename |

**Response (Success):**

```json
{
    "success": true,
    "documents": [
        {
            "id": 123,
            "title": "Q3 Financial Report",
            "filename": "q3_report.pdf",
            "mimeType": "application/pdf",
            "fileSize": 2500000,
            "chatId": 456,
            "chatTitle": "Finance Discussion",
            "workspaceId": null,
            "workspaceName": null,
            "chunkCount": 45,
            "createdAt": "1700000000000",
            "updatedAt": "1700000000000"
        }
    ],
    "total": 1
}
```

**Response (Error):**

```json
{
    "success": false,
    "error": "Error message"
}
```

**Features:**
- No authentication check (assumes admin middleware)
- Filters by search term (case-insensitive)
- Sorts by creation date (newest first)
- Includes chunk count per document
- Associates with chat/workspace titles when available

---

### 5. GET - List Documents (Tenant-Scoped)

**Endpoint:** `GET /bb-rag/api/rag/list`

**Purpose:** List documents for current chat or workspace

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `chatId` | number | Conditional | Chat ID (required if workspaceId not provided) |
| `workspaceId` | number | Conditional | Workspace ID (required if chatId not provided) |

**Response (Success - Chat Documents):**

```json
{
    "success": true,
    "documents": [
        {
            "id": 123,
            "title": "Meeting Notes",
            "filename": "meeting_notes.md",
            "mimeType": "text/markdown",
            "createdAt": "1700000000000",
            "updatedAt": "1700000000000"
        }
    ]
}
```

**Response (When RAG Disabled):**

```json
{
    "success": true,
    "documents": [],
    "disabled": true,
    "reason": "RAG for chats is disabled"
}
```

**Response (Error):**

```json
{
    "success": false,
    "error": "chatId or workspaceId is required" |
             "User not authenticated" |
             "Unauthorized"
}
```

**Authorization:**
- For chat: Verifies user membership in UserChat table
- For workspace: Verifies workspace membership
- Returns empty list if RAG is disabled (doesn't error)

---

## Knowledge Base Query API

### 6. POST - Query Knowledge Base

**Endpoint:** `POST /bb-rag/api/rag/query`

**Purpose:** Perform semantic search on knowledge base and retrieve relevant chunks

**Request Format:** `application/x-www-form-urlencoded` or `application/json`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `chatId` | number | Yes | Chat ID containing documents to query |
| `question` | string | Yes | User's question or search query |
| `k` | number | No | Number of top results to return (default: 5, max: varies) |

**Response (Success):**

```json
{
    "success": true,
    "results": [
        {
            "chunkId": 789,
            "documentId": 123,
            "documentTitle": "Q3 Financial Report",
            "chunkIndex": 12,
            "content": "Revenue grew 15% year-over-year to $2.5B...",
            "score": 0.8234,
            "tokenCount": 156,
            "source": "chat"
        }
    ],
    "context": "Here is relevant information from your knowledge base:\n\n📄 [1] 💬 Chat - \"Q3 Financial Report\" (relevance: 82.3%)\nRevenue grew 15% year-over-year to $2.5B...\n\n",
    "count": 1
}
```

**Response (Error):**

```json
{
    "success": false,
    "error": "chatId is required" |
             "Question is required" |
             "User not authenticated" |
             "Unauthorized"
}
```

**Query Process:**
1. Validates required parameters (chatId, question)
2. Verifies user authentication and chat membership
3. Generates embedding for user's question (384 dimensions)
4. Retrieves workspace + chat-level documents for layered context
5. Calculates cosine similarity for all chunks
6. Returns top k results sorted by relevance score
7. Builds formatted context string with source metadata

**Result Fields:**
- **score**: Cosine similarity (0-1, higher = more relevant)
- **source**: "chat" or "workspace" indicating document origin
- **tokenCount**: Approximate token count of chunk
- **chunkIndex**: Position of chunk within the document

---

## Storage & Statistics API

### 7. GET - Get Storage Usage

**Endpoint:** `GET /bb-rag/api/rag/storage/usage`

**Purpose:** Get current storage usage and quota information

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tenantId` | string | No | Tenant/user ID (auto-detected if omitted) |

**Response (Success):**

```json
{
    "success": true,
    "mb": 450.5,
    "bytes": 471883776,
    "quota": 1024,
    "percentUsed": 43.99,
    "exceeded": false
}
```

**Response (Error):**

```json
{
    "success": false,
    "error": "Error message"
}
```

**Storage Calculation:**
- Sums file_size of all documents for tenant
- Default quota: 1024 MB (configurable via MediaSettings)
- percentUsed: (mb / quota) * 100
- exceeded: Returns true if usage > quota

---

### 8. GET - Get Knowledge Base Statistics

**Endpoint:** `GET /bb-rag/api/rag/stats`

**Purpose:** Get document and chunk statistics for a chat or workspace

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `chatId` | number | Conditional | Chat ID (required if workspaceId not provided) |
| `workspaceId` | number | Conditional | Workspace ID (required if chatId not provided) |

**Response (Success - Chat Stats):**

```json
{
    "success": true,
    "stats": {
        "documentCount": 5,
        "chunkCount": 234,
        "totalTokens": 45678,
        "avgChunksPerDoc": 47
    }
}
```

**Response (When RAG Disabled):**

```json
{
    "success": true,
    "stats": {
        "documentCount": 0,
        "chunkCount": 0,
        "totalTokens": 0,
        "avgChunksPerDoc": 0
    },
    "disabled": true,
    "reason": "RAG for chats is disabled"
}
```

**Response (Error):**

```json
{
    "success": false,
    "error": "chatId or workspaceId is required" |
             "User not authenticated" |
             "Unauthorized"
}
```

**Calculations:**
- **documentCount**: Number of documents in chat/workspace
- **chunkCount**: Total chunks across all documents
- **totalTokens**: Sum of token_count from all chunks
- **avgChunksPerDoc**: chunkCount / documentCount (rounded)

---

## Settings Management API

### 9. GET - Get RAG Settings

**Endpoint:** `GET /bb-rag/api/rag/settings`

**Purpose:** Retrieve current RAG configuration settings

**Response (Success):**

```json
{
    "success": true,
    "settings": {
        "disableRag": false,
        "disableRagChat": false,
        "disableRagWorkspace": false
    }
}
```

**Response (Error):**

```json
{
    "success": false,
    "error": "Error message"
}
```

**Behavior:**
- Automatically creates default settings if none exist
- Returns safe defaults on error
- All flags default to `false` (RAG enabled)

---

### 10. POST - Update RAG Settings

**Endpoint:** `POST /bb-rag/api/rag/settings`

**Purpose:** Update RAG configuration settings

**Request Format:** `application/x-www-form-urlencoded` or `application/json`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `disableRag` | boolean | No | Disable RAG globally for all chats/workspaces |
| `disableRagChat` | boolean | No | Disable RAG only for user-created chats |
| `disableRagWorkspace` | boolean | No | Disable RAG only for workspace-created chats |

**Response (Success):**

```json
{
    "success": true,
    "settings": {
        "disableRag": false,
        "disableRagChat": true,
        "disableRagWorkspace": false
    },
    "message": "RAG settings updated successfully"
}
```

**Response (Error):**

```json
{
    "success": false,
    "error": "Error message"
}
```

**Update Behavior:**
- Updates only provided fields (partial update)
- Automatically creates settings record if it doesn't exist
- Updates `updated_at` timestamp
- No authentication/admin check (relies on framework)

---

## Data Models

### Document Model

Represents a document in the knowledge base with metadata.

**Fields:**

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `id` | integer | No | Primary key, auto-increment |
| `chat_id` | integer | Yes | Foreign key to Chat table (for chat-specific docs) |
| `workspace_id` | integer | Yes | Foreign key to Workspace table (for workspace docs) |
| `tenant_id` | string | Yes | User/tenant identifier (legacy) |
| `title` | string | No | Document title/name |
| `filename` | string | No | Original filename |
| `file_path` | string | Yes | File storage path (legacy, now empty) |
| `mime_type` | string | Yes | MIME type (e.g., "application/pdf") |
| `file_size` | integer | No | File size in bytes (default: 0) |
| `created_at` | string | No | Timestamp (milliseconds as string) |
| `updated_at` | string | No | Timestamp (milliseconds as string) |

**Relationships:**
- **HasMany**: `Chunks` -> DocumentChunk (one document has many chunks)

---

### DocumentChunk Model

Represents a text chunk with its embedding vector.

**Fields:**

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `id` | integer | No | Primary key, auto-increment |
| `document_id` | integer | No | Foreign key to Document table |
| `chunk_index` | integer | No | Position within document (0, 1, 2, ...) |
| `content` | string | No | Actual text content of chunk |
| `embedding` | string | Yes | JSON array of embedding floats (384 dims) |
| `token_count` | integer | No | Approximate token count (default: 0) |
| `created_at` | string | No | Timestamp (milliseconds as string) |
| `updated_at` | string | No | Timestamp (milliseconds as string) |

**Relationships:**
- **BelongsTo**: `Document` (many chunks belong to one document)

**Embedding Format:**
```json
"[0.123, 0.456, -0.789, ...(384 total dimensions)]"
```

---

### Settings Model

Global RAG configuration settings (singleton).

**Fields:**

| Field | Type | Nullable | Default | Description |
|-------|------|----------|---------|-------------|
| `id` | integer | No | | Primary key (typically 1) |
| `disable_rag` | boolean | No | false | Disable RAG globally |
| `disable_rag_chat` | boolean | No | false | Disable RAG for user chats |
| `disable_rag_workspace` | boolean | No | false | Disable RAG for workspace chats |
| `created_at` | string | No | | Timestamp (milliseconds as string) |
| `updated_at` | string | No | | Timestamp (milliseconds as string) |

---

## Error Handling

### Standard Error Response Format

All endpoints return errors in this format:

```json
{
    "success": false,
    "error": "Human-readable error message",
    "details": "Stack trace (development only)"
}
```

### Common Error Codes

| Error | HTTP Status | Cause |
|-------|------------|-------|
| "User not authenticated" | 401 | Missing/invalid user context |
| "Unauthorized" | 403 | User lacks permissions for resource |
| "Document not found" | 404 | Document ID doesn't exist |
| "Unsupported file type" | 400 | File extension not in supported list |
| "Storage quota exceeded" | 413 | Used storage > quota limit |
| "No file uploaded" | 400 | Multipart request missing file |
| "RAG for chats is disabled" | 400 | RAG disabled by settings |

### Validation Rules

**File Uploads:**
- File must be provided in multipart form data
- File extension must match supported formats
- Extracted text must be at least 50 characters for URLs

**Parameters:**
- `chatId`/`workspaceId`: Must be integers, one required
- `question`: Must be non-empty string
- `k`: Must be integer (defaults to 5)

---

## Technical Specifications

### Text Chunking

**Algorithm:** RecursiveCharacterTextSplitter (LangChain)

```javascript
{
    chunkSize: 500,          // Characters per chunk
    chunkOverlap: 50,        // Characters overlapping between chunks
    separators: [
        '\n\n',              // Try paragraph breaks first
        '\n',                // Then line breaks
        '. ',                // Then sentences
        '! ',
        '? ',
        ', ',                // Then clauses
        ' ',                 // Then words
        ''                   // Finally characters
    ]
}
```

### Embedding Generation

**Model:** Xenova/all-MiniLM-L6-v2
- **Dimensions:** 384
- **Library:** @xenova/transformers
- **Processing:** Batch processing for efficiency
- **Encoding:** Stored as JSON stringified array in database

### Vector Search

**Algorithm:** Cosine Similarity

```javascript
cosineSimilarity(vectorA, vectorB) = (A · B) / (||A|| × ||B||)
```

- Range: 0 to 1 (higher = more similar)
- Returns top k results sorted by score
- Supports layered retrieval (workspace + chat documents)

### Rate Limiting

No explicit rate limiting in API (implemented at framework level)

### Timeout Settings

No explicit timeouts defined (relies on framework defaults)

---

## Integration Points

### With Chat System

The RAG plugin hooks into the LLM generation pipeline:

**Hook:** `LLM_BEFORE_GENERATE`

The `llmBeforeGenerateHandler` automatically:
1. Extracts chatId from message context
2. Checks if RAG is disabled
3. Queries knowledge base for relevant chunks
4. Injects context into LLM prompt before generation

### Database Contexts

RAG Plugin uses multiple database contexts:

- **ragContext**: RAG-specific tables (Document, DocumentChunk, Settings)
- **chatContext**: Chat tables for user membership verification (Chat, UserChat)
- **mediaContext**: Media settings for storage limit configuration (MediaSettings)

---

## Example Requests

### Upload a PDF document to a chat

```bash
curl -X POST http://localhost:3000/bb-rag/api/rag/ingest \
  -H "Cookie: session=..." \
  -F "file=@report.pdf" \
  -F "chatId=123" \
  -F "title=Q3 Financial Report"
```

### Query knowledge base

```bash
curl -X POST http://localhost:3000/bb-rag/api/rag/query \
  -H "Cookie: session=..." \
  -H "Content-Type: application/json" \
  -d '{
    "chatId": 123,
    "question": "What was our Q3 revenue?",
    "k": 5
  }'
```

### Get storage usage

```bash
curl -X GET http://localhost:3000/bb-rag/api/rag/storage/usage \
  -H "Cookie: session=..."
```

### Update settings

```bash
curl -X POST http://localhost:3000/bb-rag/api/rag/settings \
  -H "Cookie: session=..." \
  -H "Content-Type: application/json" \
  -d '{
    "disableRagChat": true
  }'
```

---

## Performance Considerations

### Chunking Performance
- Recursive character splitting takes ~100ms per 1MB of text
- Fallback to simple splitting available if errors occur

### Embedding Generation
- Batch processing: ~2-5 chunks per second
- Local processing (no API latency)
- 384-dimensional vectors require ~3KB per embedding

### Query Performance
- Cosine similarity calculation: ~1ms per chunk
- Full similarity pass for all chunks: ~10-50ms for typical documents
- Returned results already sorted by score

### Storage Usage
- Average file size: varies by document type
- Embedding vectors: ~3KB each (384 floats)
- Database overhead: ~1-2KB per chunk metadata

---

## Security Considerations

### Data Isolation
- Documents scoped to user's chats or workspaces
- Admin endpoints list all documents but assume framework-level protection

### File Handling
- Temporary files created with random paths
- Cleaned up after text extraction
- No persistent file storage (only text chunks)

### Input Validation
- File extensions checked before processing
- URL format validated before fetching
- File size validated against storage quota
- Text length validated (minimum 50 characters for URLs)

### Error Disclosure
- Development: Full stack traces in responses
- Production: Generic error messages
- No sensitive data in error responses

---

## Deployment Notes

### Environment Variables

None explicitly required. Uses framework-level configuration for:
- Database connection strings
- Storage paths (default: `storage/rag/`)
- NODE_ENV (affects error response detail)

### Dependencies

**Core:**
- @langchain/textsplitters (chunking)
- @xenova/transformers (embeddings)

**File Processing:**
- pdf-parse (PDF extraction)
- mammoth (DOCX extraction)
- cheerio (HTML parsing)
- csv-parser (CSV parsing)

**ORM:**
- mastercontroller (framework ORM)

---

## API Summary Table

| Method | Endpoint | Purpose | Auth | Admin |
|--------|----------|---------|------|-------|
| POST | `/ingest` | Upload document | Yes | No |
| POST | `/ingest-url` | Ingest URL content | Yes | No |
| DELETE | `/delete/:id` | Delete document | Yes | No |
| GET | `/admin/list` | List all documents | No | Yes |
| GET | `/list` | List chat/workspace docs | Yes | No |
| POST | `/query` | Query knowledge base | Yes | No |
| GET | `/storage/usage` | Get storage stats | Yes | No |
| GET | `/stats` | Get KB statistics | Yes | No |
| GET | `/settings` | Get RAG settings | Yes | Yes |
| POST | `/settings` | Update RAG settings | Yes | Yes |

---

**Documentation Generated:** 2024-11-11  
**Last Updated:** Version 1.0.0
