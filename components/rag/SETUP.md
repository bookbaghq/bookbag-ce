# RAG System Setup Guide

Quick start guide to get your RAG knowledge base system running.

## 🚀 Quick Start (5 minutes)

### Step 1: Environment Setup

Add to your `.env` file:
```bash
OPENAI_API_KEY=sk-your-key-here
```

### Step 2: Install Dependencies

```bash
# Install multer for file uploads (if not already installed)
cd /Users/alexanderrich/Documents/development/bookbaghq/bookbag-ce
npm install multer
```

### Step 3: Create Storage Directory

```bash
mkdir -p storage/uploads
chmod 755 storage/uploads
```

### Step 4: Run Database Migration

Choose your database type:

**SQLite (default for development):**
```bash
sqlite3 bookbag.db < components/rag/migrations/001_create_rag_tables.sql
```

**MySQL:**
```bash
mysql -u root -p bookbag < components/rag/migrations/001_create_rag_tables.sql
```

**PostgreSQL:**
```bash
psql -U postgres -d bookbag -f components/rag/migrations/001_create_rag_tables.sql
```

### Step 5: Update ragContext.js (if needed)

Edit `components/rag/app/models/ragContext.js` to match MasterController's context pattern if different from the provided implementation.

### Step 6: Register RAG Module

Ensure MasterController loads the RAG component. Check your main app file or components loader.

### Step 7: Restart Server

```bash
npm run dev
# or
node server.js
```

## ✅ Verification

### 1. Check Routes

Visit or curl these endpoints to verify they're registered:

```bash
# Check health (should return 404 or proper error, not 'route not found')
curl http://localhost:3000/bb-rag/api/rag/list

# Should ask for authentication or return empty list
```

### 2. Test Upload

```bash
# Create a test file
echo "This is a test document about AI and machine learning." > test.txt

# Upload it
curl -X POST http://localhost:3000/bb-rag/api/rag/ingest \
  -F "file=@test.txt" \
  -F "tenantId=test-user" \
  -F "title=Test Document" \
  --cookie "your-session-cookie"
```

### 3. Test Query

```bash
curl -X POST http://localhost:3000/bb-rag/api/rag/query \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "test-user",
    "question": "Tell me about AI",
    "k": 3
  }' \
  --cookie "your-session-cookie"
```

## 🎨 Frontend Integration

### Option 1: Add to Existing Chat Interface

Edit `nextjs-app/app/bb-client/page.js` (or your chat page):

```jsx
import { KnowledgeBaseSidebar } from './_components/components/KnowledgeBaseSidebar';

export default function ChatPage() {
  const userId = 'current-user-id'; // Get from auth

  const handleContextGenerated = (context, results) => {
    console.log('RAG context:', context);
    // TODO: Inject into chat system prompt
  };

  return (
    <div className="flex h-screen">
      {/* Add sidebar */}
      <KnowledgeBaseSidebar
        tenantId={userId}
        onContextGenerated={handleContextGenerated}
      />

      {/* Your existing chat interface */}
      <div className="flex-1">
        <ModernChatInterface />
      </div>
    </div>
  );
}
```

### Option 2: Standalone Knowledge Base Page

Create `nextjs-app/app/knowledge-base/page.js`:

```jsx
'use client';

import { KnowledgeBaseSidebar } from '../bb-client/_components/components/KnowledgeBaseSidebar';

export default function KnowledgeBasePage() {
  return (
    <div className="flex h-screen">
      <KnowledgeBaseSidebar
        tenantId="current-user"
        onContextGenerated={(context) => {
          alert(`Found relevant context: ${context.substring(0, 100)}...`);
        }}
      />

      <main className="flex-1 p-8">
        <h1 className="text-2xl font-bold mb-4">Knowledge Base</h1>
        <p className="text-muted-foreground">
          Upload documents to build your AI knowledge base.
          Query them from the sidebar.
        </p>
      </main>
    </div>
  );
}
```

## 🔗 Integrate with Chat System

### Automatic Context Injection

Edit your message controller (`components/chats/app/controllers/api/messageController.js`):

```javascript
const RAGService = require(`${master.root}/components/rag/app/service/ragService`);
const RAGContext = require(`${master.root}/components/rag/app/models/ragContext`);

class messageController {
  constructor(req) {
    // ... existing code ...

    // Add RAG context
    this._ragContext = new RAGContext();
    this.ragService = new RAGService(this._ragContext);
  }

  async createUserMessage(obj) {
    // ... existing code ...

    // Before sending to LLM, check for RAG context
    const userId = this._currentUser.id;
    const userContent = formData.content;

    // Query knowledge base for relevant context
    try {
      const relevantChunks = await this.ragService.queryRAG(
        String(userId),
        userContent,
        3 // top 3 chunks
      );

      if (relevantChunks.length > 0) {
        // Add context to the message or system prompt
        const ragContext = this.ragService.buildContextString(relevantChunks);

        // Option 1: Add to system prompt
        // this.modelSettings.systemPrompt += `\n\n${ragContext}`;

        // Option 2: Prepend to user message
        // formData.content = `${ragContext}\n\n${userContent}`;

        console.log(`✅ Added RAG context: ${relevantChunks.length} chunks`);
      }
    } catch (ragError) {
      console.error('⚠️ RAG query failed:', ragError.message);
      // Continue without RAG context
    }

    // ... rest of existing code ...
  }
}
```

