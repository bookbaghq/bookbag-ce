# RAG Plugin

**Version:** 1.0.0
**Author:** Bookbag Team
**License:** MIT

## Overview

The RAG (Retrieval-Augmented Generation) Plugin is a powerful knowledge base system for Bookbag that enables intelligent document ingestion, semantic search, and context-aware AI responses. It seamlessly integrates with the chat interface to provide relevant information from your document library.

## Features

### Document Processing
- **Multi-Format Support**: PDF, DOCX, TXT, CSV, HTML, and Markdown files
- **Automatic Text Extraction**: Intelligent content extraction from various file formats
- **URL Ingestion**: Import content directly from web pages
- **Smart Chunking**: Automatic document segmentation for optimal embedding

### Vector Search
- **LanceDB Integration**: High-performance vector database for fast similarity search
- **Xenova Transformers**: Local embedding generation using `Xenova/all-MiniLM-L6-v2` model
- **Semantic Search**: Find relevant content based on meaning, not just keywords
- **Context Injection**: Automatically inject relevant document context into chat conversations

### Admin Interface
- **Document Management**: Upload, view, and delete documents via admin panel
- **Statistics Dashboard**: View document counts, storage usage, and chunk statistics
- **Settings Panel**: Configure RAG behavior and model parameters
- **Workspace Support**: Organize documents by workspace/tenant

### Client Features
- **Knowledge Base Sidebar**: Browse and manage documents directly from the chat interface
- **Real-time Updates**: See new documents appear instantly
- **Document Upload**: Drag-and-drop file uploads from client interface
- **Search Integration**: Automatic context retrieval during conversations

## Architecture

### Core Components

```
rag-plugin/
├── app/
│   ├── controllers/          # API endpoint handlers
│   │   ├── ragController.js         # Document CRUD operations
│   │   └── ragSettingsController.js # Settings management
│   ├── hooks/                # Plugin hooks
│   │   └── llmBeforeGenerateHandler.js  # Context injection
│   ├── models/               # Database models
│   │   ├── document.js              # Document entity
│   │   ├── documentChunk.js         # Chunk entity
│   │   └── settings.js              # RAG settings
│   └── service/              # Business logic
│       ├── embeddingService.js      # Embedding generation
│       ├── ragService.js            # Main RAG logic
│       ├── textExtractorService.js  # File parsing
│       ├── vectorStore.js           # LanceDB operations
│       └── fileStorageService.js    # File system ops
├── config/
│   ├── routes.js             # API route definitions
│   └── initializers/         # Plugin configuration
├── nextjs/                   # Frontend components
│   ├── admin/                # Admin pages
│   │   ├── rag/documents/page.js    # Document list
│   │   └── rag/settings/page.js     # Settings page
│   └── client/               # Client components
│       └── KnowledgeBaseSidebar.js  # Chat sidebar
├── index.js                  # Plugin entry point
├── plugin.json               # Plugin metadata
└── package.json              # Dependencies
```

### Hook Integration

The plugin registers hooks to integrate with Bookbag's core functionality:

- **`LLM_BEFORE_GENERATE`**: Injects relevant document context before AI responses
- **`ADMIN_MENU`**: Adds RAG menu items to admin sidebar
- **`PLUGIN_ACTIVATED`**: Runs setup tasks on plugin activation
- **`PLUGIN_DEACTIVATED`**: Cleanup tasks on deactivation

## Installation

### Prerequisites

- Node.js 18+
- Bookbag CE installed and running
- Sufficient disk space for vector storage

### Automatic Installation (via Plugin Manager)

1. Navigate to **Admin → Plugins → Add New**
2. Upload the `rag-plugin.zip` file
3. Click **Activate Plugin**
4. The plugin will automatically:
   - Install npm dependencies
   - Run database migrations
   - Create storage directories
   - Generate Next.js symlinks

### Manual Installation

```bash
# Navigate to plugins directory
cd bb-plugins/

# Install plugin dependencies
cd rag-plugin && npm install

# Run database migrations
cd ../.. && masterrecord update-database rag

# Create storage directories
mkdir -p storage/rag/documents
mkdir -p storage/rag/vectors

# Activate plugin via admin panel or database
```

## Configuration

### Environment Settings

Configure the plugin via **Admin → RAG → Settings**:

