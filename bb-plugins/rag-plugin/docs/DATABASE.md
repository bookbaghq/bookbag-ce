# RAG Plugin Database Architecture

## Overview

The RAG (Retrieval-Augmented Generation) plugin uses a relational database to store document metadata, chunked content, embeddings, and system settings. This document provides a comprehensive guide to the database schema, relationships, and query patterns.

**Database Support:**
- SQLite (Community Edition)
- MySQL (Enterprise Edition)
- Fully abstracted through MasterRecord ORM

**Key Characteristics:**
- Multi-tenant aware (supports workspace and chat-level documents)
- No raw file storage - only text chunks and embeddings
- JSON-serialized embeddings (384-dimensional vectors)
- No external embedding APIs required (uses local @xenova/transformers)

---

## 1. Database Models & Schema

### 1.1 Document Model

**File:** `/app/models/document.js`

The `Document` model stores metadata about uploaded documents and serves as the parent entity for chunks.

```javascript
class Document {
    id(db) {
        db.integer().primary().auto();
    }

    chat_id(db) {
        db.integer().nullable(); // References Chat.id - for chat-specific documents
    }

    workspace_id(db) {
        db.integer().nullable(); // References Workspace.id - for workspace-level shared documents
    }

    tenant_id(db) {
        db.string().nullable(); // User ID - kept for legacy/migration purposes
    }

    title(db) {
        db.string().notNullable();
    }

    filename(db) {
        db.string().notNullable();
    }

    file_path(db) {
        db.string().nullable(); // No longer storing files, only chunks
    }

    mime_type(db) {
        db.string(); // e.g., application/pdf, text/plain
    }

    Chunks(db) {
        db.hasMany('DocumentChunk');
    }

    file_size(db) {
        db.integer().notNullable().default(0);
    }

    created_at(db) {
        db.string().notNullable();
        db.get(function(value) {
            if (!value) {
                return Date.now().toString();
            } else {
                return value;
            }
        });
    }

    updated_at(db) {
        db.string().notNullable();
        db.get(function(value) {
            if (!value) {
                return Date.now().toString();
            } else {
                return value;
            }
        });
    }
}
```

**Table: `documents`**

| Column | Type | Nullable | Default | Constraints | Purpose |
|--------|------|----------|---------|-----------|---------|
| `id` | INTEGER | NO | AUTO_INCREMENT | PRIMARY KEY | Unique document identifier |
| `chat_id` | INTEGER | YES | NULL | FOREIGN KEY (Chat) | Links document to a specific chat |
| `workspace_id` | INTEGER | YES | NULL | FOREIGN KEY (Workspace) | Links document to workspace-level sharing |
| `tenant_id` | STRING | YES | NULL | | Legacy field - user/tenant identifier |
| `title` | STRING | NO | | NOT NULL | Human-readable document title |
| `filename` | STRING | NO | | NOT NULL | Original filename |
| `file_path` | STRING | YES | NULL | | Deprecated - files no longer stored |
| `mime_type` | STRING | YES | NULL | | MIME type (e.g., application/pdf) |
| `file_size` | INTEGER | NO | 0 | NOT NULL | File size in bytes |
| `created_at` | STRING | NO | | NOT NULL | Creation timestamp (ISO 8601 or Unix) |
| `updated_at` | STRING | NO | | NOT NULL | Last update timestamp |

**Indexes:**
- Primary Key: `id`
- Implied Indexes: `chat_id`, `workspace_id` (for filtering queries)

**Relationships:**
- **HasMany:** DocumentChunk - One document has many chunks
- **BelongsTo:** Chat (optional) - Via `chat_id`
- **BelongsTo:** Workspace (optional) - Via `workspace_id`

**Scoping Rules:**
- Chat-specific documents: `chat_id` is set, `workspace_id` is NULL
- Workspace-level documents: `workspace_id` is set, `chat_id` is NULL
- Legacy documents: Both fields may be NULL (migration fallback)

---

### 1.2 DocumentChunk Model

**File:** `/app/models/documentChunk.js`

The `DocumentChunk` model stores the chunked text with embeddings for vector search.

```javascript
class DocumentChunk {
    id(db) {
        db.integer().primary().auto();
    }

    Document(db) {
        db.belongsTo('Document', 'document_id');
        db.integer().notNullable();
    }

    chunk_index(db) {
        db.integer().notNullable(); // Order within the document (0, 1, 2...)
    }

    content(db) {
        db.string().notNullable(); // The actual text chunk
    }

    embedding(db) {
        db.string().nullable(); // JSON string: "[0.123, 0.456, ...]" - Generated on-demand
    }

    token_count(db) {
        db.integer().default(0); // Approximate token count
    }

    updated_at(db) {
        db.string().notNullable();
        db.get(function(value) {
            if (!value) {
                return Date.now();
            } else {
                return value;
            }
        });
    }

    created_at(db) {
        db.string().notNullable();
        db.get(function(value) {
            if (!value) {
                return Date.now();
            } else {
                return value;
            }
        });
    }
}
```

**Table: `document_chunks`**

