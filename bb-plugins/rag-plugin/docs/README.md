# RAG Plugin Documentation

Retrieval-Augmented Generation (RAG) plugin for Bookbag CE - Local-first document knowledge base with vector search.

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Core Concepts](#core-concepts)
- [Usage Examples](#usage-examples)
- [Configuration](#configuration)
- [Plugin Lifecycle](#plugin-lifecycle)
- [Integration](#integration)
- [Related Documentation](#related-documentation)

---

## Overview

The RAG Plugin enables Retrieval-Augmented Generation for Bookbag CE, allowing users to upload documents, automatically chunk and embed them, and perform intelligent semantic search. Retrieved context is automatically injected into LLM conversations to provide grounded, factual responses based on your knowledge base.

**Plugin Path:** `bb-plugins/rag-plugin/`
**API Prefix:** `/bb-rag/api/rag/`
**Database Context:** `ragContext`
**Storage Location:** `storage/rag/documents/`

### Key Characteristics

- **Local-First**: No external API dependencies (uses Xenova transformers)
- **Offline-Capable**: Fully functional without internet connection
- **Multi-Format Support**: PDF, DOCX, TXT, MD, HTML, CSV
- **Multi-Tenant**: Chat-level and workspace-level document scoping
- **Three-Tier Control**: Granular enable/disable settings

---

## Key Features

### Document Management
- **Multi-Format Ingestion** - PDF, DOCX, TXT, MD, HTML, CSV extraction
- **URL Ingestion** - Fetch and process content from URLs
- **Text Chunking** - LangChain RecursiveCharacterTextSplitter (500 chars, 50 overlap)
- **Document Deletion** - Remove documents with cascade cleanup
- **File Storage** - Tenant-isolated storage with quota management

### Vector Search & Embeddings
- **Local Embeddings** - Xenova/all-MiniLM-L6-v2 (384-dim)
- **Cosine Similarity** - Relevance-based retrieval
- **Batch Processing** - Efficient multi-chunk embedding generation
- **Top-K Results** - Configurable result count (default: 5)

### LLM Integration
- **Auto-Context Injection** - LLM_BEFORE_GENERATE hook
- **Formatted Context** - Pretty-printed with sources and relevance scores
- **Layered Retrieval** - Workspace + Chat document merging
- **Disable Controls** - Three-tier RAG enable/disable system

### Admin & UI Components
- **Document Management UI** - Browse, search, delete documents
- **Settings Panel** - Configure RAG system settings
- **Knowledge Sidebar** - Client-side document upload and listing
- **Statistics** - Document counts, chunk counts, storage usage

---

## Architecture

### Plugin Structure

```
rag-plugin/
├── index.js                          # Plugin entry point & lifecycle
├── plugin.json                       # Plugin metadata
├── app/
│   ├── controllers/api/
│   │   ├── ragController.js         # Document & query operations
│   │   └── ragSettingsController.js # Settings management
│   ├── models/
│   │   ├── document.js              # Document metadata
│   │   ├── documentChunk.js         # Chunks with embeddings
│   │   ├── settings.js              # RAG system settings
│   │   └── ragContext.js            # Database context
│   ├── service/
│   │   ├── ragService.js            # Core RAG operations
│   │   ├── embeddingService.js      # Local embedding generation
│   │   ├── textExtractorService.js  # Multi-format text extraction
│   │   └── fileStorageService.js    # Tenant file management
│   ├── hooks/
│   │   └── llmBeforeGenerateHandler.js # LLM context injection
│   └── models/db/migrations/
│       └── 1760328420571_Init_migration.js
├── config/
│   ├── routes.js                    # API routes
│   ├── initializers/config.js       # Context registration
│   └── environments/                # Environment configs
└── nextjs/
    ├── admin/rag/
    │   ├── documents/page.js        # Document management
    │   └── settings/page.js         # Settings UI
    └── client/
        └── KnowledgeBaseSidebar.js  # Client sidebar
```

### Document Ingestion Flow

```
User Upload
    ↓
[1] Validate File & Check Quota
    ↓
[2] Text Extraction (TextExtractorService)
    Supports: PDF, DOCX, TXT, MD, HTML, CSV
    ↓
[3] Text Chunking (LangChain)
    Chunk Size: 500 chars
    Overlap: 50 chars
    ↓
[4] Batch Embedding Generation (EmbeddingService)
    Model: Xenova/all-MiniLM-L6-v2
    Dimensions: 384
    Batch Size: 10 chunks
    ↓
[5] Database Storage
    Document record → metadata
    DocumentChunk records → text + embeddings
    ↓
Ready for RAG Queries
```

### RAG Query Flow

```
User Message → Chat
    ↓
[1] LLM_BEFORE_GENERATE Hook Triggered
    ↓
[2] Check RAG Disable Flags
    Skip if disabled
    ↓
[3] Generate Question Embedding
    Using same embedding model
    ↓
[4] Retrieve Documents
    - Workspace documents
    - Chat documents
    ↓
[5] Calculate Cosine Similarity
    For each chunk vs. question
    ↓
[6] Sort by Relevance & Get Top K
    Default K = 5
    ↓
[7] Build Context String
    Format with sources and scores
    ↓
[8] Inject as System Message
    Add before user message in history
    ↓
LLM Processes Augmented Context
```

### Three-Tier Control System

```
disable_rag (Master Switch)
├── disable_rag_workspace → Controls workspace-level documents
└── disable_rag_chat → Controls chat-level documents
```

**Logic:**
- If `disable_rag = true` → Skip ALL RAG
- If `disable_rag_workspace = true` AND workspace chat → Skip RAG
- If `disable_rag_chat = true` AND regular chat → Skip RAG
- Otherwise → Use RAG

---

## Quick Start

### Upload a Document

```javascript
// Frontend - Upload document to chat
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('chatId', currentChatId);

const response = await fetch('/bb-rag/api/rag/ingest', {
  method: 'POST',
  body: formData
});

const data = await response.json();
console.log('Document ingested:', data);
// {
//   success: true,
//   documentId: 123,
//   chatId: 456
// }
```

### Ingest from URL

```javascript
// Frontend - Ingest web content
const response = await fetch('/bb-rag/api/rag/ingest-url', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    url: 'https://example.com/article',
    chatId: currentChatId,
    title: 'Example Article'
  })
});

const data = await response.json();
console.log('URL ingested:', data.documentId);
```

### Query Knowledge Base

```javascript
// Backend - Query RAG system
const response = await fetch('/bb-rag/api/rag/query', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    chatId: 123,
    question: 'What is the pricing model?',
    k: 5  // Top 5 results
  })
});

const data = await response.json();
console.log('Results:', data.results);
// [
//   {
//     chunk: { content: "...", document_id: 1 },
//     document: { title: "Pricing Doc" },
//     similarity: 0.89
//   }
// ]
```

### List Documents

```javascript
// Frontend - Get documents for chat
const response = await fetch('/bb-rag/api/rag/list?chatId=123');
const data = await response.json();

console.log('Documents:', data.documents);
// [
//   {
//     id: 1,
//     title: "Product Guide",
//     filename: "guide.pdf",
//     mime_type: "application/pdf",
//     file_size: 1024000,
//     created_at: "..."
//   }
// ]
```

### Delete Document

```javascript
// Frontend - Delete document
const response = await fetch('/bb-rag/api/rag/delete/123', {
  method: 'DELETE'
});

const data = await response.json();
console.log('Deleted:', data.success);
```

### Get Statistics

```javascript
// Frontend - Get knowledge base stats
const response = await fetch('/bb-rag/api/rag/stats?chatId=123');
const data = await response.json();

console.log('Stats:', data.stats);
// {
//   documentCount: 5,
//   chunkCount: 120,
//   totalTokens: 30000,
//   avgChunksPerDoc: 24
// }
```

---

## Core Concepts

### Local Embedding Generation

The RAG plugin uses **@xenova/transformers** for local embedding generation, eliminating external API dependencies.

**Model**: `Xenova/all-MiniLM-L6-v2`
- 384-dimensional embeddings
- Lightweight (~300MB memory)
- Fast inference (< 100ms per chunk)
- No Python dependencies
- Lazy-loaded on first use

**Usage:**
```javascript
const EmbeddingService = require('./app/service/embeddingService');
const embeddingService = new EmbeddingService();

// Initialize model (lazy-loaded)
await embeddingService.initialize();

// Single embedding
const embedding = await embeddingService.embed("Your text here");
// Returns: [0.123, -0.456, 0.789, ...] (384 floats)

// Batch embeddings
const embeddings = await embeddingService.embedBatch([
  "Text 1",
  "Text 2",
  "Text 3"
]);
// Returns: [[...], [...], [...]]

// Cosine similarity
const similarity = embeddingService.cosineSimilarity(embedding1, embedding2);
// Returns: 0.87 (range: -1 to 1)
```

### Text Extraction

**Supported Formats:**

1. **Plain Text** (`.txt`, `.md`, `.markdown`)
   - Direct file read via `fs.readFile`

2. **PDF** (`.pdf`)
   - Uses `pdf-parse` library
   - Extracts text from text-based PDFs
   - No OCR support

3. **Word Documents** (`.docx`)
   - Uses `mammoth` library
   - Converts to plain text
   - Preserves paragraph structure

4. **HTML** (`.html`, `.htm`)
   - Uses `cheerio` for parsing
   - Removes `<script>` and `<style>` tags
   - Extracts clean text content

5. **CSV** (`.csv`)
   - Uses `csv-parser` library
   - Converts rows to `key:value` format
   - Joins with newlines

**Example:**
```javascript
const TextExtractorService = require('./app/service/textExtractorService');
const extractor = new TextExtractorService();

// Extract text from any supported format
const text = await extractor.extract('/path/to/file.pdf', 'application/pdf');
console.log('Extracted text:', text);

// Check if format is supported
if (extractor.isSupported('document.pdf')) {
  // Process file
}

// Get supported extensions
const extensions = extractor.getSupportedExtensions();
// Returns: ['.txt', '.md', '.pdf', '.docx', '.html', '.csv']
```

### Text Chunking Strategy

**LangChain RecursiveCharacterTextSplitter:**
- Chunk Size: 500 characters
- Chunk Overlap: 50 characters
- Intelligent splitting on sentence/paragraph boundaries

**Why 500 characters?**
- Optimal balance between context and granularity
- ~125 tokens (typical)
- Small enough for precise retrieval
- Large enough for meaningful context

**Overlap Benefits:**
- Preserves context across boundaries
- Prevents information loss at split points
- Improves retrieval accuracy

**Example:**
```javascript
const { RecursiveCharacterTextSplitter } = require('@langchain/textsplitters');

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 500,
  chunkOverlap: 50
});

const chunks = await splitter.splitText(documentText);
// Returns: ['chunk1...', 'chunk2...', ...]
```

### Multi-Tenant Document Scoping

Documents can be scoped to either **chat** or **workspace** level:

**Chat-Level Documents:**
```javascript
{
  chat_id: 123,        // Linked to specific chat
  workspace_id: null,
  tenant_id: "user1"   // Owner
}
```
- Visible only in the specific chat
- Private to chat participants
- Deleted when chat is deleted

**Workspace-Level Documents:**
```javascript
{
  chat_id: null,
  workspace_id: 456,   // Linked to workspace
  tenant_id: null
}
```
- Shared across all workspace chats
- Visible to all workspace members
- Persists across chats

**Retrieval Order:**
1. Workspace documents (if workspace chat)
2. Chat-specific documents
3. Merge and deduplicate
4. Sort by relevance

### Cosine Similarity Search

**Formula:**
```
similarity = (A · B) / (||A|| × ||B||)
```

Where:
- A = Question embedding
- B = Chunk embedding
- Result range: -1 (opposite) to 1 (identical)

**Implementation:**
```javascript
cosineSimilarity(a, b) {
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));

  return dotProduct / (magnitudeA * magnitudeB);
}
```

**Typical Scores:**
- **0.9 - 1.0**: Highly relevant, near-duplicate
- **0.7 - 0.9**: Very relevant
- **0.5 - 0.7**: Moderately relevant
- **< 0.5**: Low relevance (usually filtered)

### Context Injection Format

When RAG retrieves relevant chunks, they're formatted and injected as a system message:

```
Here is relevant information from your knowledge base:

📄 [1] 🏢 Workspace - "Company Handbook" (relevance: 92.5%)
Our pricing model includes three tiers: Basic ($10/mo), Pro ($25/mo), and Enterprise (custom pricing). Each tier includes different feature sets...

📄 [2] 💬 Chat - "Product Spec" (relevance: 87.3%)
The core features of our product include...

📄 [3] 🏢 Workspace - "FAQ Document" (relevance: 82.1%)
Frequently asked questions about pricing...

Use this information to answer the user's question accurately.
```

**Icons:**
- 📄 = Document
- 🏢 = Workspace-level document
- 💬 = Chat-level document

---

## Usage Examples

### Backend - RAG Service Integration

```javascript
const RAGService = require('./app/service/ragService');
const ragService = new RAGService();

// Initialize contexts
ragService.setContexts(ragContext, chatContext);

// Ingest document
const result = await ragService.ingestDocument({
  filePath: '/tmp/upload.pdf',
  filename: 'guide.pdf',
  mimeType: 'application/pdf',
  chatId: 123,
  workspaceId: null,
  tenantId: 'user1',
  title: 'User Guide'
});

console.log('Document ID:', result.documentId);
console.log('Chunks created:', result.chunkCount);

// Query RAG
const queryResult = await ragService.queryRAG({
  question: 'What is the refund policy?',
  chatId: 123,
  workspaceId: null,
  k: 5
});

console.log('Context:', queryResult.context);
console.log('Results:', queryResult.results);

// Get statistics
const stats = ragService.getChatStats(123);
console.log('Stats:', stats);
// {
//   documentCount: 3,
//   chunkCount: 75,
//   totalTokens: 18750,
//   avgChunksPerDoc: 25
// }

// Delete document
await ragService.deleteDocumentChunks(documentId);
```

### Backend - Embedding Service

```javascript
const EmbeddingService = require('./app/service/embeddingService');
const embeddingService = new EmbeddingService();

// Generate embeddings
const texts = [
  "Machine learning is a subset of AI",
  "Deep learning uses neural networks",
  "Natural language processing handles text"
];

const embeddings = await embeddingService.embedBatch(texts);

// Calculate similarities
const query = "What is AI?";
const queryEmbedding = await embeddingService.embed(query);

texts.forEach((text, i) => {
  const similarity = embeddingService.cosineSimilarity(
    queryEmbedding,
    embeddings[i]
  );
  console.log(`"${text}": ${(similarity * 100).toFixed(1)}%`);
});
```

### Backend - Text Extraction

```javascript
const TextExtractorService = require('./app/service/textExtractorService');
const extractor = new TextExtractorService();

// Extract from PDF
const pdfText = await extractor.extractPDF('/path/to/doc.pdf');

// Extract from DOCX
const docxText = await extractor.extractDocx('/path/to/doc.docx');

// Extract from HTML
const htmlText = await extractor.extractHTML('/path/to/page.html');

// Extract from CSV
const csvText = await extractor.extractCSV('/path/to/data.csv');

// Auto-detect and extract
const text = await extractor.extract(filePath, mimeType);
```

### Frontend - React Document Upload

```jsx
import React, { useState } from 'react';

function DocumentUpload({ chatId }) {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('chatId', chatId);

    try {
      const response = await fetch('/bb-rag/api/rag/ingest', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        alert(`Document uploaded! ID: ${data.documentId}`);
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <input
        type="file"
        onChange={handleUpload}
        disabled={uploading}
        accept=".pdf,.docx,.txt,.md,.html,.csv"
      />
      {uploading && <p>Uploading...</p>}
    </div>
  );
}
```

### Frontend - Document List Component

```jsx
import React, { useEffect, useState } from 'react';

function DocumentList({ chatId }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDocuments();
  }, [chatId]);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/bb-rag/api/rag/list?chatId=${chatId}`);
      const data = await response.json();

      if (data.success) {
        setDocuments(data.documents);
      }
    } catch (error) {
      console.error('Failed to load documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (docId) => {
    if (!confirm('Delete this document?')) return;

    try {
      const response = await fetch(`/bb-rag/api/rag/delete/${docId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        loadDocuments(); // Refresh list
      }
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div>
      <h3>Knowledge Base ({documents.length})</h3>
      {documents.map(doc => (
        <div key={doc.id} style={{ border: '1px solid #ccc', padding: '10px', margin: '10px 0' }}>
          <h4>{doc.title}</h4>
          <p>{doc.filename} - {(doc.file_size / 1024).toFixed(1)} KB</p>
          <button onClick={() => handleDelete(doc.id)}>Delete</button>
        </div>
      ))}
    </div>
  );
}
```

---

## Configuration

### RAG Settings

**Database Table**: `Settings`

**Fields:**
- `disable_rag` (boolean) - Master switch to disable all RAG
- `disable_rag_chat` (boolean) - Disable RAG for chat-level documents
- `disable_rag_workspace` (boolean) - Disable RAG for workspace documents

**API Endpoints:**
```javascript
// Get settings
GET /bb-rag/api/rag/settings

// Update settings
POST /bb-rag/api/rag/settings
{
  "disableRag": false,
  "disableRagChat": false,
  "disableRagWorkspace": false
}
```

### Storage Configuration

**Storage Path**: `storage/rag/documents/{tenantId}/`

**Quota Management**:
- Reads from MediaSettings component
- Default limit: 1024 MB
- Enforced at upload time

**File Naming**: `{timestamp}-{randomId}.{extension}`

### Embedding Model Configuration

**Model**: `Xenova/all-MiniLM-L6-v2`
- Cannot be changed without code modification
- Dimensions: 384 (hardcoded in schema)
- Model weights downloaded on first use (~300MB)
- Cached in `node_modules/.cache/@xenova/`

### Chunking Configuration

**Parameters** (in RAGService):
```javascript
const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 500,        // Modifiable
  chunkOverlap: 50       // Modifiable
});
```

To change:
1. Edit `bb-plugins/rag-plugin/app/service/ragService.js`
2. Modify `chunkSize` and `chunkOverlap` in `ingestDocument()` method
3. Re-ingest existing documents for consistency

---

## Plugin Lifecycle

### Activation (`activate`)

**Triggered**: First time plugin is enabled

**Actions:**
1. Run database migrations
   - Creates `Document`, `DocumentChunk`, `Settings` tables
2. Create storage directories
   - `storage/rag/documents/`
   - `storage/rag/vectors/` (unused)
3. Initialize default settings
   - All disable flags set to `false`
4. Create plugin symlink for Next.js
5. Fire `PLUGIN_ACTIVATED` hook

### Load (`load`)

**Triggered**: Every server start when plugin is active

**Actions:**
1. Register plugin as MasterController component
2. Register API routes (`/bb-rag/api/rag/...`)
3. Register admin views
   - `rag-documents` page
   - `rag-settings` page
4. Register client components
   - `KnowledgeBaseSidebar`
5. Register `LLM_BEFORE_GENERATE` hook
6. Add admin menu items
   - RAG → Documents
   - RAG → Settings

### Deactivation (`deactivate`)

**Triggered**: When plugin is disabled

**Actions:**
1. Fire `PLUGIN_DEACTIVATED` hook
2. Data remains in database (not deleted)
3. Can be re-enabled without data loss

---

## Integration

### LLM Hook Integration

The RAG plugin automatically injects context via the `LLM_BEFORE_GENERATE` hook:

**Hook Handler**: `app/hooks/llmBeforeGenerateHandler.js`

**Flow:**
1. Hook triggered before LLM processes message
2. Check if RAG should be skipped (disable flags)
3. Extract user's latest message (question)
4. Query RAG system for relevant chunks
5. Build formatted context string
6. Insert context as system message before user message
7. Return modified message history to LLM

**Implementation:**
```javascript
// In llmBeforeGenerateHandler.js
async function handle(context) {
  const { messageHistory, chatId, workspaceId } = context;

  // Check if RAG disabled
  if (RAGService.shouldSkipRAG(ragContext, chatContext, chatId)) {
    return { messageHistory }; // Pass through unchanged
  }

  // Get user's question
  const userMessage = messageHistory[messageHistory.length - 1];

  // Query RAG
  const ragResult = await ragService.queryRAG({
    question: userMessage.content,
    chatId,
    workspaceId,
    k: 5
  });

  if (ragResult.results.length === 0) {
    return { messageHistory }; // No results, pass through
  }

  // Build context string
  const contextMessage = {
    role: 'system',
    content: ragResult.context
  };

  // Insert before user message
  const augmentedHistory = [
    ...messageHistory.slice(0, -1),
    contextMessage,
    userMessage
  ];

  return { messageHistory: augmentedHistory };
}
```

### Admin Menu Integration

```javascript
// In index.js - load() method
pluginAPI.registerHook('ADMIN_MENU', () => {
  return {
    label: 'RAG',
    icon: 'Database',
    items: [
      {
        label: 'Documents',
        path: '/bb-admin/rag/documents',
        icon: 'FileText'
      },
      {
        label: 'Settings',
        path: '/bb-admin/rag/settings',
        icon: 'Settings'
      }
    ]
  };
});
```

### Database Context Integration

```javascript
// In config/initializers/config.js
module.exports = function(pluginAPI) {
  // Register ragContext as singleton
  pluginAPI.container.registerSingleton('ragContext', () => {
    const RAGContext = require('../../app/models/ragContext');
    return new RAGContext();
  });
};
```

**Usage in Controllers:**
```javascript
class myController extends mastercontroller {
  constructor(req) {
    super(req);
    this._ragContext = req.ragContext; // Available via DI
  }

  async myMethod() {
    const documents = this._ragContext.Document.toList();
    // ...
  }
}
```

---

## Related Documentation

- **[API.md](./API.md)** - Complete API reference with curl examples
- **[DATABASE.md](./DATABASE.md)** - Database schema and queries
- **[Plugin System](../../docs/plugins/PLUGIN_API.md)** - Plugin development guide

---

## Support

For issues, questions, or contributions, please refer to the main Bookbag CE repository.
