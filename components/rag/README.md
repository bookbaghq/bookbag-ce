# RAG (Retrieval-Augmented Generation) System

A complete knowledge base system for Bookbag that enables document upload, embedding generation, and semantic search to provide context-aware AI responses.

## Features

- 📤 **Document Upload**: Support for text files, PDFs, and documents
- 🧠 **Smart Chunking**: Automatically splits documents into searchable pieces
- 🔍 **Semantic Search**: Uses OpenAI embeddings for accurate retrieval
- 💾 **Storage Management**: Per-tenant storage quotas and usage tracking
- 🎯 **Context Integration**: Seamlessly adds relevant context to LLM prompts
- 📊 **Statistics**: Track document counts, chunks, and storage

## Architecture

```
components/rag/
├── app/
│   ├── controllers/api/
│   │   └── ragController.js      # API endpoints
│   ├── models/
│   │   ├── document.js           # Document metadata
│   │   ├── documentChunk.js      # Chunked text with embeddings
│   │   └── ragContext.js         # Database context
│   └── service/
│       ├── fileStorageService.js # File management
│       └── ragService.js         # RAG operations
├── config/
│   └── routes.js                 # Route definitions
└── migrations/
    └── 001_create_rag_tables.sql
```

## Installation

### 1. Install Dependencies

```bash
# OpenAI is already installed in your project
# If multer is not installed:
npm install multer
```

### 2. Set Environment Variable

Add to your `.env` file:
```bash
OPENAI_API_KEY=your_openai_api_key_here
```

### 3. Run Database Migration

```bash
# For SQLite
sqlite3 your_database.db < components/rag/migrations/001_create_rag_tables.sql

# For MySQL
mysql -u username -p database_name < components/rag/migrations/001_create_rag_tables.sql

# For PostgreSQL
psql -U username -d database_name -f components/rag/migrations/001_create_rag_tables.sql
```

### 4. Register Routes

The routes are already configured in `components/rag/config/routes.js`. Ensure MasterController loads this module.

### 5. Create Storage Directory

```bash
mkdir -p storage/uploads
chmod 755 storage/uploads
```

## API Endpoints

### Upload Document
```bash
POST /bb-rag/api/rag/ingest
Content-Type: multipart/form-data

Fields:
- file: (file) The document to upload
- tenantId: (string) Tenant identifier
- title: (string, optional) Document title
```

### List Documents
```bash
GET /bb-rag/api/rag/list?tenantId=xxx
```

### Delete Document
```bash
DELETE /bb-rag/api/rag/delete/:id
```

### Query Knowledge Base
```bash
POST /bb-rag/api/rag/query
Content-Type: application/json

{
  "tenantId": "user123",
  "question": "What are the key features?",
  "k": 5
}
```

### Get Storage Usage
```bash
GET /bb-rag/api/rag/storage/usage?tenantId=xxx
```

### Get Statistics
```bash
GET /bb-rag/api/rag/stats?tenantId=xxx
```

## Frontend Integration

### Import the Sidebar Component

```jsx
import { KnowledgeBaseSidebar } from '@/app/bb-client/_components/components/KnowledgeBaseSidebar';

function ChatLayout() {
  const handleContextGenerated = (context, results) => {
    // context: formatted string for LLM prompt
    // results: array of relevant chunks with scores
    console.log('RAG Context:', context);

    // Add to system prompt or user message
    // setSystemPrompt(prev => prev + '\n\n' + context);
  };

  return (
    <div className="flex h-screen">
      <KnowledgeBaseSidebar
        tenantId={userId}
        onContextGenerated={handleContextGenerated}
      />
      <ChatInterface />
    </div>
  );
}
```

## Usage Example: Integrating with Chat

### Automatic Context Injection