| Column | Type | Nullable | Default | Constraints | Purpose |
|--------|------|----------|---------|-----------|---------|
| `id` | INTEGER | NO | AUTO_INCREMENT | PRIMARY KEY | Unique chunk identifier |
| `document_id` | INTEGER | NO | | FOREIGN KEY (Document) | Reference to parent Document |
| `chunk_index` | INTEGER | NO | | NOT NULL | Sequential order within document (0-based) |
| `content` | STRING/TEXT | NO | | NOT NULL | The actual text content of the chunk |
| `embedding` | STRING/TEXT | YES | NULL | | JSON-serialized embedding vector |
| `token_count` | INTEGER | YES | 0 | | Approximate token count for the chunk |
| `created_at` | STRING | NO | | NOT NULL | Creation timestamp |
| `updated_at` | STRING | NO | | NOT NULL | Last update timestamp |

**Indexes:**
- Primary Key: `id`
- Foreign Key: `document_id` (critical for retrieval)
- Recommended: Index on `(document_id, chunk_index)` for ordered chunk retrieval

**Relationships:**
- **BelongsTo:** Document - Multiple chunks reference one Document via `document_id`

**Data Type Details:**

**Embedding Field (JSON-Serialized Vector):**
```json
[0.123, 0.456, -0.789, 0.234, ...]  // 384 dimensions
```
- Format: JSON array of floats
- Dimensions: 384 (from Xenova/all-MiniLM-L6-v2)
- Storage: Serialized as string in database
- Generated: Batch generated during document ingestion via EmbeddingService
- Similarity Calculation: Cosine similarity (0-1 range)

**Token Count:**
- Approximate count (actual = `content.length`)
- Used for quota calculations and statistics
- Approximate formula: `chunk.length` (character count as proxy)

---

### 1.3 Settings Model

**File:** `/app/models/settings.js`

The `Settings` model stores RAG system configuration with three global disable flags.

```javascript
class Settings {
    id(db) {
        db.integer().primary().auto();
    }

    disable_rag(db) {
        db.boolean().default(false); // Disable rag
    }

    disable_rag_chat(db) {
        db.boolean().default(false); // Disable rag chat
    }
    
    disable_rag_workspace(db) {
        db.boolean().default(false); // Disable rag chat creation
    }

    updated_at(db) {
        db.string().notNullable();
        db.get(function(value) {
            if (!value) {
                return Date.now().toString();
            } else {
                return value;
            }
        });
    }

    created_at(db) {
        db.string().notNullable();
        db.get(function(value) {
            if (!value) {
                return Date.now().toString();
            } else {
                return value;
            }
        });
    }
}
```

**Table: `settings`**

| Column | Type | Nullable | Default | Constraints | Purpose |
|--------|------|----------|---------|-----------|---------|
| `id` | INTEGER | NO | AUTO_INCREMENT | PRIMARY KEY | Singleton (always id=1) |
| `disable_rag` | BOOLEAN | YES | 0/false | | Global RAG disable switch |
| `disable_rag_chat` | BOOLEAN | YES | 0/false | | Disable RAG for user-created chats |
| `disable_rag_workspace` | BOOLEAN | YES | 0/false | | Disable RAG for workspace-level documents |
| `created_at` | STRING | NO | | NOT NULL | Creation timestamp |
| `updated_at` | STRING | NO | | NOT NULL | Last update timestamp |

**Usage Pattern (Singleton):**
- Only ONE record should exist in this table (id = 1)
- Query: `.Settings.single()` returns the singleton record
- If missing, default settings are used (all flags = false)

**Configuration Logic:**

RAG is enabled for a given chat based on these rules:

1. **Global Disable:** If `disable_rag = true`, all RAG is disabled
2. **Workspace Chats:** If `disable_rag_workspace = true` AND `chat.created_by = 'Workspace'`, disable RAG
3. **User Chats:** If `disable_rag_chat = true` AND `chat.created_by != 'Workspace'`, disable RAG

---

## 2. Database Relationships

### 2.1 Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        EXTERNAL SYSTEMS                         │
├─────────────────────────────────────────────────────────────────┤
│  Chat (id, created_by, ...)         Workspace (id, name, ...)   │
└────────────────┬────────────────────────────────┬────────────────┘
                 │                                │
                 │ chat_id (FK, optional)         │ workspace_id (FK, optional)
                 │                                │
┌────────────────▼─────────────────────────────────▼───────────────┐
│                          DOCUMENTS                                │
├────────────────────────────────────────────────────────────────┬──┤
│ id (PK)                                                        │  │
│ chat_id (FK, nullable) ────────────────────────────────┐       │  │
│ workspace_id (FK, nullable) ───────────────────────────┤       │  │
│ tenant_id (legacy, nullable)                            │       │  │
│ title, filename, file_path, mime_type, file_size      │       │  │
│ created_at, updated_at                                 │       │  │
└────────────────────────────────────────────────────────┼───────┘  │
                                                         │          │
                      HasMany (1:N)                      │          │
                                                         │          │