| Setting | Description | Default |
|---------|-------------|---------|
| **Embedding Model** | Xenova transformer model | `Xenova/all-MiniLM-L6-v2` |
| **Chunk Size** | Maximum tokens per chunk | `500` |
| **Chunk Overlap** | Overlapping tokens between chunks | `50` |
| **Top K Results** | Number of similar chunks to retrieve | `5` |
| **Similarity Threshold** | Minimum cosine similarity (0-1) | `0.7` |
| **Context Injection** | Enable automatic context in chats | `true` |

### Storage Configuration

The plugin stores data in the following locations:

```
storage/rag/
├── documents/     # Uploaded document files
├── vectors/       # LanceDB vector database
└── temp/          # Temporary processing files
```

## API Endpoints

### Document Management

#### Upload Document
```http
POST /bb-rag/api/rag/ingest
Content-Type: multipart/form-data

Form Data:
- file: <file>
- tenantId: <string> (optional)
- workspaceId: <string> (optional)
```

#### Ingest URL
```http
POST /bb-rag/api/rag/ingest-url
Content-Type: application/json

{
  "url": "https://example.com/article",
  "tenantId": "default",
  "workspaceId": "workspace123"
}
```

#### List Documents
```http
GET /bb-rag/api/rag/list?tenantId=default&workspaceId=workspace123
```

#### Delete Document
```http
DELETE /bb-rag/api/rag/delete/:id
```

### Knowledge Base

#### Query Knowledge Base
```http
POST /bb-rag/api/rag/query
Content-Type: application/json

{
  "query": "What is RAG?",
  "tenantId": "default",
  "workspaceId": "workspace123",
  "topK": 5
}
```

#### Get Statistics
```http
GET /bb-rag/api/rag/stats?tenantId=default
```

### Settings

#### Get Settings
```http
GET /bb-rag/api/rag/settings
```

#### Update Settings
```http
POST /bb-rag/api/rag/settings
Content-Type: application/json

{
  "chunkSize": 500,
  "chunkOverlap": 50,
  "topK": 5,
  "similarityThreshold": 0.7
}
```

## Usage

### Admin Panel

#### Upload Documents

1. Navigate to **Admin → RAG → Documents**
2. Click **Upload Document** button
3. Select a file (PDF, DOCX, TXT, CSV, HTML, MD)
4. Wait for processing and embedding generation
5. Document appears in the list with metadata

#### Manage Documents

- **View Details**: Click on a document to see metadata, chunks, and storage info
- **Delete Documents**: Click trash icon to remove a document and its vectors
- **Search Documents**: Use the search bar to filter by title or content
- **Storage Stats**: View total documents, chunks, and disk usage

#### Configure Settings

1. Navigate to **Admin → RAG → Settings**
2. Adjust chunking and retrieval parameters
3. Test different models and thresholds
4. Click **Save Settings**

### Client Interface

#### Knowledge Base Sidebar

The plugin adds a "Knowledge Base" sidebar to the chat interface:

1. Click the **Database** icon in the chat sidebar
2. View all documents in your workspace
3. Upload new documents via drag-and-drop
4. Search existing documents
5. Delete documents you no longer need

#### Automatic Context Injection

When you ask a question in chat:

1. The plugin automatically searches for relevant documents
2. Top matching chunks are retrieved based on semantic similarity
3. Context is injected into the prompt before generation
4. AI responds with knowledge from your documents
5. Citations show which documents were referenced

### Programmatic Usage

```javascript
// Import RAG service
const ragService = require('./app/service/ragService');

// Ingest a document
const result = await ragService.ingestDocument({
  filePath: '/path/to/document.pdf',
  fileName: 'document.pdf',
  mimeType: 'application/pdf',
  tenantId: 'default',
  workspaceId: 'workspace123'
});

// Query knowledge base
const results = await ragService.queryKnowledgeBase({
  query: 'What is machine learning?',
  tenantId: 'default',
  workspaceId: 'workspace123',
  topK: 5
});

// Results contain:
// - chunks: Array of relevant text chunks
// - documents: Array of source documents
// - scores: Similarity scores
```

## Supported File Types

