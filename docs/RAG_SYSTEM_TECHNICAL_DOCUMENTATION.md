# RAG System - Technical Documentation

**Bookbag Community Edition - Retrieval-Augmented Generation Implementation**

Version: 1.0
Last Updated: October 2025

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architecture Overview](#architecture-overview)
3. [Component Details](#component-details)
4. [NPM Dependencies](#npm-dependencies)
5. [Document Processing Pipeline](#document-processing-pipeline)
6. [Embedding & Vector Storage](#embedding--vector-storage)
7. [Query & Retrieval System](#query--retrieval-system)
8. [Integration Points](#integration-points)
9. [Configuration & Settings](#configuration--settings)
10. [Data Flow Diagrams](#data-flow-diagrams)
11. [Performance Characteristics](#performance-characteristics)
12. [Security & Privacy](#security--privacy)
13. [Code Examples](#code-examples)
14. [Troubleshooting Guide](#troubleshooting-guide)
15. [Future Enhancements](#future-enhancements)

---

## Executive Summary

The Bookbag RAG system is a **fully local, offline-capable knowledge base** implementation that enables semantic search and context-aware AI responses. Key features include:

- **100% Local**: No external API calls for embeddings (uses Xenova transformers)
- **Multi-Tenant**: Secure isolation with chat-level and workspace-level document scoping
- **Multi-Format**: Supports PDF, DOCX, TXT, MD, HTML, CSV
- **Smart Chunking**: LangChain RecursiveCharacterTextSplitter with overlap
- **Layered Retrieval**: Workspace + chat documents merged in single query
- **Privacy-First**: All data stays on your server

**Technology Stack**:
- **Embeddings**: Xenova/all-MiniLM-L6-v2 (384 dimensions, local inference)
- **Storage**: SQL database (embeddings as JSON) + filesystem for raw files
- **Search**: Brute-force cosine similarity (scalable to 1000s of chunks)
- **Integration**: WebSocket-based chat system with automatic RAG injection

---

## Architecture Overview

### Directory Structure

```
/components/rag/
├── app/
│   ├── controllers/api/
│   │   ├── ragController.js          # Main API endpoints (ingest, query, list, delete)
│   │   └── ragSettingsController.js  # System configuration management
│   ├── models/
│   │   ├── document.js               # Document metadata (title, path, size)
│   │   ├── documentChunk.js          # Chunked text with embeddings
│   │   ├── settings.js               # Global RAG settings (enable/disable)
│   │   └── ragContext.js             # Database ORM context
│   └── service/
│       ├── ragService.js             # Core logic (chunking, embedding, search)
│       ├── embeddingService.js       # Local embedding generation (Xenova)
│       ├── textExtractorService.js   # Multi-format text extraction
│       ├── fileStorageService.js     # Tenant-isolated file management
│       └── vectorStore.js            # LanceDB integration (optional, not used)
├── config/
│   ├── routes.js                     # API route definitions
│   └── initializers/config.js        # Configuration
└── [README.md, SETUP.md]
```

### Database Schema

#### **Document Table**
Stores document metadata and relationships.

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER PRIMARY KEY | Auto-increment document ID |
| `chat_id` | INTEGER NULLABLE | FK to Chat (for chat-specific docs) |
| `workspace_id` | INTEGER NULLABLE | FK to Workspace (for shared docs) |
| `tenant_id` | STRING NULLABLE | Legacy user-level isolation |
| `title` | STRING | Document title |
| `filename` | STRING | Original filename |
| `file_path` | STRING | Absolute path to stored file |
| `mime_type` | STRING | File MIME type (e.g., application/pdf) |
| `file_size` | INTEGER | File size in bytes |
| `created_at` | STRING | ISO timestamp |
| `updated_at` | STRING | ISO timestamp |

**Relationships**:
- `hasMany('DocumentChunk')` - One document has many chunks

#### **DocumentChunk Table**
Stores chunked text segments with embeddings.

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER PRIMARY KEY | Auto-increment chunk ID |
| `document_id` | INTEGER NOT NULL | FK to Document |
| `chunk_index` | INTEGER | Order within document (0, 1, 2...) |
| `content` | TEXT | The actual text chunk (~500 chars) |
| `embedding` | TEXT | JSON-serialized float array (384 dims) |
| `token_count` | INTEGER | Approximate token count |
| `created_at` | STRING | ISO timestamp |
| `updated_at` | STRING | ISO timestamp |

**Relationships**:
- `belongsTo('Document', 'document_id')` - Chunk belongs to one document

**Example Embedding Storage**:
```json
"[0.123, -0.456, 0.789, 0.234, ..., -0.111]"
```
*(384 floating-point numbers serialized as JSON)*

#### **Settings Table**
System-wide RAG configuration (singleton - only 1 row).

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER PRIMARY KEY | Always 1 (singleton) |
| `disable_rag` | BOOLEAN | Disable RAG globally |
| `disable_rag_chat` | BOOLEAN | Disable RAG for chats |
| `disable_rag_workspace` | BOOLEAN | Disable RAG for workspaces |
| `created_at` | STRING | ISO timestamp |
| `updated_at` | STRING | ISO timestamp |

---

## Component Details

### Services

#### **1. RAGService** (`ragService.js`)

**Purpose**: Core RAG orchestration - handles chunking, embedding, storage, and semantic search.

**Key Methods**:

```javascript
async ingestDocument({
    chatId,           // Optional: Chat ID for chat-specific document
    workspaceId,      // Optional: Workspace ID for shared document
    tenantId,         // User ID for file storage isolation
    title,            // Document title
    filename,         // Original filename
    filePath,         // Absolute path to stored file
    text,             // Extracted plain text
    mimeType,         // File MIME type
    fileSize          // File size in bytes
})
```

**Process**:
1. Chunk text using LangChain RecursiveCharacterTextSplitter
2. Generate embeddings for all chunks (batch processing)
3. Create Document record in database
4. Create DocumentChunk records for each chunk with embedding
5. Return document ID

**Returns**: `{ documentId: number }`

---

```javascript
async queryRAG({
    chatId,           // Optional: Chat ID to search
    workspaceId,      // Optional: Workspace ID to search
    question,         // User's query text
    k                 // Number of results to return (default: 5)
})
```

**Process**:
1. Generate embedding for query text
2. Retrieve documents from both workspace AND chat (layered retrieval)
3. Get all chunks for retrieved documents
4. Calculate cosine similarity between query embedding and each chunk embedding
5. Sort by similarity score (descending)
6. Return top k results with metadata

**Returns**:
```javascript
[
    {
        content: "Chunk text...",
        score: 0.873,              // Similarity score (0-1)
        documentTitle: "Handbook",
        documentId: 42,
        chunkIndex: 5,
        source: "workspace"        // "workspace" | "chat"
    },
    // ... more results
]
```

---

```javascript
buildContextString(chunks)
```

**Purpose**: Format retrieved chunks into LLM-ready context string with metadata.

**Returns**:
```
Here is relevant information from your knowledge base:

📄 [1] 🏢 Workspace - "Company Handbook" (relevance: 87.3%)
Our remote work policy allows employees to work from home 3 days per week...

📄 [2] 💬 Chat - "Meeting Notes" (relevance: 82.1%)
Action items from Q4 planning: 1) Finalize budget, 2) Hire 2 engineers...
```

---

```javascript
cosineSimilarity(vectorA, vectorB)
```

**Purpose**: Calculate semantic similarity between two embedding vectors.

**Algorithm**:
```
similarity = (A · B) / (||A|| × ||B||)

Where:
- A · B = dot product (sum of element-wise multiplication)
- ||A|| = magnitude of vector A (√(a₁² + a₂² + ... + aₙ²))
- ||B|| = magnitude of vector B
```

**Result Range**: 0 to 1
- **1.0**: Identical semantic meaning
- **0.7-0.9**: Highly relevant
- **0.5-0.7**: Moderately relevant
- **<0.5**: Low relevance

---

```javascript
async chunkText(text)
```

**Purpose**: Split long text into smaller, semantically coherent chunks.

**Algorithm**: LangChain RecursiveCharacterTextSplitter
- **Chunk Size**: 500 characters
- **Chunk Overlap**: 50 characters (preserves context across boundaries)
- **Separators**: `['\n\n', '\n', '. ', '! ', '? ', ', ', ' ', '']`
  - Prefers paragraph boundaries (`\n\n`)
  - Falls back to sentence boundaries (`. `, `! `, `? `)
  - Last resort: word boundaries (` `)

**Fallback**: Simple split by character count if LangChain fails.

---

#### **2. EmbeddingService** (`embeddingService.js`)

**Purpose**: Local embedding generation using Hugging Face transformers (no external API calls).

**Model**: `Xenova/all-MiniLM-L6-v2`
- **Type**: Sentence transformer (lightweight)
- **Dimensions**: 384
- **Size**: ~90 MB (downloads on first use)
- **Speed**: 50-200ms per batch of 10 texts
- **Quality**: Good for general semantic search

**Key Methods**:

```javascript
async initialize()
```

**Purpose**: Load Hugging Face model locally (lazy loading).

**Process**:
1. Check if model already loaded
2. Download model from Hugging Face Hub (first time only)
3. Cache model in `~/.cache/huggingface/`
4. Load into memory (~300 MB RAM)

**Time**: 3-5 seconds (first time only)

---

```javascript
async embed(text, options = {})
```

**Purpose**: Generate 384-dimensional embedding for a single text.

**Parameters**:
- `text` (string): Input text to embed
- `options.pooling` (string): Pooling strategy ('mean' default)
- `options.normalize` (boolean): Normalize vector (true default)

**Returns**: `Float32Array` of 384 dimensions

**Example**:
```javascript
const embedding = await embeddingService.embed("What is the remote work policy?");
console.log(embedding.length);  // 384
console.log(embedding);         // [0.123, -0.456, 0.789, ...]
```

---

```javascript
async embedBatch(texts, options = {})
```

**Purpose**: Generate embeddings for multiple texts efficiently (batch processing).

**Strategy**:
```javascript
const batchSize = 10;  // Process 10 texts at a time

for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const batchEmbeddings = await Promise.all(
        batch.map(text => this.embed(text, options))
    );
    embeddings.push(...batchEmbeddings);
}
```

**Performance**: 50 chunks in ~500ms-2s (after model load)

---

#### **3. TextExtractorService** (`textExtractorService.js`)

**Purpose**: Universal text extraction from multiple file formats.

**Supported Formats**:

| Format | Extension | Library | Notes |
|--------|-----------|---------|-------|
| Plain Text | `.txt`, `.md` | Node.js `fs` | Direct read (UTF-8) |
| PDF | `.pdf` | `pdf-parse` | All pages, **no OCR** |
| Word | `.docx` | `mammoth` | Modern format only (not `.doc`) |
| HTML | `.html`, `.htm` | `cheerio` | Removes scripts/styles |
| CSV | `.csv` | `csv-parser` | Converts to key:value text |

**Key Methods**:

```javascript
async extract(filePath, mimeType)
```

**Purpose**: Main entry point - auto-detects format and extracts text.

**Returns**: Plain text string

**Example**:
```javascript
const text = await textExtractor.extract('/path/to/doc.pdf', 'application/pdf');
console.log(text);  // "This is the extracted text from the PDF..."
```

---

**Format-Specific Methods**:

1. **`extractPlainText(filePath)`**:
   - Read file as UTF-8 string
   - No processing required

2. **`extractPDF(filePath)`**:
   - Uses `pdf-parse` library
   - Extracts text from all pages
   - **Limitation**: No OCR - image-only PDFs will fail
   - Returns concatenated page text

3. **`extractDocx(filePath)`**:
   - Uses `mammoth` library
   - Extracts raw text (no formatting)
   - Handles `.docx` only (not legacy `.doc`)

4. **`extractHTML(filePath)`**:
   - Uses `cheerio` library (jQuery-like HTML parsing)
   - Removes `<script>` and `<style>` tags
   - Extracts clean body text
   - Preserves paragraph structure

5. **`extractCSV(filePath)`**:
   - Uses `csv-parser` library (streaming)
   - Converts rows to searchable format:
     ```
     name: John Doe, email: john@example.com, age: 30
     name: Jane Smith, email: jane@example.com, age: 25
     ```
   - Ideal for searching tabular data

---

```javascript
isSupported(filename)
```

**Purpose**: Check if file format is supported.

**Returns**: `boolean`

---

```javascript
getSupportedFormatsString()
```

**Purpose**: Get human-readable list of supported formats.

**Returns**: `"txt, md, markdown, pdf, docx, html, htm, csv"`

---

#### **4. FileStorageService** (`fileStorageService.js`)

**Purpose**: WordPress-style file management with tenant isolation and quota enforcement.

**Storage Structure**:
```
{projectRoot}/bb-storage/media/
├── 1/                      # User ID 1
│   ├── document_123.pdf
│   └── notes_456.txt
├── 2/                      # User ID 2
│   └── report_789.docx
└── 3/                      # User ID 3
    └── data_101.csv
```

**Key Features**:
- **Tenant Isolation**: Each user has dedicated folder
- **Filename Sanitization**: Prevents path traversal attacks
- **Unique Paths**: Timestamp appending prevents collisions
- **Storage Quotas**: Default 1024 MB per tenant
- **Recursive Size Calculation**: Accurate folder size tracking

**Key Methods**:

```javascript
async moveUploadToTenant(tempPath, tenantId, filename)
```

**Purpose**: Move uploaded file from temp location to permanent tenant storage.

**Process**:
1. Sanitize filename: `replace(/[^a-zA-Z0-9._-]/g, '_')`
2. Generate unique path: `{filename}_{timestamp}.{ext}`
3. Create tenant folder if doesn't exist: `bb-storage/media/{tenantId}/`
4. Move file to tenant folder
5. Return absolute path

**Example**:
```javascript
const finalPath = await fileStorage.moveUploadToTenant(
    '/tmp/upload_abc123',
    'user_42',
    'document.pdf'
);
// Returns: /path/to/project/bb-storage/media/user_42/document_1729012345678.pdf
```

---

```javascript
async getTenantStorageUsage(tenantId)
```

**Purpose**: Calculate total storage used by tenant (recursive).

**Returns**: `number` (bytes)

**Algorithm**:
- Recursively walk directory tree
- Sum file sizes
- Includes all subdirectories

---

```javascript
async checkStorageQuota(tenantId, quotaMB = 1024)
```

**Purpose**: Enforce storage quota before file upload.

**Returns**: `{ allowed: boolean, usage: number, quota: number, percentUsed: number }`

**Example**:
```javascript
const check = await fileStorage.checkStorageQuota('user_42', 1024);
if (!check.allowed) {
    throw new Error(`Storage quota exceeded (${check.usage}MB / ${check.quota}MB)`);
}
```

---

```javascript
async deleteFile(filePath)
```

**Purpose**: Safe file deletion with error handling.

**Process**:
- Check if file exists
- Delete file
- Return success/failure status

---

### Controllers

#### **ragController** (`ragController.js`)

**Purpose**: Main API controller for document management and query operations.

**API Endpoints**:

---

**1. POST `/bb-rag/api/rag/ingest`**

**Purpose**: Upload and ingest a document into the knowledge base.

**Request**:
- **Method**: POST
- **Content-Type**: `multipart/form-data`
- **Body**:
  - `file` (File): Document file to upload
  - `chatId` (number, optional): Chat ID for chat-specific document
  - `workspaceId` (number, optional): Workspace ID for shared document
  - `title` (string, optional): Document title (defaults to filename)

**Response**:
```json
{
    "success": true,
    "documentId": 42,
    "chatId": 123,
    "message": "Document ingested successfully"
}
```

**Process**:
1. Parse multipart form data
2. Check storage quota (fail if exceeded)
3. Move uploaded file to tenant storage
4. Extract text from file (format auto-detection)
5. Chunk text (500 chars, 50 overlap)
6. Generate embeddings for all chunks (batch)
7. Store document metadata + chunks with embeddings
8. Create new chat if neither chatId nor workspaceId provided
9. Return document ID and chat ID

**Error Handling**:
- File too large: `"File size exceeds storage quota"`
- Unsupported format: `"Unsupported file type"`
- Extraction failure: `"Failed to extract text from file"`
- Empty file: `"Extracted text is empty"`

---

**2. POST `/bb-rag/api/rag/ingest-url`**

**Purpose**: Fetch content from URL and ingest into knowledge base.

**Request**:
- **Method**: POST
- **Content-Type**: `application/json`
- **Body**:
  ```json
  {
      "url": "https://example.com/article",
      "chatId": 123,
      "workspaceId": 456,
      "title": "Article Title"
  }
  ```

**Response**:
```json
{
    "success": true,
    "documentId": 43,
    "message": "URL content ingested successfully"
}
```

**Process**:
1. Fetch URL content (Node.js `https` module)
2. Simple HTML-to-text conversion (removes tags)
3. Save as `.txt` file in tenant storage
4. Proceed with normal ingestion pipeline

**Limitations**:
- Basic HTML parsing (no JavaScript rendering)
- No support for authentication
- Max response size: ~10 MB (implicit)

---

**3. GET `/bb-rag/api/rag/list?chatId=xxx` OR `?workspaceId=xxx`**

**Purpose**: List documents for a chat or workspace.

**Request**:
- **Method**: GET
- **Query Params**:
  - `chatId` (number, optional): Chat ID
  - `workspaceId` (number, optional): Workspace ID
  - `tenantId` (string, optional): User ID (legacy)

**Response**:
```json
{
    "success": true,
    "documents": [
        {
            "id": 42,
            "title": "Company Handbook",
            "filename": "handbook.pdf",
            "file_size": 1024000,
            "mime_type": "application/pdf",
            "created_at": "1729012345678",
            "chunk_count": 25
        },
        // ... more documents
    ]
}
```

**Access Control**:
- Verifies user is member of chat (via UserChat table)
- Verifies user is member of workspace (via WorkspaceUser table)
- Returns empty list if user not authorized

---

**4. DELETE `/bb-rag/api/rag/delete/:id`**

**Purpose**: Delete document, all chunks, and file from storage.

**Request**:
- **Method**: DELETE
- **URL Params**:
  - `id` (number): Document ID

**Response**:
```json
{
    "success": true,
    "message": "Document deleted successfully"
}
```

**Process**:
1. Get document by ID
2. Verify user access (via chat membership)
3. Delete all chunks from database
4. Delete document record from database
5. Delete file from storage (filesystem)
6. Return success

**Access Control**:
- Only chat members can delete chat-specific documents
- Only workspace members can delete workspace documents

---

**5. POST `/bb-rag/api/rag/query`**

**Purpose**: Query knowledge base for relevant chunks.

**Request**:
- **Method**: POST
- **Content-Type**: `application/json`
- **Body**:
  ```json
  {
      "chatId": 123,
      "workspaceId": 456,
      "question": "What is the remote work policy?",
      "k": 5
  }
  ```

**Response**:
```json
{
    "success": true,
    "results": [
        {
            "content": "Our remote work policy allows employees...",
            "score": 0.873,
            "documentTitle": "Company Handbook",
            "documentId": 42,
            "chunkIndex": 5,
            "source": "workspace"
        },
        // ... more results
    ],
    "context": "Here is relevant information from your knowledge base:\n\n📄 [1] ...",
    "count": 5
}
```

**Process**:
1. Generate embedding for question
2. Retrieve documents (layered: workspace + chat)
3. Get all chunks for documents
4. Calculate cosine similarity for each chunk
5. Sort by score (descending)
6. Return top k results with formatted context string

---

**6. GET `/bb-rag/api/rag/stats?chatId=xxx` OR `?workspaceId=xxx`**

**Purpose**: Get statistics for a chat or workspace.

**Request**:
- **Method**: GET
- **Query Params**:
  - `chatId` (number, optional): Chat ID
  - `workspaceId` (number, optional): Workspace ID

**Response**:
```json
{
    "success": true,
    "stats": {
        "document_count": 10,
        "chunk_count": 250,
        "total_tokens": 125000,
        "avg_chunks_per_doc": 25
    }
}
```

---

**7. GET `/bb-rag/api/rag/storage/usage?tenantId=xxx`**

**Purpose**: Get storage usage for a tenant.

**Request**:
- **Method**: GET
- **Query Params**:
  - `tenantId` (string): User ID

**Response**:
```json
{
    "success": true,
    "mb": 512.5,
    "bytes": 537395200,
    "quota": 1024,
    "percentUsed": 50.0,
    "exceeded": false
}
```

---

#### **ragSettingsController** (`ragSettingsController.js`)

**Purpose**: Manage RAG system configuration.

**API Endpoints**:

---

**1. GET `/bb-rag/api/rag/settings`**

**Purpose**: Get current RAG settings (creates defaults if missing).

**Request**:
- **Method**: GET

**Response**:
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

**Process**:
1. Try to get existing settings (singleton)
2. If not found, create default settings (all enabled)
3. Return settings

---

**2. POST `/bb-rag/api/rag/settings`**

**Purpose**: Update RAG settings.

**Request**:
- **Method**: POST
- **Content-Type**: `application/json`
- **Body**:
  ```json
  {
      "disableRag": false,
      "disableRagChat": true,
      "disableRagWorkspace": false
  }
  ```

**Response**:
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

**Process**:
1. Get existing settings (or create new)
2. Update specified fields
3. Save to database
4. Return updated settings

---

## NPM Dependencies

### RAG-Specific Packages

**1. `@xenova/transformers` (v2.17.2)**

**Purpose**: Run Hugging Face transformer models in Node.js (local, no API calls).

**Role in RAG**:
- Powers `EmbeddingService`
- Generates 384-dimensional embeddings locally
- No external API calls or API keys required

**Model Used**: `Xenova/all-MiniLM-L6-v2`
- **Type**: Sentence transformer (lightweight)
- **Size**: ~90 MB
- **Speed**: 50-200ms per batch of 10 texts
- **Dimensions**: 384
- **Quality**: Good for general semantic search

**Installation**:
```bash
npm install @xenova/transformers
```

**Basic Usage**:
```javascript
import { pipeline } from '@xenova/transformers';

const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
const output = await extractor('Hello world', { pooling: 'mean', normalize: true });
const embedding = Array.from(output.data);  // [0.123, -0.456, ...]
```

---

**2. `@langchain/textsplitters` (v0.1.0)**

**Purpose**: Intelligent text chunking with semantic awareness.

**Role in RAG**:
- Used in `RAGService.chunkText()`
- Splits documents into ~500-character chunks
- Preserves semantic boundaries (paragraphs, sentences)

**Key Class**: `RecursiveCharacterTextSplitter`

**Configuration**:
```javascript
new RecursiveCharacterTextSplitter({
    chunkSize: 500,           // Target chunk size
    chunkOverlap: 50,         // Overlap to preserve context
    separators: [             // Priority order for splitting
        '\n\n',               // Paragraph boundaries (preferred)
        '\n',                 // Line breaks
        '. ',                 // Sentence boundaries
        '! ',
        '? ',
        ', ',
        ' ',                  // Word boundaries
        ''                    // Character boundaries (last resort)
    ]
})
```

**Why Chunking?**
- LLMs have limited context windows
- Smaller chunks = more precise retrieval
- Overlap prevents information loss at boundaries

---

**3. `pdf-parse` (v2.3.0)**

**Purpose**: Extract text from PDF files.

**Role in RAG**:
- Used in `TextExtractorService.extractPDF()`
- Extracts text from all pages
- Concatenates page text with newlines

**Installation**:
```bash
npm install pdf-parse
```

**Basic Usage**:
```javascript
const fs = require('fs');
const pdfParse = require('pdf-parse');

const dataBuffer = fs.readFileSync('document.pdf');
const data = await pdfParse(dataBuffer);
console.log(data.text);  // Extracted text
console.log(data.numpages);  // Number of pages
```

**Limitations**:
- **No OCR**: Image-only PDFs will return empty text
- **No layout preservation**: Columns/tables may lose structure
- **Performance**: Large PDFs (>100 pages) can be slow (5-10s)

---

**4. `mammoth` (v1.11.0)**

**Purpose**: Extract text from Microsoft Word documents.

**Role in RAG**:
- Used in `TextExtractorService.extractDocx()`
- Converts `.docx` to plain text

**Installation**:
```bash
npm install mammoth
```

**Basic Usage**:
```javascript
const mammoth = require('mammoth');

const result = await mammoth.extractRawText({ path: 'document.docx' });
console.log(result.value);  // Extracted text
console.log(result.messages);  // Any warnings/errors
```

**Supported Formats**:
- **`.docx`**: Yes (modern Office Open XML format)
- **`.doc`**: No (legacy binary format not supported)

**Note**: Formatting (bold, italics, etc.) is stripped - only raw text is extracted.

---

**5. `cheerio` (v1.1.2)**

**Purpose**: jQuery-like HTML parsing and manipulation.

**Role in RAG**:
- Used in `TextExtractorService.extractHTML()`
- Removes `<script>` and `<style>` tags
- Extracts clean body text

**Installation**:
```bash
npm install cheerio
```

**Basic Usage**:
```javascript
const cheerio = require('cheerio');
const fs = require('fs');

const html = fs.readFileSync('page.html', 'utf-8');
const $ = cheerio.load(html);

// Remove unwanted elements
$('script').remove();
$('style').remove();

// Extract body text
const text = $('body').text();
console.log(text);
```

**Why Use Cheerio?**
- Lightweight (no browser required)
- Fast HTML parsing
- Easy CSS selector syntax

---

**6. `csv-parser` (v3.2.0)**

**Purpose**: Parse CSV files into JavaScript objects.

**Role in RAG**:
- Used in `TextExtractorService.extractCSV()`
- Converts CSV rows to searchable text format

**Installation**:
```bash
npm install csv-parser
```

**Basic Usage**:
```javascript
const fs = require('fs');
const csv = require('csv-parser');

const results = [];
fs.createReadStream('data.csv')
  .pipe(csv())
  .on('data', (row) => results.push(row))
  .on('end', () => {
      console.log(results);
      // [
      //   { name: 'John', email: 'john@example.com', age: '30' },
      //   { name: 'Jane', email: 'jane@example.com', age: '25' }
      // ]
  });
```

**RAG Integration**:
CSV rows are converted to searchable text:
```
name: John Doe, email: john@example.com, age: 30
name: Jane Smith, email: jane@example.com, age: 25
```

This allows semantic search over tabular data.

---

**7. `@lancedb/lancedb` (v0.22.2)**

**Purpose**: Vector database for fast Approximate Nearest Neighbor (ANN) search.

**Status**: Included but **NOT actively used** in production.

**Role**:
- Code exists in `vectorStore.js`
- Would provide O(log n) search instead of O(n)
- Recommended for >10K chunks or high query volume

**Why Not Used?**
- SQL-based cosine similarity is sufficient for current scale (1000s of chunks)
- Simpler architecture (no external database)
- Easier to debug and maintain

**Migration Path**: See `/components/rag/LANCEDB_MIGRATION.md` for instructions.

---

### Other Dependencies

**MasterController Ecosystem**:
- **`mastercontroller`** (v1.2.8): MVC framework for routing
- **`masterrecord`** (v0.2.31): ORM layer for database operations

**General**:
- **`openai`** (v5.16.0): Used in other parts of Bookbag (NOT for RAG embeddings)
- **`jsonwebtoken`** (v9.0.2): Authentication
- **`bcryptjs`** (v3.0.2): Password hashing
- **`socket.io`** (v4.8.1): Real-time chat streaming

---

## Document Processing Pipeline

### Phase 1: Upload & Storage

```
┌─────────────────────────────────────────┐
│        USER UPLOADS FILE                │
└──────────────┬──────────────────────────┘
               ▼
   ┌──────────────────────────────┐
   │  ragController.ingest()      │
   │  - Parse multipart form      │
   │  - Extract file, chatId, etc.│
   └──────────────┬───────────────┘
                  ▼
   ┌──────────────────────────────┐
   │  Check Storage Quota         │
   │  - fileStorageService.check  │
   │  - Fail if exceeded          │
   └──────────────┬───────────────┘
                  ▼
   ┌──────────────────────────────┐
   │  Move File to Tenant Storage │
   │  - Sanitize filename         │
   │  - Generate unique path      │
   │  - bb-storage/media/{tenant}/│
   └──────────────┬───────────────┘
                  ▼
   ┌──────────────────────────────┐
   │  Get File Size (fs.stat)     │
   └──────────────┬───────────────┘
                  ▼
         [Next: Text Extraction]
```

**Key Points**:
- Quota enforcement prevents abuse
- Tenant isolation (each user has dedicated folder)
- Unique filenames prevent collisions

---

### Phase 2: Text Extraction

```
   ┌──────────────────────────────┐
   │  TextExtractorService.extract│
   │  - Auto-detect file type     │
   └──────────────┬───────────────┘
                  ▼
   ┌──────────────────────────────┐
   │  Format Detection (by ext)   │
   │  - .txt/.md   → fs.readFile  │
   │  - .pdf       → pdf-parse    │
   │  - .docx      → mammoth      │
   │  - .html/.htm → cheerio      │
   │  - .csv       → csv-parser   │
   └──────────────┬───────────────┘
                  ▼
   ┌──────────────────────────────┐
   │  Extract Plain Text          │
   │  - All formatting removed    │
   │  - Clean UTF-8 string        │
   └──────────────┬───────────────┘
                  ▼
   ┌──────────────────────────────┐
   │  Validate Extraction         │
   │  - Check if text is empty    │
   │  - Fail if no extractable txt│
   └──────────────┬───────────────┘
                  ▼
         [Next: Chunking]
```

**Error Handling**:
- Empty PDFs or image-only PDFs throw error
- Unsupported formats return clear error message
- Extraction failures clean up uploaded file

---

### Phase 3: Chunking

```
   ┌──────────────────────────────┐
   │  RAGService.chunkText(text)  │
   └──────────────┬───────────────┘
                  ▼
   ┌──────────────────────────────┐
   │  LangChain Splitter          │
   │  - chunkSize: 500 chars      │
   │  - chunkOverlap: 50 chars    │
   │  - separators: ['\n\n', ...] │
   └──────────────┬───────────────┘
                  ▼
   ┌──────────────────────────────┐
   │  Smart Splitting Algorithm   │
   │  1. Try paragraph boundaries │
   │  2. Fall back to sentences   │
   │  3. Fall back to words       │
   │  4. Last resort: characters  │
   └──────────────┬───────────────┘
                  ▼
   ┌──────────────────────────────┐
   │  Return Array of Chunks      │
   │  - Each ~500 chars           │
   │  - 50-char overlap preserved │
   └──────────────┬───────────────┘
                  ▼
         [Next: Embedding]
```

**Example**:
```javascript
Input Text (1200 chars):
"Paragraph 1...\n\nParagraph 2...\n\nParagraph 3..."

Chunks:
[
    "Paragraph 1... [500 chars]",
    "[last 50 chars of chunk 1] Paragraph 2... [450 new chars]",
    "[last 50 chars of chunk 2] Paragraph 3... [450 new chars]"
]
```

**Fallback**:
If LangChain fails, simple split every 500 characters with 50-char overlap.

---

### Phase 4: Embedding Generation

```
   ┌──────────────────────────────┐
   │  RAGService.ingestDocument   │
   └──────────────┬───────────────┘
                  ▼
   ┌──────────────────────────────┐
   │  EmbeddingService.embedBatch │
   │  - Process chunks in batches │
   └──────────────┬───────────────┘
                  ▼
   ┌──────────────────────────────┐
   │  Initialize Xenova Model     │
   │  - Lazy load on first use    │
   │  - Model: all-MiniLM-L6-v2   │
   │  - Load time: ~3-5 seconds   │
   └──────────────┬───────────────┘
                  ▼
   ┌──────────────────────────────┐
   │  Batch Processing (10 at a   │
   │  time)                       │
   │  For each batch:             │
   │  - pipeline(texts)           │
   │  - Extract embeddings        │
   └──────────────┬───────────────┘
                  ▼
   ┌──────────────────────────────┐
   │  Return Array of Embeddings  │
   │  - Each: 384-dim float array │
   └──────────────┬───────────────┘
                  ▼
         [Next: Storage]
```

**Performance**:
- **First document**: ~3-5s (model load) + embedding time
- **Subsequent documents**: Embedding time only (~500ms-2s for 50 chunks)
- **Fully local**: No network calls, no API keys

**Batching Strategy**:
```javascript
const batchSize = 10;
for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    const batchEmbeddings = await Promise.all(
        batch.map(chunk => embeddingService.embed(chunk))
    );
    allEmbeddings.push(...batchEmbeddings);
}
```

This prevents memory exhaustion with large documents (1000+ chunks).

---

### Phase 5: Storage

```
   ┌──────────────────────────────┐
   │  RAGService.ingestDocument   │
   └──────────────┬───────────────┘
                  ▼
   ┌──────────────────────────────┐
   │  Create Document Record      │
   │  - chat_id, workspace_id     │
   │  - title, filename, path     │
   │  - mime_type, file_size      │
   │  - created_at, updated_at    │
   └──────────────┬───────────────┘
                  ▼
   ┌──────────────────────────────┐
   │  Save to Database → Get ID   │
   └──────────────┬───────────────┘
                  ▼
   ┌──────────────────────────────┐
   │  For Each Chunk:             │
   │  Create DocumentChunk Record │
   │  - document_id (FK)          │
   │  - chunk_index (0, 1, 2...)  │
   │  - content (text)            │
   │  - embedding (JSON string)   │
   │  - token_count               │
   │  - created_at, updated_at    │
   └──────────────┬───────────────┘
                  ▼
   ┌──────────────────────────────┐
   │  Bulk Insert All Chunks      │
   └──────────────┬───────────────┘
                  ▼
   ┌──────────────────────────────┐
   │  Return Document ID          │
   └──────────────────────────────┘
```

**Database Design**:
- Embeddings stored as JSON strings: `"[0.123, -0.456, ...]"`
- No external vector database (LanceDB optional)
- Scalable to thousands of chunks per chat

**Example DocumentChunk Record**:
```json
{
    "id": 1,
    "document_id": 42,
    "chunk_index": 0,
    "content": "Our remote work policy allows employees to work from home 3 days per week...",
    "embedding": "[0.123, -0.456, 0.789, ..., -0.111]",  // 384 floats
    "token_count": 125,
    "created_at": "1729012345678",
    "updated_at": "1729012345678"
}
```

---

## Embedding & Vector Storage

### Embedding Generation

**Model Details**:
- **Name**: `Xenova/all-MiniLM-L6-v2`
- **Type**: Sentence transformer (BERT-based)
- **Dimensions**: 384
- **Size**: ~90 MB
- **Speed**: 50-200ms per batch of 10 texts
- **Download**: Automatic on first use (cached in `~/.cache/huggingface/`)

**Algorithm**:
```javascript
// Pseudocode
pipeline = loadModel('Xenova/all-MiniLM-L6-v2', 'feature-extraction');

for (chunk of chunks) {
    // Run through transformer
    tensor = pipeline(chunk, {
        pooling: 'mean',      // Average token embeddings
        normalize: true       // L2 normalization
    });

    // Extract float array
    embedding = Array.from(tensor.data);  // [0.123, -0.456, ..., 0.789]

    // Store in database
    storeInDB(chunk, embedding);
}
```

**Batching**:
- Processes 10 chunks at a time
- Total time for 50 chunks: ~500ms-2s (after model load)
- Prevents memory exhaustion

**Quality**:
- Good for general semantic search
- Works well for English text
- Moderate performance on technical/domain-specific text

**Alternative Models** (requires code change):
| Model | Dimensions | Size | Quality | Speed |
|-------|------------|------|---------|-------|
| `Xenova/all-MiniLM-L6-v2` | 384 | ~90 MB | Good | Fast |
| `Xenova/all-mpnet-base-v2` | 768 | ~420 MB | Better | Slower |
| `Xenova/paraphrase-multilingual-MiniLM-L12-v2` | 384 | ~90 MB | Good (multi-lang) | Fast |

---

### Vector Storage

**Current Implementation**: SQL Database

**Schema**:
```sql
CREATE TABLE DocumentChunk (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id INTEGER NOT NULL,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    embedding TEXT,  -- JSON-serialized float array
    token_count INTEGER,
    created_at TEXT,
    updated_at TEXT,
    FOREIGN KEY (document_id) REFERENCES Document(id)
);
```

**Example Embedding Storage**:
```json
"[0.123, -0.456, 0.789, 0.234, -0.567, ..., -0.111]"
```
*(384 floating-point numbers as JSON string)*

**Advantages**:
- Simple architecture (no external database)
- Easy to backup (standard SQL dump)
- Works with existing ORM (masterrecord)
- Sufficient for 1000s of chunks

**Disadvantages**:
- O(n) search complexity (brute-force)
- Slower for large datasets (>10K chunks)
- No metadata filtering during search

---

### Search Algorithm (Brute-Force Cosine Similarity)

**Process**:
```javascript
// 1. Generate query embedding
queryEmbedding = embeddingService.embed(userQuestion);  // 384 floats

// 2. Get all chunks from database
allChunks = database.getAllChunks();  // Array of { content, embedding }

// 3. Calculate similarity for each chunk
scoredChunks = [];
for (chunk of allChunks) {
    chunkEmbedding = JSON.parse(chunk.embedding);  // Parse JSON to float array
    score = cosineSimilarity(queryEmbedding, chunkEmbedding);
    scoredChunks.push({ chunk, score });
}

// 4. Sort by score (descending)
scoredChunks.sort((a, b) => b.score - a.score);

// 5. Return top k results
topK = scoredChunks.slice(0, k);
```

**Cosine Similarity Formula**:
```
similarity = (A · B) / (||A|| × ||B||)

Where:
- A · B = dot product = Σ(aᵢ × bᵢ)
- ||A|| = magnitude = √(Σ(aᵢ²))
- ||B|| = magnitude = √(Σ(bᵢ²))
```

**Implementation**:
```javascript
cosineSimilarity(vectorA, vectorB) {
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
```

**Result Range**: 0 to 1
- **1.0**: Identical semantic meaning
- **0.7-0.9**: Highly relevant
- **0.5-0.7**: Moderately relevant
- **<0.5**: Low relevance

**Performance**:
- **Complexity**: O(n) where n = total chunks
- **Typical Query Time**:
  - 100 chunks: 50-100ms
  - 1000 chunks: 200-500ms
  - 10,000 chunks: 2-5s

**When to Migrate to LanceDB**:
- >10,000 chunks per tenant
- High query volume (>100 queries/minute)
- Query latency >500ms

---

### LanceDB Migration (Optional)

**Status**: Code exists in `vectorStore.js`, not in production.

**Benefits**:
- **10-100x faster**: O(log n) ANN search vs O(n) brute-force
- **Scalable**: Handles millions of vectors
- **Metadata filtering**: Filter by document/chat during search

**Migration Steps** (see `LANCEDB_MIGRATION.md`):
1. Update `ragService.js` to use `vectorStore.js` methods
2. Migrate existing embeddings from SQL to LanceDB
3. Update delete operations to clean LanceDB tables
4. Test performance improvements

**LanceDB Setup**:
```javascript
import lancedb from '@lancedb/lancedb';

const db = await lancedb.connect('storage/vectors');
const table = await db.createTable('embeddings', [
    { content: 'sample', embedding: Array(384).fill(0), metadata: {} }
]);

// Add vectors
await table.add([
    { content: "Chunk 1", embedding: [0.1, 0.2, ...], metadata: { docId: 42 } }
]);

// Search
const results = await table.search([0.1, 0.2, ...])
    .limit(5)
    .execute();
```

---

## Query & Retrieval System

### Query Flow (End-to-End)

```
┌─────────────────────────────────────────┐
│   USER SENDS MESSAGE IN CHAT            │
└──────────────┬──────────────────────────┘
               ▼
   ┌──────────────────────────────┐
   │  chatSocket.start()          │
   │  - Load chat history         │
   │  - Get last user message     │
   └──────────────┬───────────────┘
                  ▼
   ┌──────────────────────────────┐
   │  Detect Workspace Context    │
   │  - is_workspace_created?     │
   │  - Get workspaceId from join │
   └──────────────┬───────────────┘
                  ▼
   ┌──────────────────────────────┐
   │  RAGService.queryRAG()       │
   │  - Generate query embedding  │
   └──────────────┬───────────────┘
                  ▼
   ┌──────────────────────────────┐
   │  Layered Retrieval           │
   │  1. Workspace documents      │
   │  2. Chat documents           │
   │  3. Merge & deduplicate      │
   └──────────────┬───────────────┘
                  ▼
   ┌──────────────────────────────┐
   │  Get All Chunks              │
   │  - WHERE document_id IN(...)  │
   └──────────────┬───────────────┘
                  ▼
   ┌──────────────────────────────┐
   │  Cosine Similarity Search    │
   │  For each chunk:             │
   │  - Parse embedding (JSON)    │
   │  - Calculate similarity      │
   │  - Tag source (workspace/chat│
   └──────────────┬───────────────┘
                  ▼
   ┌──────────────────────────────┐
   │  Sort & Take Top k           │
   │  - Sort by score descending  │
   │  - Take top 5 (default)      │
   └──────────────┬───────────────┘
                  ▼
   ┌──────────────────────────────┐
   │  buildContextString()        │
   │  - Format with metadata      │
   │  - Include source tags       │
   └──────────────┬───────────────┘
                  ▼
   ┌──────────────────────────────┐
   │  _injectRAGGrounding()       │
   │  - Get grounding_mode        │
   │  - Update system prompt      │
   └──────────────┬───────────────┘
                  ▼
   ┌──────────────────────────────┐
   │  modelService._generate()    │
   │  - Send to LLM with RAG ctx  │
   └──────────────┬───────────────┘
                  ▼
   ┌──────────────────────────────┐
   │  Stream Response to User     │
   └──────────────────────────────┘
```

---

### Layered Retrieval Strategy

**Why Layered?**

Users can have documents at two scopes:
1. **Workspace-level**: Shared across all chats in workspace (e.g., company policies, team docs)
2. **Chat-level**: Private to specific conversation (e.g., personal notes, conversation files)

**Implementation**:
```javascript
// Retrieve workspace documents
workspaceDocuments = [];
if (workspaceId) {
    workspaceDocuments = db.Document
        .where(d => d.workspace_id == workspaceId)
        .toList();
}

// Retrieve chat documents
chatDocuments = [];
if (chatId) {
    chatDocuments = db.Document
        .where(d => d.chat_id == chatId)
        .toList();
}

// Merge and deduplicate
allDocuments = [...workspaceDocuments, ...chatDocuments];
uniqueDocumentIds = [...new Set(allDocuments.map(d => d.id))];

// Get all chunks from both layers
chunks = db.DocumentChunk
    .where(c => c.document_id IN uniqueDocumentIds)
    .toList();

// Search across all chunks
topResults = sortByScore(chunks).slice(0, k);

// Tag results by source
topResults = topResults.map(result => ({
    ...result,
    source: workspaceDocumentIds.includes(result.documentId) ? 'workspace' : 'chat'
}));
```

**Benefits**:
- Single query retrieves both workspace and chat documents
- Workspace documents are accessible in all chats
- Chat documents remain private
- Results tagged by source for transparency

---

### Context Building

**Purpose**: Format retrieved chunks into LLM-ready context string with metadata.

**Format** (from `buildContextString()`):
```
Here is relevant information from your knowledge base:

📄 [1] 🏢 Workspace - "Company Handbook" (relevance: 87.3%)
Our remote work policy allows employees to work from home 3 days per week. Employees must maintain core hours of 10am-3pm in their local timezone. All remote work must be approved by direct manager.

📄 [2] 💬 Chat - "Meeting Notes - Q4 Planning" (relevance: 82.1%)
Action items from Q4 planning meeting:
1) Finalize Q4 budget by end of month
2) Hire 2 senior engineers for platform team
3) Launch new feature beta in November

📄 [3] 🏢 Workspace - "Benefits Guide" (relevance: 78.5%)
Health insurance coverage includes medical, dental, and vision. Employees can enroll during open enrollment period in November. New hires have 30 days from start date to enroll.
```

**Metadata Included**:
- **Rank number**: [1], [2], [3]...
- **Source icon**: 🏢 Workspace | 💬 Chat
- **Document title**: Retrieved from Document table
- **Relevance score**: Cosine similarity × 100 (percentage)
- **Chunk content**: Full text of chunk

**Code**:
```javascript
buildContextString(chunks) {
    if (!chunks || chunks.length === 0) {
        return '';
    }

    let context = 'Here is relevant information from your knowledge base:\n\n';

    chunks.forEach((chunk, index) => {
        const rank = index + 1;
        const sourceIcon = chunk.source === 'workspace' ? '🏢' : '💬';
        const sourceLabel = chunk.source === 'workspace' ? 'Workspace' : 'Chat';
        const score = (chunk.score * 100).toFixed(1);

        context += `📄 [${rank}] ${sourceIcon} ${sourceLabel} - "${chunk.documentTitle}" (relevance: ${score}%)\n`;
        context += `${chunk.content}\n\n`;
    });

    return context;
}
```

---

### Grounding Modes

**Purpose**: Control how LLM uses RAG context vs. general knowledge.

**Configuration**: Set via `model_config.grounding_mode` in database (per model).

---

**Strict Grounding** (for OpenAI, Gemini):

```
INSTRUCTIONS:
Answer the user's question using the information provided between the "Retrieved Knowledge Base Context" markers above.
- If the answer is present there, use it in your response.
- If it is NOT present, reply: "I don't know based on the provided documents."
- Prioritize the retrieved context over your general knowledge.
```

**Use Case**:
- Highly regulated domains (legal, medical, financial)
- Strict compliance requirements
- When hallucination is unacceptable

**Tradeoff**: LLM may be overly cautious and refuse to answer even if it knows the answer.

---

**Soft Grounding** (for Claude, Grok):

```
Use the information provided above to help answer the user's question. If the context contains relevant information, prioritize it in your response. If the context doesn't contain relevant information, you may use your general knowledge but mention that the information wasn't found in the knowledge base.
```

**Use Case**:
- General assistance
- When user expects LLM to fill in gaps
- When knowledge base is incomplete

**Tradeoff**: LLM may hallucinate if context is insufficient.

---

**Implementation** (in `chatSocket.js`):
```javascript
function _injectRAGGrounding(messageHistory, ragContext, ragQueryText) {
    const groundingMode = modelConfig.grounding_mode || 'strict';

    const baseInstruction = `
Retrieved Knowledge Base Context:
=================================
${ragContext}
=================================
`;

    let fullInstruction;
    if (groundingMode === 'strict') {
        fullInstruction = baseInstruction + `
INSTRUCTIONS:
Answer the user's question using the information provided above.
- If the answer is present, use it in your response.
- If it is NOT present, reply: "I don't know based on the provided documents."
- Prioritize the retrieved context over your general knowledge.
`;
    } else {
        fullInstruction = baseInstruction + `
Use the information provided above to help answer the user's question. If the context contains relevant information, prioritize it in your response. If the context doesn't contain relevant information, you may use your general knowledge but mention that the information wasn't found in the knowledge base.
`;
    }

    // Update or prepend system message
    const existingSystemIndex = messageHistory.findIndex(m => m.role === 'system');
    if (existingSystemIndex >= 0) {
        messageHistory[existingSystemIndex].content = fullInstruction + '\n\n' + messageHistory[existingSystemIndex].content;
    } else {
        messageHistory.unshift({ role: 'system', content: fullInstruction });
    }
}
```

---

### Query Parameters

**Default k**: 5 results

**Tuning Recommendations**:
| k Value | Use Case | Pros | Cons |
|---------|----------|------|------|
| 3 | Focused answers | Less noise, faster | May miss relevant info |
| 5 (default) | Balanced | Good context, reasonable size | - |
| 10 | Comprehensive | More context, better coverage | Risk of context overflow, slower |

**Context Window Considerations**:
- Each chunk = ~500 chars
- 5 chunks = ~2500 chars
- 10 chunks = ~5000 chars
- Most LLMs have 4K-128K token context windows
- Leave room for chat history + response

---

## Integration Points

### Chat Integration

**Location**: `/app/sockets/chatSocket.js`

**Integration Steps** (in `start()` method):

**1. Load Chat History**:
```javascript
const messageHistory = await chatHistoryService.loadChatHistory(chatId);
```

**2. Detect Workspace Context**:
```javascript
// Check if chat is workspace-created
const chat = chatContext.Chat.where(r => r.id == chatId).single();
const isWorkspaceCreated = chat.is_workspace_created === true;

// Get workspace ID from WorkspaceChat join table
let workspaceId = null;
if (isWorkspaceCreated) {
    const link = workspaceContext.WorkspaceChat
        .where(r => r.chat_id == chatId)
        .single();
    workspaceId = link.workspace_id;
}
```

**3. Query RAG System**:
```javascript
// Initialize RAG services
const ragContext = new RAGContext();
const ragService = new RAGService(ragContext);

// Get last user message as query
const lastUserMessage = messageHistory
    .slice()
    .reverse()
    .find(m => m.role === 'user');
const ragQueryText = lastUserMessage.content;

// Query knowledge base (layered retrieval)
let ragContextString = '';
try {
    const results = await ragService.queryRAG({
        chatId: parseInt(chatId, 10),
        workspaceId: workspaceId ? parseInt(workspaceId, 10) : null,
        question: ragQueryText,
        k: 5
    });

    if (results.length > 0) {
        ragContextString = ragService.buildContextString(results);
    }
} catch (error) {
    console.warn('RAG query failed (non-fatal):', error);
    // Continue without RAG context
}
```

**4. Inject RAG Grounding**:
```javascript
// ALWAYS inject grounding - even if no context found
// This prevents hallucination when no documents exist
_injectRAGGrounding(messageHistory, ragContextString, ragQueryText);
```

**5. Send to LLM**:
```javascript
// Remove placeholder assistant messages
messageHistory = messageHistory.filter(msg => {
    if (msg.role !== 'assistant') return true;
    return msg.content && msg.content.trim() && msg.content.trim() !== '-';
});

// Generate response with RAG context
const generationResult = await modelService._generate(
    messageHistory,
    tokenCallback,
    noThinking,
    modelConfig
);
```

**Error Handling**:
- RAG query errors are non-fatal (logs warning, continues without context)
- LLM can still respond using general knowledge if RAG fails
- Empty context is acceptable (grounding prompt still injected)

---

### Workspace Integration

**Shared Documents**:
- Documents uploaded with `workspaceId` are shared across all chats in that workspace
- Example use cases:
  - Company policies
  - Team documentation
  - Project specifications
  - Onboarding materials

**Access Control**:
- Implicit via workspace membership (WorkspaceUser join table)
- All workspace members can query workspace-level documents
- No explicit permission system (membership = full access)

**Query Priority**:
- Workspace documents + chat documents are merged before retrieval
- No priority ranking - all chunks compete based on similarity score
- Results are tagged by source (`workspace` | `chat`) for transparency

**Example Scenario**:
```
User is in Chat #123 (belongs to Workspace #456)

Documents:
- Workspace #456: "Company Handbook.pdf" (50 chunks)
- Workspace #456: "Benefits Guide.pdf" (30 chunks)
- Chat #123: "Personal Notes.txt" (10 chunks)

Query: "What is the remote work policy?"

Results (top 5):
1. Chunk from "Company Handbook" (score: 0.89, source: workspace)
2. Chunk from "Company Handbook" (score: 0.85, source: workspace)
3. Chunk from "Personal Notes" (score: 0.78, source: chat)
4. Chunk from "Benefits Guide" (score: 0.72, source: workspace)
5. Chunk from "Company Handbook" (score: 0.71, source: workspace)
```

---

### API Endpoints Summary

**Document Management**:
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/bb-rag/api/rag/ingest` | Upload document |
| POST | `/bb-rag/api/rag/ingest-url` | Ingest from URL |
| GET | `/bb-rag/api/rag/list?chatId=xxx` | List chat documents |
| GET | `/bb-rag/api/rag/list?workspaceId=xxx` | List workspace documents |
| DELETE | `/bb-rag/api/rag/delete/:id` | Delete document |

**Querying**:
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/bb-rag/api/rag/query` | Query knowledge base |

**Statistics**:
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/bb-rag/api/rag/stats?chatId=xxx` | Chat stats |
| GET | `/bb-rag/api/rag/stats?workspaceId=xxx` | Workspace stats |
| GET | `/bb-rag/api/rag/storage/usage?tenantId=xxx` | Storage usage |

**Settings**:
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/bb-rag/api/rag/settings` | Get settings |
| POST | `/bb-rag/api/rag/settings` | Update settings |

---

## Configuration & Settings

### System-Wide Settings

**Database Table**: `Settings` (singleton - only 1 row)

**Fields**:
- `disable_rag`: Disable RAG globally
- `disable_rag_chat`: Disable RAG for chats
- `disable_rag_workspace`: Disable RAG for workspaces

**Default Values**: All `false` (RAG enabled)

**API Access**:
- `GET /bb-rag/api/rag/settings` - Get current settings
- `POST /bb-rag/api/rag/settings` - Update settings

**UI Access**: `/bb-admin/rag/settings` (Admin UI)

---

### Storage Configuration

**Storage Root**:
- **Path**: `{projectRoot}/bb-storage/media/{tenantId}/`
- **Structure**: Tenant-isolated folders

**Default Quota**: 1024 MB per tenant

**Quota Configuration**:
- Stored in `MediaSettings.storage_limit_mb` (database)
- Configurable via Admin UI (future feature)

**Quota Enforcement**:
- Checked before every upload
- Returns error if exceeded: `"Storage quota exceeded (1024MB / 1024MB)"`

**Usage Calculation**:
- Recursive folder size (all files + subdirectories)
- Real-time calculation on every upload

---

### Chunking Configuration

**Default Settings** (in `RAGService.constructor()`):
```javascript
this.textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 500,           // Characters per chunk
    chunkOverlap: 50,         // Overlap to preserve context
    separators: [
        '\n\n',               // Paragraph boundaries (preferred)
        '\n',                 // Line breaks
        '. ',                 // Sentence boundaries
        '! ',
        '? ',
        ', ',
        ' ',                  // Word boundaries
        ''                    // Character boundaries (last resort)
    ]
});
```

**Tuning Recommendations**:

| Setting | Small Value | Large Value | Use Case |
|---------|-------------|-------------|----------|
| **chunkSize** | 300-400 chars | 700-1000 chars | Technical docs (small), Narrative text (large) |
| **chunkOverlap** | 20-30 chars | 100-150 chars | Precise matching (small), Context-heavy (large) |

**Trade-offs**:
- **Smaller chunks**: Better precision, more granular search, more database rows
- **Larger chunks**: More context per result, fewer database rows, risk of diluted relevance
- **More overlap**: Preserves cross-boundary information, increases storage
- **Less overlap**: Reduces storage, risk of information loss

---

### Embedding Configuration

**Model**: `Xenova/all-MiniLM-L6-v2` (hardcoded in `EmbeddingService`)

**Model Details**:
- **Dimensions**: 384
- **Size**: ~90 MB
- **Quality**: Good for general semantic search
- **Speed**: 50-200ms per batch of 10 texts

**Alternative Models** (requires code change in `embeddingService.js`):

| Model | Dimensions | Size | Quality | Speed | Use Case |
|-------|------------|------|---------|-------|----------|
| `Xenova/all-MiniLM-L6-v2` | 384 | ~90 MB | Good | Fast | General (current) |
| `Xenova/all-mpnet-base-v2` | 768 | ~420 MB | Better | Slower | High quality |
| `Xenova/paraphrase-multilingual-MiniLM-L12-v2` | 384 | ~90 MB | Good | Fast | Multi-language |

**How to Change Model**:
1. Update `MODEL_NAME` in `embeddingService.js`:
   ```javascript
   const MODEL_NAME = 'Xenova/all-mpnet-base-v2';  // Change this
   ```
2. Update `EMBEDDING_DIM` if dimensions changed:
   ```javascript
   const EMBEDDING_DIM = 768;  // Match model dimensions
   ```
3. Restart server (model downloads on first use)
4. **Important**: Re-ingest all existing documents (embeddings are not compatible across models)

---

### Retrieval Configuration

**Default k**: 5 results (configurable per query via `k` parameter)

**Tuning Recommendations**:
| k Value | Context Size | Query Time | Use Case |
|---------|--------------|------------|----------|
| 3 | ~1500 chars | Fast | Focused answers, low noise |
| 5 (default) | ~2500 chars | Moderate | Balanced context |
| 10 | ~5000 chars | Slower | Comprehensive, high recall |

**Considerations**:
- **Higher k**: More context for LLM (better coverage, risk of context window overflow)
- **Lower k**: Less noise, faster processing, risk of missing relevant info
- **Context Window**: Ensure k × 500 chars + chat history + response < model context limit

---

## Data Flow Diagrams

### Document Ingestion Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER UPLOADS FILE                            │
└───────────────────────────────┬─────────────────────────────────────┘
                                ▼
                    ┌──────────────────────────┐
                    │  ragController.ingest()  │
                    │  - Parse form data       │
                    │  - Check storage quota   │
                    └────────────┬─────────────┘
                                 ▼
                    ┌──────────────────────────┐
                    │ FileStorageService       │
                    │ - Move to tenant folder  │
                    │ - Sanitize filename      │
                    │ - Generate unique path   │
                    └────────────┬─────────────┘
                                 ▼
                    ┌──────────────────────────┐
                    │ TextExtractorService     │
                    │ - Auto-detect format     │
                    │ - Extract plain text     │
                    │   (.pdf/.docx/.txt/etc.) │
                    └────────────┬─────────────┘
                                 ▼
                    ┌──────────────────────────┐
                    │ RAGService.ingestDocument│
                    │ 1. Create Document record│
                    └────────────┬─────────────┘
                                 ▼
                    ┌──────────────────────────┐
                    │ RAGService.chunkText()   │
                    │ - LangChain splitter     │
                    │ - 500 chars, 50 overlap  │
                    └────────────┬─────────────┘
                                 ▼
                    ┌──────────────────────────┐
                    │ EmbeddingService         │
                    │ - embedBatch(chunks)     │
                    │ - Xenova/all-MiniLM-L6-v2│
                    │ - Batch size: 10         │
                    └────────────┬─────────────┘
                                 ▼
                    ┌──────────────────────────┐
                    │ Store DocumentChunks     │
                    │ - chunk_index            │
                    │ - content (text)         │
                    │ - embedding (JSON)       │
                    │ - token_count            │
                    └────────────┬─────────────┘
                                 ▼
                    ┌──────────────────────────┐
                    │ Return { documentId }    │
                    └──────────────────────────┘
```

---

### Query & Retrieval Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│              USER SENDS MESSAGE IN CHAT                              │
└───────────────────────────────┬─────────────────────────────────────┘
                                ▼
                    ┌──────────────────────────┐
                    │  chatSocket.start()      │
                    │  - Load chat history     │
                    │  - Get last user message │
                    └────────────┬─────────────┘
                                 ▼
                    ┌──────────────────────────┐
                    │ Detect Workspace Context │
                    │ - is_workspace_created?  │
                    │ - Get workspaceId        │
                    └────────────┬─────────────┘
                                 ▼
                    ┌──────────────────────────┐
                    │ RAGService.queryRAG()    │
                    │ - Generate query embed   │
                    │   (384 dimensions)       │
                    └────────────┬─────────────┘
                                 ▼
                    ┌──────────────────────────┐
                    │ Layered Retrieval        │
                    │ 1. Workspace docs        │
                    │ 2. Chat docs             │
                    │ 3. Merge & deduplicate   │
                    └────────────┬─────────────┘
                                 ▼
                    ┌──────────────────────────┐
                    │ Get All Chunks           │
                    │ - WHERE document_id IN() │
                    └────────────┬─────────────┘
                                 ▼
                    ┌──────────────────────────┐
                    │ Cosine Similarity Search │
                    │ - For each chunk:        │
                    │   - Parse embedding      │
                    │   - Calculate similarity │
                    │   - Tag source (ws/chat) │
                    └────────────┬─────────────┘
                                 ▼
                    ┌──────────────────────────┐
                    │ Sort & Take Top k        │
                    │ - Sort by score desc     │
                    │ - Take top 5 (default)   │
                    └────────────┬─────────────┘
                                 ▼
                    ┌──────────────────────────┐
                    │ buildContextString()     │
                    │ - Format with metadata   │
                    │ - Include source tags    │
                    │ - Add relevance scores   │
                    └────────────┬─────────────┘
                                 ▼
                    ┌──────────────────────────┐
                    │ _injectRAGGrounding()    │
                    │ - Get grounding_mode     │
                    │ - Update system prompt   │
                    └────────────┬─────────────┘
                                 ▼
                    ┌──────────────────────────┐
                    │ modelService._generate() │
                    │ - Send to LLM with RAG   │
                    └────────────┬─────────────┘
                                 ▼
                    ┌──────────────────────────┐
                    │ Stream Response to User  │
                    └──────────────────────────┘
```

---

## Performance Characteristics

### Ingestion Performance

| Operation | Time | Notes |
|-----------|------|-------|
| File upload (client → server) | 100-500ms | Depends on file size + network |
| Text extraction (PDF, 10 pages) | 500ms-2s | Varies by page count + complexity |
| Text extraction (DOCX) | 100-300ms | Faster than PDF |
| Text extraction (TXT/MD) | 50-100ms | Direct file read |
| Chunking (LangChain, 500 chars) | 50-100ms | For typical document (5K words) |
| Model loading (first time) | 3-5s | Xenova model download + init |
| Batch embedding (50 chunks) | 500ms-2s | 10 chunks per batch |
| Database insertion (50 chunks) | 100-300ms | Bulk insert |
| **Total (first doc)** | **5-10s** | Including model load |
| **Total (subsequent)** | **2-5s** | Model already loaded |

**Bottlenecks**:
- First document: Model loading (~3-5s)
- Large PDFs: Text extraction (can be slow for 100+ pages)
- Many chunks: Embedding generation (linear with chunk count)

**Optimization Tips**:
- Pre-load model on server startup (reduces first-doc latency)
- Increase batch size for embedding (trade memory for speed)
- Use smaller chunk size to reduce total embedding time

---

### Query Performance

| Operation | Time | Scale |
|-----------|------|-------|
| Query embedding generation | 50-100ms | Single text |
| Document retrieval (SQL) | 10-50ms | 10-100 documents |
| Chunk retrieval (SQL) | 50-200ms | 100-1000 chunks |
| Cosine similarity (brute force) | 100-500ms | 1000 chunks × 384 dims |
| Context building (formatting) | 10-50ms | Top 5 results |
| **Total query time** | **200-800ms** | Typical chat query (1000 chunks) |

**Scalability**:
- **Current approach**: O(n) where n = total chunks
- **Scales to**: ~5000 chunks per chat (query time <1s)
- **Beyond 5000 chunks**: Consider LanceDB migration (O(log n) ANN search)

**Query Time by Chunk Count**:
| Chunks | Query Time | Notes |
|--------|------------|-------|
| 100 | 50-100ms | Fast |
| 500 | 100-200ms | Acceptable |
| 1000 | 200-500ms | Good |
| 5000 | 1-2s | Consider optimization |
| 10,000 | 3-5s | Migrate to LanceDB |

---

### Storage Requirements

| Item | Size | Notes |
|------|------|-------|
| Document metadata | ~1 KB | Per document |
| Chunk content | ~500 bytes | Per chunk (~500 chars) |
| Embedding (384 dims) | ~1.5 KB | JSON-serialized floats |
| **Per chunk total** | **~2 KB** | Content + embedding + metadata |
| **Per document (100 chunks)** | **~200 KB** | Typical document (database) |
| **1000 documents (100 chunks ea)** | **~200 MB** | Database size |

**File Storage** (separate from database):
- Raw files stored in `bb-storage/media/{tenantId}/`
- Quota enforcement: Default 1024 MB per tenant
- Not included in database size calculation

**Database Growth Estimate**:
| Documents | Chunks | Database Size | File Storage |
|-----------|--------|---------------|--------------|
| 100 | 10,000 | ~20 MB | ~100 MB |
| 1,000 | 100,000 | ~200 MB | ~1 GB |
| 10,000 | 1,000,000 | ~2 GB | ~10 GB |

**Note**: Above estimates assume 100 chunks per document and 1 MB per file.

---

## Security & Privacy

### Tenant Isolation

**1. File System Isolation**:
- Each tenant has dedicated folder: `bb-storage/media/{tenantId}/`
- Filename sanitization prevents path traversal:
  ```javascript
  filename.replace(/[^a-zA-Z0-9._-]/g, '_')
  ```
- Absolute paths prevent access to parent directories
- Files are never shared across tenants (no symbolic links)

**2. Database Isolation**:
- `Document.chat_id` + UserChat membership = access control
- All queries verify user is member of chat before returning data
- Workspace documents explicitly shared via `workspace_id`

**3. Workspace Sharing**:
- Documents with `workspace_id` are intentionally shared
- Access controlled via WorkspaceUser membership
- All workspace members have equal access (no granular permissions)

---

### Data Privacy

**1. Local Embeddings**:
- **No external API calls** for embedding generation
- All data stays on server (Xenova transformers run locally)
- No data sent to OpenAI, Google, or any third party

**2. No Data Leakage**:
- LanceDB (if used) stores vectors locally in `storage/vectors/`
- No third-party vector database services (Pinecone, Weaviate, etc.)
- All processing happens on your server

**3. Storage Quotas**:
- Prevents abuse and resource exhaustion
- Default 1024 MB per tenant (configurable)
- Real-time quota checking before every upload

---

### Input Validation

**1. File Upload**:
- **Filename sanitization**: `replace(/[^a-zA-Z0-9._-]/g, '_')`
- **File size limits**: Implicit via storage quota
- **MIME type validation**: Delegates to TextExtractor (rejects unsupported)
- **Path validation**: All paths are absolute (no `..` traversal)

**2. SQL Injection**:
- ORM layer (masterrecord) parameterizes all queries
- No raw SQL with user input
- Example:
  ```javascript
  // Safe (parameterized)
  db.Document.where(d => d.id == $$, userId).single();

  // Unsafe (never used)
  db.query(`SELECT * FROM Document WHERE id = ${userId}`);
  ```

**3. XSS Prevention**:
- Chunk content stored as plain text (no HTML)
- Frontend sanitizes all user input before rendering
- Context strings are plain text (no executable code)

---

## Code Examples

### 1. Manual RAG Query (Server-Side)

```javascript
const RAGContext = require('./components/rag/app/models/ragContext');
const RAGService = require('./components/rag/app/service/ragService');

// Initialize
const ragContext = new RAGContext();
const ragService = new RAGService(ragContext);

// Query knowledge base
const results = await ragService.queryRAG({
    chatId: 123,
    workspaceId: 456,  // Optional
    question: "What are the remote work policies?",
    k: 5
});

// Build context string
const context = ragService.buildContextString(results);

console.log(`Found ${results.length} relevant chunks`);
console.log('Top result:', results[0]);
console.log('Context:\n', context);
```

**Output**:
```
Found 5 relevant chunks
Top result: {
  content: 'Our remote work policy allows employees...',
  score: 0.873,
  documentTitle: 'Company Handbook',
  documentId: 42,
  chunkIndex: 5,
  source: 'workspace'
}
Context:
Here is relevant information from your knowledge base:

📄 [1] 🏢 Workspace - "Company Handbook" (relevance: 87.3%)
Our remote work policy allows employees...
```

---

### 2. Ingest Document Programmatically

```javascript
const RAGService = require('./components/rag/app/service/ragService');
const TextExtractorService = require('./components/rag/app/service/textExtractorService');
const FileStorageService = require('./components/rag/app/service/fileStorageService');

// Initialize services
const ragService = new RAGService(ragContext);
const textExtractor = new TextExtractorService();
const fileService = new FileStorageService();

// Move uploaded file to tenant storage
const finalPath = await fileService.moveUploadToTenant(
    '/tmp/upload_abc123',  // Temp path from upload
    'user_123',            // Tenant ID
    'document.pdf'         // Original filename
);

// Extract text
const text = await textExtractor.extract(finalPath, 'application/pdf');

// Check if extraction was successful
if (!text || text.trim().length === 0) {
    throw new Error('Extracted text is empty');
}

// Ingest document
const documentId = await ragService.ingestDocument({
    chatId: 123,
    tenantId: 'user_123',
    title: 'My Document',
    filename: 'document.pdf',
    filePath: finalPath,
    text: text,
    mimeType: 'application/pdf',
    fileSize: 1024000  // bytes
});

console.log('Document ingested with ID:', documentId);
```

---

### 3. Custom Chunking Strategy

```javascript
const { RecursiveCharacterTextSplitter } = require('@langchain/textsplitters');

// Create custom splitter
const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,           // Larger chunks for more context
    chunkOverlap: 100,         // More overlap to preserve continuity
    separators: [
        '\n\n\n',              // Major section breaks
        '\n\n',                // Paragraph boundaries
        '\n',                  // Line breaks
        '. ',                  // Sentence boundaries
        ' ',                   // Word boundaries
        ''                     // Character boundaries
    ]
});

// Chunk text
const chunks = await splitter.splitText(documentText);

console.log(`Created ${chunks.length} chunks`);
console.log('First chunk:', chunks[0]);
```

---

### 4. Batch Embedding Example

```javascript
const EmbeddingService = require('./components/rag/app/service/embeddingService');

// Initialize service
const embeddingService = new EmbeddingService();

// Text chunks to embed
const chunks = [
    "Our remote work policy allows employees to work from home 3 days per week.",
    "Health insurance coverage includes medical, dental, and vision.",
    "New hires have 30 days from start date to enroll in benefits."
];

// Generate embeddings (batch processing)
const embeddings = await embeddingService.embedBatch(chunks);

console.log(`Generated ${embeddings.length} embeddings`);
console.log('Embedding dimensions:', embeddings[0].length);  // 384
console.log('First embedding:', embeddings[0].slice(0, 5));  // [0.123, -0.456, ...]

// Calculate similarity between first two chunks
const similarity = embeddingService.cosineSimilarity(embeddings[0], embeddings[1]);
console.log('Similarity:', similarity);  // 0.0 to 1.0
```

---

### 5. Check Storage Quota

```javascript
const FileStorageService = require('./components/rag/app/service/fileStorageService');

const fileService = new FileStorageService();

// Check quota before upload
const check = await fileService.checkStorageQuota('user_123', 1024);

if (!check.allowed) {
    console.error(`Storage quota exceeded: ${check.usage}MB / ${check.quota}MB`);
    throw new Error('Cannot upload file - storage quota exceeded');
}

console.log(`Storage available: ${check.quota - check.usage}MB remaining`);
console.log(`Usage: ${check.percentUsed.toFixed(1)}%`);
```

---

## Troubleshooting Guide

### Common Issues

**1. "OpenAI API key not found"**

**Symptom**: Error message in logs or UI.

**Cause**: Legacy reference in old README (system now uses local embeddings).

**Solution**: **Ignore** - no OpenAI API key needed for RAG. This is a harmless warning.

---

**2. Poor Search Results (Low Relevance)**

**Symptom**: RAG returns irrelevant chunks or "I don't know" responses.

**Causes**:
- Not enough documents in knowledge base
- Query doesn't match document content
- Chunk size too large (dilutes relevance)

**Solutions**:
- Upload at least 3-5 documents for meaningful results
- Increase k value (retrieve more chunks): `k: 10` instead of `k: 5`
- Adjust chunk size in `RAGService` constructor:
  ```javascript
  chunkSize: 300,  // Smaller chunks = more precise
  ```
- Check if documents actually contain relevant information
- Try different queries (use keywords from documents)

---

**3. "Storage quota exceeded"**

**Symptom**: Upload fails with quota error.

**Cause**: Tenant has uploaded >1024 MB of files.

**Solutions**:
- **Delete old documents**: Use `/bb-rag/api/rag/delete/:id` endpoint
- **Increase quota**: Update `MediaSettings.storage_limit_mb` in database
- **Check usage**: `/bb-rag/api/rag/storage/usage?tenantId=xxx`

---

**4. Slow Embedding Generation**

**Symptom**: Document ingestion takes >10 seconds.

**Causes**:
- Model loading on first use (3-5s)
- Large document with many chunks
- Server resource constraints (CPU, memory)

**Solutions**:
- **First document**: 3-5s is normal (model load) - subsequent should be faster
- **Pre-load model** on server startup:
  ```javascript
  const embeddingService = new EmbeddingService();
  await embeddingService.initialize();  // Load model early
  ```
- **Increase batch size** (trade memory for speed):
  ```javascript
  const batchSize = 20;  // Default is 10
  ```
- **Check server resources**: Ensure adequate CPU + RAM (4GB+ recommended)

---

**5. "Failed to extract text from file"**

**Symptom**: Upload succeeds but ingestion fails.

**Causes**:
- Unsupported file format
- Corrupt file
- Image-only PDF (no OCR support)
- Empty file

**Solutions**:
- **Check supported formats**: .txt, .md, .pdf, .docx, .html, .csv
- **Verify file integrity**: Try opening file locally
- **For PDFs**: Ensure text is selectable (not scanned image)
- **Try different format**: Convert to .docx or .txt and retry

---

**6. "RAG query failed (non-fatal)"**

**Symptom**: Warning in logs, but chat still works.

**Cause**: RAG system encountered error (database, embedding service, etc.).

**Impact**: Chat continues without RAG context (LLM uses general knowledge).

**Solutions**:
- Check logs for specific error message
- Verify database is accessible
- Ensure embedding service initialized correctly
- If persistent, restart server to reload models

---

**7. LLM Hallucinates Despite RAG Context**

**Symptom**: LLM invents information not in documents.

**Causes**:
- Grounding mode too soft (allows general knowledge)
- Query doesn't match document content (RAG returns low-relevance chunks)
- Insufficient context (k too low)

**Solutions**:
- **Switch to strict grounding**:
  ```javascript
  model_config.grounding_mode = 'strict';
  ```
- **Increase k value** (retrieve more chunks):
  ```javascript
  k: 10
  ```
- **Review retrieved chunks**: Check if they actually contain answer
- **Add more documents**: Expand knowledge base coverage

---

**8. Database Migration Errors**

**Symptom**: Error when running migrations or starting server.

**Cause**: Missing Settings table or migration not applied.

**Solution**:
- Verify migration file exists:
  `/components/rag/app/models/db/migrations/1760328420571_Init_migration.js`
- Ensure Settings table creation is in migration:
  ```javascript
  this.createTable(table.Settings);
  ```
- Run migrations manually (if applicable):
  ```bash
  npm run migrate
  ```

---

## Future Enhancements

### Planned Features (from README.md)

- [ ] **Document versioning**: Track changes to documents over time
- [ ] **Collaborative knowledge bases**: Team editing and curation
- [ ] **Feedback loop**: Thumbs up/down on retrieved chunks
- [ ] **Hybrid search**: Combine vector search with keyword search (BM25)
- [ ] **Multi-language support**: Better handling of non-English text
- [ ] **Advanced chunking**: Semantic chunking (split by meaning, not length)
- [ ] **Cost tracking**: Track token usage per query
- [ ] **OCR support**: Extract text from image-based PDFs (Tesseract.js)
- [ ] **Structured data**: Better handling of tables, lists, code blocks
- [ ] **Query expansion**: Automatically rephrase queries for better recall
- [ ] **Re-ranking**: Second-stage ranking after initial retrieval

---

### LanceDB Migration

**Status**: Code exists, not in production.

**Benefits**:
- **10-100x faster**: O(log n) ANN search vs O(n) brute-force
- **Scalable**: Handles millions of vectors
- **Metadata filtering**: Filter by document/chat during search

**When to Migrate**:
- >10,000 chunks per tenant
- High query volume (>100 queries/minute)
- Query latency >500ms consistently

**Migration Steps** (see `LANCEDB_MIGRATION.md`):
1. Update `ragService.js` to use `vectorStore.js` methods
2. Create migration script to copy embeddings from SQL to LanceDB
3. Update delete operations to clean LanceDB tables
4. Test performance improvements
5. Switch traffic gradually (feature flag)

---

## Appendix

### Glossary

- **RAG**: Retrieval-Augmented Generation - technique to enhance LLM responses with external knowledge
- **Embedding**: Numerical representation of text (384-dim vector)
- **Chunk**: Small segment of text (~500 characters)
- **Cosine Similarity**: Measure of semantic similarity between vectors (0-1 scale)
- **Vector Database**: Database optimized for storing and searching high-dimensional vectors
- **ANN**: Approximate Nearest Neighbor - fast similarity search algorithm
- **Tenant**: User or organization with isolated data
- **Grounding**: Constraining LLM to use provided context
- **Hallucination**: LLM inventing information not in training data or context

---

### Related Documentation

- `/components/rag/README.md` - RAG component overview
- `/components/rag/SETUP.md` - Setup instructions
- `/components/rag/LANCEDB_MIGRATION.md` - LanceDB migration guide
- `/app/sockets/chatSocket.js` - Chat integration logic
- Xenova Transformers Docs: https://huggingface.co/docs/transformers.js
- LangChain Text Splitters: https://js.langchain.com/docs/modules/data_connection/document_transformers/

---

## Support

For issues, questions, or contributions:
- GitHub Issues: https://github.com/yourusername/bookbag-ce
- Documentation: `/docs/`
- Community: [Discord/Slack link]

---

**Document Version**: 1.0
**Last Updated**: October 2025
**Maintained By**: Bookbag Development Team