┌────────────────────────────────────────────────────────▼──────────▼─┐
│                     DOCUMENT_CHUNKS                                 │
├──────────────────────────────────────────────────────────────────────┤
│ id (PK)                                                              │
│ document_id (FK) ─────────────────────────────────────────────────── │
│ chunk_index (sequence)                                               │
│ content (text chunk)                                                 │
│ embedding (JSON: [0.123, 0.456, ...] - 384 dims)                   │
│ token_count                                                          │
│ created_at, updated_at                                               │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────┐
│      SETTINGS        │
├──────────────────────┤
│ id (PK, singleton)   │
│ disable_rag          │
│ disable_rag_chat     │
│ disable_rag_workspace│
│ created_at           │
│ updated_at           │
└──────────────────────┘
```

### 2.2 Foreign Key Relationships

**Document → Chat** (Optional)
- Column: `documents.chat_id`
- References: `chats.id`
- Constraint: NULLABLE
- Cardinality: Many documents can belong to one chat
- Cascade: ON DELETE SET NULL (when chat is deleted)

**Document → Workspace** (Optional)
- Column: `documents.workspace_id`
- References: `workspaces.id`
- Constraint: NULLABLE
- Cardinality: Many documents can belong to one workspace
- Cascade: ON DELETE SET NULL (when workspace is deleted)

**DocumentChunk → Document** (Required)
- Column: `document_chunks.document_id`
- References: `documents.id`
- Constraint: NOT NULL
- Cardinality: Many chunks belong to one document (1:N)
- Cascade: ON DELETE CASCADE (when document is deleted, all chunks are deleted)

### 2.3 Access Control Patterns

**Chat-Specific Documents:**
```
User → Chat (via UserChat) → Document (chat_id) → DocumentChunks
```
- Verify: UserChat record exists for (user_id, chat_id)
- Query: `Document.where(d => d.chat_id == chatId)`

**Workspace-Level Documents:**
```
User → Workspace (membership) → Document (workspace_id) → DocumentChunks
```
- Verify: Workspace membership (currently admin-only)
- Query: `Document.where(d => d.workspace_id == workspaceId)`

**Admin Access:**
```
Admin → All Documents → All Chunks
```
- Query: `Document.toList()` with optional search filter

---

## 3. Indexes and Constraints

### 3.1 Primary Keys

| Table | Column | Type |
|-------|--------|------|
| documents | id | INTEGER AUTO_INCREMENT |
| document_chunks | id | INTEGER AUTO_INCREMENT |
| settings | id | INTEGER AUTO_INCREMENT |

### 3.2 Foreign Keys

| Table | Column | References | Cascade Policy |
|-------|--------|-----------|------------------|
| documents | chat_id | chats.id | SET NULL |
| documents | workspace_id | workspaces.id | SET NULL |
| document_chunks | document_id | documents.id | CASCADE |

### 3.3 Unique Constraints

None explicitly defined. Settings uses singleton pattern (id = 1).

### 3.4 NOT NULL Constraints

**documents table:**
- `title` (NOT NULL)
- `filename` (NOT NULL)
- `file_size` (NOT NULL, default 0)
- `created_at` (NOT NULL)
- `updated_at` (NOT NULL)

**document_chunks table:**
- `document_id` (NOT NULL)
- `chunk_index` (NOT NULL)
- `content` (NOT NULL)
- `created_at` (NOT NULL)
- `updated_at` (NOT NULL)

**settings table:**
- `created_at` (NOT NULL)
- `updated_at` (NOT NULL)

### 3.5 Recommended Indexes

For optimal performance, create these indexes:

```sql
-- For fast document lookup by chat
CREATE INDEX idx_documents_chat_id ON documents(chat_id);

-- For fast document lookup by workspace
CREATE INDEX idx_documents_workspace_id ON documents(workspace_id);

-- For fast chunk lookup (critical for RAG queries)
CREATE INDEX idx_document_chunks_document_id ON document_chunks(document_id);

-- For combined chunk retrieval and ordering
CREATE INDEX idx_document_chunks_document_chunk_index 
ON document_chunks(document_id, chunk_index);

-- For sorting documents by creation time
CREATE INDEX idx_documents_created_at ON documents(created_at DESC);