| Format | Extension | Text Extraction Method |
|--------|-----------|------------------------|
| **PDF** | `.pdf` | `pdf-parse` library |
| **Word** | `.docx` | `mammoth` library |
| **Text** | `.txt` | Direct read |
| **CSV** | `.csv` | `csv-parser` library |
| **HTML** | `.html` | `cheerio` library (DOM parsing) |
| **Markdown** | `.md` | Direct read with formatting |

### File Size Limits

- **Maximum file size**: 50MB (configurable via settings)
- **Recommended size**: < 10MB for optimal performance
- **Large documents**: Automatically split into smaller chunks

## Dependencies

### Backend Dependencies

```json
{
  "@lancedb/lancedb": "^0.22.2",      // Vector database
  "@langchain/textsplitters": "^0.1.0", // Text chunking
  "@xenova/transformers": "^2.17.2",   // Embedding generation
  "cheerio": "^1.1.2",                 // HTML parsing
  "csv-parser": "^3.2.0",              // CSV parsing
  "mammoth": "^1.11.0",                // DOCX parsing
  "pdf-parse": "^2.3.0"                // PDF parsing
}
```

### Frontend Dependencies

```json
{
  "lucide-react": "^0.485.0",  // Icons
  "sonner": "^2.0.7",          // Toast notifications
  "react": "^19.0.0",          // UI framework
  "react-dom": "^19.0.0"       // DOM rendering
}
```

## Development

### Build Frontend Components

```bash
# Build for production
npm run build

# Watch mode for development
npm run dev
```

The build process uses `esbuild` to bundle React components into standalone JavaScript files that can be loaded dynamically by Next.js.

### Database Migrations

Create a new migration:

```bash
cd app/models/db/migrations
# Create new migration file following pattern:
# {timestamp}_Description.js
```

Run migrations:

```bash
masterrecord update-database rag
```

### Testing

```bash
# Test document ingestion
curl -X POST http://localhost:8080/bb-rag/api/rag/ingest \
  -F "file=@test.pdf" \
  -F "tenantId=default"

# Test query
curl -X POST http://localhost:8080/bb-rag/api/rag/query \
  -H "Content-Type: application/json" \
  -d '{"query":"test question","tenantId":"default"}'

# View statistics
curl http://localhost:8080/bb-rag/api/rag/stats?tenantId=default
```

## Troubleshooting

### Plugin Won't Activate

**Issue**: Plugin activation fails with error

**Solutions**:
- Check that Node.js version is 18+
- Ensure `npm install` completed successfully in plugin directory
- Verify database migrations ran: `masterrecord update-database rag`
- Check file permissions on `storage/rag/` directory

### Documents Not Processing

**Issue**: Documents upload but don't appear in list

**Solutions**:
- Check backend logs for text extraction errors
- Verify file format is supported
- Ensure file is not corrupted
- Check disk space for storage directory
- Increase memory limit if handling large files

### Poor Search Results

**Issue**: Search returns irrelevant documents

**Solutions**:
- Adjust `similarityThreshold` in settings (lower = more results)
- Increase `topK` value to retrieve more chunks
- Reduce `chunkSize` for more granular search
- Re-embed documents after changing models

### Vector Store Errors

**Issue**: LanceDB connection or query errors

**Solutions**:
- Delete and recreate vector store: `rm -rf storage/rag/vectors/*`
- Re-ingest all documents to rebuild index
- Check LanceDB version compatibility
- Verify sufficient disk space for vector database

### Memory Issues

**Issue**: Plugin crashes or runs out of memory

**Solutions**:
- Reduce batch size for document processing
- Process documents one at a time instead of bulk upload
- Increase Node.js heap size: `NODE_OPTIONS=--max-old-space-size=4096`
- Use smaller embedding model if available

## License

MIT License - see LICENSE file for details

## Support

For issues, questions, or feature requests:

- **GitHub Issues**: [Report an issue](https://github.com/bookbaghq/bookbag-ce/issues)
- **Documentation**: [Bookbag Docs](https://docs.bookbag.com)
- **Community**: [Discord Server](https://discord.gg/bookbag)

## Changelog

### Version 1.0.0
- Initial release
- Document ingestion for PDF, DOCX, TXT, CSV, HTML, MD
- LanceDB vector storage
- Xenova embedding generation
- Admin panel for document management
- Client sidebar integration
- Automatic context injection into chat
- Multi-tenant and workspace support