## 🐛 Troubleshooting

### Issue: "OpenAI API key not found"

**Solution:**
```bash
# Check if key is set
echo $OPENAI_API_KEY

# Add to .env
echo "OPENAI_API_KEY=sk-your-key" >> .env

# Restart server
```

### Issue: "Route not found"

**Solution:**
Check if RAG routes are being loaded by MasterController.

```javascript
// In your main server file or component loader
const master = require('mastercontroller');

// Ensure RAG component is loaded
// Check components directory structure matches MasterController expectations
```

### Issue: "Cannot upload files"

**Solution:**
Ensure multer middleware is configured:

```javascript
// In ragController.js or a middleware file
const multer = require('multer');
const upload = multer({ dest: 'storage/temp/' });

// Use in route
router.post('/ingest', upload.single('file'), ragController.ingestDocument);
```

### Issue: "Database table not found"

**Solution:**
```bash
# Re-run migration
sqlite3 your-database.db < components/rag/migrations/001_create_rag_tables.sql

# Verify tables exist
sqlite3 your-database.db ".tables"
# Should show: documents, document_chunks
```

### Issue: "Poor search results"

**Solutions:**
1. Upload more documents (need minimum 3-5 for good results)
2. Use more descriptive queries
3. Increase K value (number of chunks returned)
4. Check embedding generation is working:

```javascript
// Test embedding generation
const testEmbedding = await ragService.generateEmbedding("test text");
console.log('Embedding length:', testEmbedding.length); // Should be 1536
```

## 📊 Monitoring

### Check System Health

```bash
# Storage usage
curl http://localhost:3000/bb-rag/api/rag/storage/usage?tenantId=user123

# Statistics
curl http://localhost:3000/bb-rag/api/rag/stats?tenantId=user123

# List documents
curl http://localhost:3000/bb-rag/api/rag/list?tenantId=user123
```

### Database Queries

```sql
-- Count documents
SELECT COUNT(*) FROM documents;

-- Count chunks
SELECT COUNT(*) FROM document_chunks;

-- Storage per tenant
SELECT tenant_id, COUNT(*) as doc_count
FROM documents
GROUP BY tenant_id;

-- Chunks per document
SELECT d.title, COUNT(dc.id) as chunk_count
FROM documents d
LEFT JOIN document_chunks dc ON d.id = dc.document_id
GROUP BY d.id;
```

## 🎯 Next Steps

1. **Test the system** with a few documents
2. **Monitor OpenAI usage** (embeddings can add up)
3. **Set storage quotas** per tenant/user
4. **Add file type validation** (PDF, DOCX support)
5. **Implement caching** for frequently queried embeddings
6. **Add feedback mechanisms** (thumbs up/down on results)

## 📚 Advanced Features

### PDF Support

```bash
npm install pdf-parse

# Update ragController.js
const pdfParse = require('pdf-parse');

async ingestDocument(obj) {
  // ... existing code ...

  if (mimeType === 'application/pdf') {
    const dataBuffer = await fs.readFile(finalPath);
    const pdfData = await pdfParse(dataBuffer);
    text = pdfData.text;
  }

  // ... rest of code ...
}
```

### DOCX Support

```bash
npm install mammoth

# Update ragController.js
const mammoth = require('mammoth');

async ingestDocument(obj) {
  // ... existing code ...

  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    const result = await mammoth.extractRawText({ path: finalPath });
    text = result.value;
  }

  // ... rest of code ...
}
```

## 🔒 Security Checklist

- [ ] OPENAI_API_KEY is in .env (not committed to git)
- [ ] Storage directory has correct permissions
- [ ] Tenant isolation is enforced in all queries
- [ ] File size limits are configured
- [ ] Storage quotas are set
- [ ] File type validation is enabled
- [ ] Authentication is required on all endpoints

## ✨ Success Indicators

You'll know the system is working when:

1. ✅ Documents upload successfully
2. ✅ Chunks appear in document_chunks table
3. ✅ Queries return relevant results
4. ✅ Storage usage is tracked accurately
5. ✅ Context is injected into chat responses

## 🆘 Getting Help

If you encounter issues:

1. Check server logs for errors
2. Verify database tables exist
3. Test OpenAI API key directly
4. Review README.md for detailed documentation
5. Check that all files were created successfully

---

**You're all set!** 🎉

Start by uploading a few test documents and querying them. The system will learn and improve as you add more content.