-- For full-text search (MySQL specific)
CREATE FULLTEXT INDEX idx_documents_search 
ON documents(title, filename);
```

### 3.6 Triggers (None Currently Defined)

The system does not use database triggers. Timestamps are managed by the ORM:
- `created_at`: Set once on insert
- `updated_at`: Updated via ORM on modification

---

## 4. Query Patterns

### 4.1 Document Ingestion Flow

**File:** `/app/service/ragService.js` - `ingestDocument()` method

```javascript
async ingestDocument({ 
    chatId = null, 
    workspaceId = null, 
    tenantId = null, 
    title, 
    filename, 
    filePath, 
    text, 
    mimeType = null, 
    fileSize = 0 
}) {
    // 1. Create document record
    const document = new DocumentModel();
    document.chat_id = chatId;
    document.workspace_id = workspaceId;
    document.tenant_id = tenantId;
    document.title = title;
    document.filename = filename;
    document.file_path = filePath;
    document.mime_type = mimeType;
    document.file_size = fileSize || 0;
    document.created_at = Date.now().toString();
    document.updated_at = Date.now().toString();
    
    this.context.Document.add(document);
    this.context.saveChanges();
    const documentId = document.id;

    // 2. Chunk text using RecursiveCharacterTextSplitter
    const chunks = await this.chunkText(text);
    // chunkSize: 500 characters
    // chunkOverlap: 50 characters
    // Smart separators: ['\n\n', '\n', '. ', '! ', '? ', ', ', ' ', '']

    // 3. Generate embeddings in batch
    const embeddings = await this.embeddingService.embedBatch(chunks);
    // Model: Xenova/all-MiniLM-L6-v2 (384 dimensions)
    // Processed in batches of 10 to manage memory

    // 4. Store chunks with embeddings
    const DocumentChunkModel = require('../models/documentChunk');
    for (let i = 0; i < chunks.length; i++) {
        const chunk = new DocumentChunkModel();
        chunk.Document = documentId;          // Foreign key
        chunk.chunk_index = i;                // Sequential index
        chunk.content = chunks[i];            // Text content
        chunk.embedding = JSON.stringify(embeddings[i]); // 384-dim vector
        chunk.token_count = chunks[i].length; // Approximate tokens
        chunk.created_at = Date.now().toString();
        chunk.updated_at = Date.now().toString();
        
        this.context.DocumentChunk.add(chunk);
    }
    this.context.saveChanges();
    
    return documentId;
}
```

**SQL Generated (Conceptual):**

```sql
-- 1. Insert document
INSERT INTO documents 
(chat_id, workspace_id, tenant_id, title, filename, file_path, mime_type, 
 file_size, created_at, updated_at) 
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);

-- 2. Get last inserted ID
SELECT LAST_INSERT_ID() as documentId;

-- 3. Insert chunks (batch)
INSERT INTO document_chunks 
(document_id, chunk_index, content, embedding, token_count, created_at, updated_at) 
VALUES 
(?, 0, ?, ?, ?, ?, ?),
(?, 1, ?, ?, ?, ?, ?),
(?, 2, ?, ?, ?, ?, ?),
...
(?, N-1, ?, ?, ?, ?, ?);
```

### 4.2 Query/Retrieval Flow

**File:** `/app/service/ragService.js` - `queryRAG()` method

```javascript
async queryRAG({ chatId = null, workspaceId = null, question, k = 5 }) {
    // 1. Generate question embedding
    const questionEmbedding = await this.generateEmbedding(question);
    // Returns: 384-dimensional vector

    // 2. Retrieve workspace documents
    let workspaceDocuments = [];
    if (workspaceId) {
        workspaceDocuments = this.context.Document
            .where(d => d.workspace_id == $$, workspaceId)
            .toList();
    }

    // 3. Retrieve chat documents
    let chatDocuments = [];
    if (chatId) {
        chatDocuments = this.context.Document
            .where(d => d.chat_id == $$, chatId)
            .toList();
    }

    // 4. Merge and get all document IDs
    const documents = [...workspaceDocuments, ...chatDocuments];
    const documentIds = documents.map(d => d.id);

    // 5. Get all chunks for these documents
    const allChunks = this.context.DocumentChunk.toList();
    const chunks = allChunks.filter(c => 
        documentIds.includes(c.document_id || c.Document)
    );

    // 6. Calculate cosine similarity for each chunk
    const scoredChunks = [];
    for (const chunk of chunks) {
        if (!chunk.embedding) continue;
        
        const chunkEmbedding = JSON.parse(chunk.embedding);
        const similarity = this.cosineSimilarity(questionEmbedding, chunkEmbedding);
        const document = documents.find(d => d.id === chunk.document_id);
        
        scoredChunks.push({
            chunkId: chunk.id,
            documentId: chunk.document_id,
            documentTitle: document?.title,
            content: chunk.content,
            score: similarity,
            source: document?.workspace_id ? 'workspace' : 'chat'
        });
    }

    // 7. Sort by similarity and return top k
    scoredChunks.sort((a, b) => b.score - a.score);
    return scoredChunks.slice(0, k);
}
```

**SQL Generated (Conceptual):**

```sql
-- 1. Get workspace documents
SELECT * FROM documents 
WHERE workspace_id = ?;

-- 2. Get chat documents
SELECT * FROM documents 
WHERE chat_id = ?;