```javascript
// In your message controller or chat service

const RAGService = require('./service/ragService');
const ragService = new RAGService(context);

async function generateAIResponse(userMessage, userId, chatId) {
  // Query knowledge base for relevant context
  const relevantChunks = await ragService.queryRAG(userId, userMessage, 3);

  // Build context string
  const ragContext = ragService.buildContextString(relevantChunks);

  // Add to system prompt
  const enhancedSystemPrompt = `${baseSystemPrompt}

${ragContext}

Please use the above information from the knowledge base when relevant to answer the user's question.`;

  // Send to LLM with enhanced context
  const response = await llm.generate({
    messages: chatHistory,
    systemPrompt: enhancedSystemPrompt
  });

  return response;
}
```

### Manual Query

```javascript
// User can explicitly query knowledge base
if (userMessage.startsWith('/search ')) {
  const query = userMessage.replace('/search ', '');
  const results = await ragService.queryRAG(userId, query, 5);

  // Display results to user
  return formatSearchResults(results);
}
```

## Configuration

### Storage Quota

Default quota is 1024 MB per tenant. Modify in `ragController.js`:

```javascript
const quota = await this.fileService.checkStorageQuota(tenantId, 2048); // 2GB
```

### Chunk Size

Default chunk size is 500 characters. Modify in `ragService.js`:

```javascript
const chunks = this.chunkText(text, 800); // Larger chunks
```

### Number of Results

Default is 5 chunks. Adjust in queries:

```javascript
const results = await ragService.queryRAG(userId, question, 10); // More results
```

### Embedding Model

Using `text-embedding-3-small` (1536 dimensions). To change model, edit `ragService.js`:

```javascript
const response = await this.openaiClient.embeddings.create({
  model: 'text-embedding-3-large', // Higher quality, slower
  input: text
});
```

## Performance Optimization

### 1. Cache Embeddings
For frequently queried documents, consider caching embeddings in memory.

### 2. Batch Processing
When ingesting multiple documents, batch embedding API calls:

```javascript
const embeddings = await openai.embeddings.create({
  model: 'text-embedding-3-small',
  input: chunks // Array of chunks
});
```

### 3. Database Indexes
Already created in migration. For PostgreSQL, consider:
- Full-text search indexes on content
- HNSW indexes for vector search (with pgvector extension)

### 4. Vector Database (Advanced)
For production scale, consider:
- Pinecone
- Weaviate
- Qdrant
- PostgreSQL with pgvector

## Troubleshooting

### OpenAI API Errors

```javascript
// Check API key
console.log('API Key set:', !!process.env.OPENAI_API_KEY);

// Rate limiting: add delays between requests
await new Promise(resolve => setTimeout(resolve, 1000));
```

### Storage Quota Exceeded

```javascript
// Clean up old documents
const oldDocs = await getDocumentsOlderThan(90); // days
for (const doc of oldDocs) {
  await deleteDocument(doc.id);
}
```

### Poor Search Results

1. **Increase K value**: Get more chunks
2. **Improve chunking**: Use paragraph or section boundaries
3. **Add metadata**: Store document type, date, tags
4. **Hybrid search**: Combine vector search with keyword search

## Security Considerations

1. **Tenant Isolation**: Documents are strictly isolated by tenant_id
2. **File Sanitization**: Filenames are sanitized to prevent path traversal
3. **Storage Quotas**: Prevent abuse with per-tenant limits
4. **API Authentication**: All routes use Bookbag's auth system
5. **Sensitive Data**: Consider encrypting stored embeddings

## Roadmap

- [ ] PDF text extraction (using pdf-parse)
- [ ] DOCX support (using mammoth)
- [ ] Markdown formatting preservation
- [ ] Document versioning
- [ ] Collaborative knowledge bases (workspace-level)
- [ ] Feedback loop (thumbs up/down on retrieved chunks)
- [ ] Hybrid search (vector + keyword)
- [ ] Multi-language support
- [ ] Advanced chunking strategies
- [ ] Cost tracking per query

## License

Part of Bookbag CE (Community Edition)

## Support

For issues or questions, please refer to the main Bookbag documentation or create an issue in the repository.