-- 3. Get all chunks for these documents
SELECT * FROM document_chunks 
WHERE document_id IN (?, ?, ?, ...);
```

**Similarity Calculation (In-Memory):**
```javascript
cosineSimilarity(vectorA, vectorB) {
    let dotProduct = 0, normA = 0, normB = 0;
    for (let i = 0; i < vectorA.length; i++) {
        dotProduct += vectorA[i] * vectorB[i];
        normA += vectorA[i] * vectorA[i];
        normB += vectorB[i] * vectorB[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
```

### 4.3 Document Deletion

**File:** `/app/controllers/api/ragController.js` - `deleteDocument()` method

```javascript
async deleteDocument(obj) {
    const documentId = obj?.params?.id;
    
    // 1. Get document
    const document = this._ragContext.Document
        .where(d => d.id == $$, documentId)
        .single();
    
    // 2. Verify access (via chat or tenant_id)
    if (document.chat_id) {
        const membership = this._chatContext.UserChat
            .where(uc => uc.chat_id == $$ && uc.user_id == $$, 
                   document.chat_id, this._currentUser.id)
            .single();
        if (!membership) throw new Error('Unauthorized');
    }
    
    // 3. Delete all chunks
    await this.ragService.deleteDocumentChunks(documentId);
    
    // 4. Delete document
    this._ragContext.Document.remove(document);
    this._ragContext.saveChanges();
}

// In RAGService:
async deleteDocumentChunks(documentId) {
    const chunks = this.context.DocumentChunk
        .where(c => c.document_id == $$, documentId)
        .toList();
    
    for (const chunk of chunks) {
        this.context.DocumentChunk.remove(chunk);
    }
    this.context.saveChanges();
}
```

**SQL Generated (Conceptual):**

```sql
-- 1. Get document
SELECT * FROM documents WHERE id = ?;

-- 2. Get all chunks
SELECT * FROM document_chunks WHERE document_id = ?;

-- 3. Delete chunks (cascade or individual)
DELETE FROM document_chunks WHERE document_id = ?;

-- 4. Delete document
DELETE FROM documents WHERE id = ?;
```

### 4.4 List Documents by Chat

**File:** `/app/controllers/api/ragController.js` - `listDocuments()` method

```javascript
async listDocuments(obj) {
    const chatId = obj?.params?.query?.chatId;
    
    // Get documents for chat
    const documents = this._ragContext.Document
        .where(d => d.chat_id == $$, parseInt(chatId, 10))
        .toList()
        .sort((a, b) => b.created_at - a.created_at);
    
    // Map to response
    const results = documents.map(doc => ({
        id: doc.id,
        title: doc.title,
        filename: doc.filename,
        mimeType: doc.mime_type,
        createdAt: doc.created_at,
        updatedAt: doc.updated_at
    }));
    
    return { success: true, documents: results };
}
```

**SQL Generated (Conceptual):**

```sql
SELECT * FROM documents 
WHERE chat_id = ? 
ORDER BY created_at DESC;
```

### 4.5 Get Statistics

**File:** `/app/controllers/api/ragController.js` - `getStats()` method

```javascript
async getChatStats(chatId) {
    // Get all documents for chat
    const documents = this.context.Document
        .where(d => d.chat_id == $$, chatId)
        .toList();
    
    let chunkCount = 0;
    let totalTokens = 0;
    
    // Count chunks per document
    for (const doc of documents) {
        const docChunks = this.context.DocumentChunk
            .where(c => c.document_id == $$, doc.id)
            .toList();
        chunkCount += docChunks.length;
        totalTokens += docChunks.reduce((sum, chunk) => 
            sum + (chunk.token_count || 0), 0);
    }
    
    return {
        documentCount: documents.length,
        chunkCount: chunkCount,
        totalTokens: totalTokens,
        avgChunksPerDoc: documents.length > 0 
            ? Math.round(chunkCount / documents.length) 
            : 0
    };
}
```

**SQL Generated (Conceptual):**

```sql
SELECT COUNT(*) as documentCount FROM documents WHERE chat_id = ?;

SELECT d.id, COUNT(c.id) as chunkCount, SUM(c.token_count) as totalTokens
FROM documents d
LEFT JOIN document_chunks c ON d.id = c.document_id
WHERE d.chat_id = ?
GROUP BY d.id;
```

---

## 5. Data Types and Special Fields

### 5.1 Timestamp Fields

**Format:** String (ISO 8601 or Unix timestamp)

```javascript
// Generated by ORM getter
created_at(db) {
    db.string().notNullable();
    db.get(function(value) {
        if (!value) {
            return Date.now().toString(); // e.g., "1701234567890"
        }
        return value;
    });
}
```

**Storage:**
- Stored as STRING in database
- Typically Unix milliseconds as string
- Examples: `"1701234567890"`, `"1701234567"`

**Query Example:**
```javascript
// Sort by creation date (newest first)
documents.sort((a, b) => b.created_at - a.created_at);
```

### 5.2 Embedding Vectors

**Format:** JSON-serialized array of floats

```javascript
embedding(db) {
    db.string().nullable(); // JSON string: "[0.123, 0.456, ...]"
}
```

**Storage Details:**
- Type: STRING or TEXT column
- Content: JSON array of floats
- Dimensions: 384 (from Xenova/all-MiniLM-L6-v2 model)
- Range: [-1, 1] (normalized by default)
- Size: ~1.5 KB per embedding (384 floats × ~4 bytes)

**Example Embedding:**
```json
[
  0.0234, 0.0156, -0.0423, 0.0589, 0.0134, -0.0267,
  0.0445, -0.0378, 0.0289, -0.0512, 0.0223, 0.0367,
  ... (384 total values)
]
```

**Storage and Retrieval:**
```javascript
// Storage: Serialize to JSON
chunk.embedding = JSON.stringify(embeddings[i]);

// Retrieval: Parse from JSON
const chunkEmbedding = JSON.parse(chunk.embedding);

// Similarity calculation uses cosine similarity
const similarity = this.cosineSimilarity(questionEmbedding, chunkEmbedding);
```

### 5.3 Token Count

**Type:** INTEGER
**Source:** Approximate calculation based on character count
**Formula:** `content.length` (used as proxy)

```javascript
chunk.token_count = chunks[i].length; // Characters, not actual tokens
```

**Actual Purpose:**
- Storage quota calculations
- Statistics reporting
- Not used for token limit enforcement

### 5.4 Content Field

**Type:** STRING or TEXT
**Size:** Variable (typically 500 characters due to chunking)
**Storage:** Raw text (no encoding)

**Chunking Parameters:**
```javascript
this.textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 500,           // Characters per chunk
    chunkOverlap: 50,         // Overlap for context preservation
    separators: [
        '\n\n',    // Paragraph boundary
        '\n',      // Line boundary
        '. ',      // Sentence boundary
        '! ',
        '? ',
        ', ',      // Phrase boundary
        ' ',       // Word boundary
        ''         // Character fallback
    ]
});
```

**Example Chunks:**
```
Chunk 0 (characters 0-500):
"The quick brown fox jumps over the lazy dog. This is the first chunk..."

Chunk 1 (characters 450-950, overlap 50):
"y dog. This is the first chunk... and this is the second chunk..."

Chunk 2 (characters 900-1400, overlap 50):
"chunk... and this is the second chunk... and this is the third..."
```

---

## 6. Database Configuration

### 6.1 Database Context Setup

**File:** `/app/models/ragContext.js`

```javascript
const masterrecord = require('masterrecord');
const path = require('path');
const Document = require('./document');
const DocumentChunk = require('./documentChunk');
const Settings = require('./settings');

class ragContext extends masterrecord.context {
    constructor() {
        super();
        
        // Use absolute path to plugin's environment folder
        const pluginEnvPath = path.join(__dirname, '../../config/environments');
        this.env(pluginEnvPath);
        
        // Register models
        this.dbset(Document);
        this.dbset(DocumentChunk);
        this.dbset(Settings);
    }
}

module.exports = ragContext;
```

**Configuration Files:**

- Production: `/config/environments/env.production.json`
- Development: `/config/environments/env.development.json`

These files contain database connection details:
```json
{
    "database": "sqlite",
    "filepath": "/path/to/bookbag.db"
}
```
or
```json
{
    "database": "mysql",
    "host": "localhost",
    "user": "root",
    "password": "password",
    "database": "bookbag"
}
```

### 6.2 Database Initialization

**File:** `/app/models/db/migrations/1760328420571_Init_migration.js`

```javascript
class Init extends masterrecord.schema {
    constructor(context) {
        super(context);
    }

    up(table) {
        this.init(table);
        
        // Create tables
        this.createTable(table.Document);
        this.createTable(table.DocumentChunk);
        this.createTable(table.Settings);
        
        // Seed default settings
        this.seed('Settings', {
            disable_rag: 0,
            disable_rag_chat: 0,
            disable_rag_workspace: 0,
            created_at: Date.now().toString(),
            updated_at: Date.now().toString()
        });
    }

    down(table) {
        this.init(table);
        
        // Drop tables in reverse order (FK dependencies)
        this.droptable(table.DocumentChunk);  // Drop first (has FK)
        this.droptable(table.Document);       // Drop second
        this.droptable(table.Settings);       // Drop last
    }
}
```

**Initialization Process:**
1. Run migrations when plugin is activated
2. Creates all three tables
3. Seeds Settings table with default values
4. Creates storage directories (`storage/rag/documents`, `storage/rag/vectors`)

### 6.3 Service Initialization

**File:** `/app/service/ragService.js`

```javascript
constructor(context) {
    this.context = context; // RAG database context

    // Initialize local embedding service
    this.embeddingService = new EmbeddingService();

    // Initialize text splitter
    this.textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 500,
        chunkOverlap: 50,
        separators: ['\n\n', '\n', '. ', '! ', '? ', ', ', ' ', '']
    });

    console.log('✅ RAGService initialized with local embeddings');
}
```

**Embedding Service Initialization:**
```javascript
async initialize() {
    // Lazy-loads on first embed() call
    const transformers = await import('@xenova/transformers');
    this.pipe = await transformers.pipeline('feature-extraction', 
                                           'Xenova/all-MiniLM-L6-v2');
    this.isInitialized = true;
}
```

---

## 7. Advanced Topics

### 7.1 Multi-Tenant Isolation

**Strategy:** Scope by chat_id or workspace_id

```javascript
// Chat-scoped query
const documents = this.context.Document
    .where(d => d.chat_id == $$, chatId)
    .toList();

// Workspace-scoped query
const documents = this.context.Document
    .where(d => d.workspace_id == $$, workspaceId)
    .toList();

// Verification via UserChat or workspace membership
const membership = this._chatContext.UserChat
    .where(uc => uc.chat_id == $$ && uc.user_id == $$, chatId, userId)
    .single();
```

### 7.2 Layered Retrieval

Documents can be retrieved from both workspace and chat levels simultaneously:

```javascript
// Combine workspace and chat documents
let workspaceDocuments = [];
if (workspaceId) {
    workspaceDocuments = this.context.Document
        .where(d => d.workspace_id == $$, workspaceId)
        .toList();
}

let chatDocuments = [];
if (chatId) {
    chatDocuments = this.context.Document
        .where(d => d.chat_id == $$, chatId)
        .toList();
}

// Merge and deduplicate
const allDocuments = [...workspaceDocuments, ...chatDocuments];
const uniqueDocuments = allDocuments.filter((doc, index, self) =>
    index === self.findIndex(d => d.id === doc.id)
);
```

### 7.3 Batch Embedding Generation

Embeddings are generated in batches to manage memory:

```javascript
async embedBatch(texts, options = {}) {
    const embeddings = [];
    const batchSize = 10;  // Process 10 texts at a time
    
    for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize);
        const batchEmbeddings = await Promise.all(
            batch.map(text => this.embed(text, options))
        );
        embeddings.push(...batchEmbeddings);
    }
    
    return embeddings;
}
```

### 7.4 Cosine Similarity Calculation

Used for ranking chunks by relevance:

```javascript
cosineSimilarity(vectorA, vectorB) {
    if (vectorA.length !== vectorB.length) {
        throw new Error('Vectors must have same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vectorA.length; i++) {
        dotProduct += vectorA[i] * vectorB[i];
        normA += vectorA[i] * vectorA[i];
        normB += vectorB[i] * vectorB[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
}

// Returns: 0 = no similarity, 1 = identical
// Example result: 0.8234 = 82.34% relevance
```

### 7.5 RAG Disable Settings Logic

```javascript
static shouldSkipRAG(ragContext, chatContext, chatId) {
    const settings = ragContext.Settings.single();
    
    // Rule 1: Global disable
    if (settings.disable_rag) {
        return true;  // Skip RAG
    }
    
    // Rule 2: Get chat to check creation source
    const chat = chatContext.Chat
        .where(c => c.id == $$, chatId)
        .single();
    
    const isWorkspaceCreated = chat.created_by === 'Workspace';
    
    // Rule 3: Workspace chats
    if (settings.disable_rag_workspace && isWorkspaceCreated) {
        return true;  // Skip RAG
    }
    
    // Rule 4: Regular user chats
    if (settings.disable_rag_chat && !isWorkspaceCreated) {
        return true;  // Skip RAG
    }
    
    return false;  // Use RAG
}
```

---

## 8. Performance Considerations

### 8.1 Query Optimization

**Current Implementation:**
```javascript
// Gets ALL chunks into memory, then filters
const allChunks = this.context.DocumentChunk.toList();
const chunks = allChunks.filter(c => 
    documentIds.includes(c.document_id)
);
```

**Recommended Optimization:**
```javascript
// Get only needed chunks (depends on ORM capabilities)
const chunks = this.context.DocumentChunk
    .where(c => c.document_id.in(documentIds))
    .toList();
```

### 8.2 Similarity Calculation

**Current:** In-memory cosine similarity for all chunks
**Memory Usage:** 384 dimensions × 4 bytes × number of chunks
**Processing:** O(n×384) for n chunks

**Optimization Opportunity:**
- Use database-native vector operations (PostgreSQL pgvector, MySQL vector type)
- Batch process embeddings
- Cache frequently used embeddings

### 8.3 Embedding Storage

**Current Size per Chunk:**
- 384 dimensions × ~4 bytes per float = ~1.5 KB
- JSON serialization adds ~30-50% overhead = ~2 KB per chunk

**For a Document with 100 chunks:**
- Chunk content: ~50 KB (500 chars × 100 chunks)
- Embeddings: ~200 KB (2 KB × 100 chunks)
- **Total: ~250 KB per document**

### 8.4 Recommended Indexes

```sql
-- Critical for document retrieval
CREATE INDEX idx_documents_chat_id ON documents(chat_id);
CREATE INDEX idx_documents_workspace_id ON documents(workspace_id);

-- Critical for chunk retrieval
CREATE INDEX idx_document_chunks_document_id ON document_chunks(document_id);

-- For statistics queries
CREATE INDEX idx_document_chunks_document_chunk_index 
ON document_chunks(document_id, chunk_index);
```

---

## 9. Migration and Upgrade Path

### 9.1 Current Schema Version

**Migration ID:** `1760328420571_Init_migration.js`
**Date:** Created ~October 2024
**Status:** Initial schema

### 9.2 Future Migrations

When modifying the schema, create new migration files:

```javascript
// 1760328420572_Add_vector_field.js
class AddVectorField extends masterrecord.schema {
    up(table) {
        this.init(table);
        // Modify DocumentChunk table
        this.table(table.DocumentChunk, (t) => {
            // Add new column
            t.string('vector_blob').nullable();
        });
    }

    down(table) {
        this.init(table);
        // Rollback
        this.table(table.DocumentChunk, (t) => {
            t.dropColumn('vector_blob');
        });
    }
}
```

---

## 10. Troubleshooting

### 10.1 Common Issues

**Issue: Settings record not found**
```javascript
// Always check for null
let settings = this._ragContext.Settings.single();
if (!settings) {
    // Use defaults or create new
    settings = { disable_rag: false, ... };
}
```

**Issue: Chunks not found for document**
```javascript
// Check both field names (ORM may use either)
const chunks = allChunks.filter(c => 
    documentIds.includes(c.document_id || c.Document)
);
```

**Issue: Embedding generation fails**
```javascript
// Check if model is loaded
await this.embeddingService.initialize();

// Verify @xenova/transformers is installed
npm install @xenova/transformers
```

### 10.2 Data Validation

**Before Ingestion:**
```javascript
if (!text || text.length < 50) {
    throw new Error('Document text too short');
}

if (!title || !filename) {
    throw new Error('Title and filename required');
}
```

**During Chunking:**
```javascript
const chunks = await this.chunkText(text);
if (chunks.length === 0) {
    throw new Error('Text chunking produced no results');
}
```

**After Embedding:**
```javascript
const embeddings = await this.embeddingService.embedBatch(chunks);
if (embeddings.length !== chunks.length) {
    throw new Error('Embedding count mismatch');
}
```

---

## 11. API Reference

### 11.1 RAG Controller Endpoints

**POST /api/rag/ingest**
- Upload and ingest a document
- Parameters: file, chatId (optional), workspaceId (optional), title (optional)
- Returns: { success, documentId, chatId }

**POST /api/rag/ingest-url**
- Ingest content from a URL
- Parameters: url
- Returns: { success, documentId }

**GET /api/rag/list**
- List documents for a chat or workspace
- Query: chatId or workspaceId
- Returns: { success, documents: [...] }

**GET /api/rag/admin/list**
- List all documents (admin only)
- Query: search (optional)
- Returns: { success, documents: [...], total }

**POST /api/rag/query**
- Query the knowledge base
- Parameters: chatId, question, k (optional, default 5)
- Returns: { success, results: [...], context, count }

**DELETE /api/rag/delete/:id**
- Delete a document
- Returns: { success }

**GET /api/rag/stats**
- Get knowledge base statistics
- Query: chatId or workspaceId
- Returns: { success, stats: { documentCount, chunkCount, ... } }

**GET /api/rag/storage/usage**
- Get storage usage statistics
- Returns: { success, mb, bytes, quota, percentUsed, exceeded }

**GET /api/rag/settings**
- Get RAG settings
- Returns: { success, settings: { disableRag, ... } }

**POST /api/rag/settings**
- Update RAG settings
- Parameters: disableRag, disableRagChat, disableRagWorkspace
- Returns: { success, settings: {...} }

---

## 12. Database Schema SQL Reference

### 12.1 SQLite Schema

```sql
CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id INTEGER,
    workspace_id INTEGER,
    tenant_id TEXT,
    title TEXT NOT NULL,
    filename TEXT NOT NULL,
    file_path TEXT,
    mime_type TEXT,
    file_size INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE SET NULL,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS document_chunks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id INTEGER NOT NULL,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    embedding TEXT,
    token_count INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    disable_rag BOOLEAN DEFAULT 0,
    disable_rag_chat BOOLEAN DEFAULT 0,
    disable_rag_workspace BOOLEAN DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Recommended indexes
CREATE INDEX idx_documents_chat_id ON documents(chat_id);
CREATE INDEX idx_documents_workspace_id ON documents(workspace_id);
CREATE INDEX idx_document_chunks_document_id ON document_chunks(document_id);
CREATE INDEX idx_document_chunks_document_chunk_index ON document_chunks(document_id, chunk_index);
```

### 12.2 MySQL Schema

```sql
CREATE TABLE IF NOT EXISTS `documents` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `chat_id` INT NULL,
    `workspace_id` INT NULL,
    `tenant_id` VARCHAR(255) NULL,
    `title` VARCHAR(255) NOT NULL,
    `filename` VARCHAR(255) NOT NULL,
    `file_path` VARCHAR(255) NULL,
    `mime_type` VARCHAR(100) NULL,
    `file_size` INT NOT NULL DEFAULT 0,
    `created_at` TEXT NOT NULL,
    `updated_at` TEXT NOT NULL,
    FOREIGN KEY (`chat_id`) REFERENCES `chats`(`id`) ON DELETE SET NULL,
    FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON DELETE SET NULL,
    INDEX `idx_documents_chat_id` (`chat_id`),
    INDEX `idx_documents_workspace_id` (`workspace_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `document_chunks` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `document_id` INT NOT NULL,
    `chunk_index` INT NOT NULL,
    `content` LONGTEXT NOT NULL,
    `embedding` LONGTEXT NULL,
    `token_count` INT DEFAULT 0,
    `created_at` TEXT NOT NULL,
    `updated_at` TEXT NOT NULL,
    FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON DELETE CASCADE,
    INDEX `idx_document_chunks_document_id` (`document_id`),
    INDEX `idx_document_chunks_document_chunk_index` (`document_id`, `chunk_index`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `settings` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `disable_rag` BOOLEAN DEFAULT 0,
    `disable_rag_chat` BOOLEAN DEFAULT 0,
    `disable_rag_workspace` BOOLEAN DEFAULT 0,
    `created_at` TEXT NOT NULL,
    `updated_at` TEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## Conclusion

The RAG plugin database architecture is designed for:
- **Modularity:** Self-contained plugin with isolated context
- **Security:** Multi-tenant isolation via chat_id/workspace_id scoping
- **Flexibility:** Support for both chat-level and workspace-level documents
- **Performance:** Indexed lookups and batch embedding generation
- **Simplicity:** No external dependencies, fully local embeddings

For questions or issues, refer to the relevant source files in `/bb-plugins/rag-plugin/app/`.
