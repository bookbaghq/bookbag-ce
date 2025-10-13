# LanceDB Migration Guide

## Overview

The RAG system has been upgraded to use **LanceDB** for vector storage, providing:

✅ **Fast ANN Search** - Approximate Nearest Neighbor search is 10-100x faster than brute-force cosine similarity
✅ **Embedded Architecture** - No external services needed, runs like SQLite
✅ **Scalability** - Can handle millions of vectors efficiently
✅ **Local-First** - All data stored locally in `storage/vectors/`

## Architecture

### Before (Old System)
```
📁 storage/uploads/          ← Raw files
🗄️ MySQL/SQLite             ← Documents metadata + chunks + embeddings (JSON)
```

### After (Current System with LanceDB)
```
📁 storage/uploads/          ← Raw files (unchanged)
📁 storage/vectors/          ← LanceDB vector database
🗄️ MySQL/SQLite             ← Documents metadata only (no more embeddings)
```

## What Changed

### 1. **Vector Storage**
- **Old**: Embeddings stored as JSON strings in `document_chunks` table
- **New**: Embeddings stored in LanceDB tables (one table per tenant)

### 2. **Search Performance**
- **Old**: O(n) brute-force cosine similarity across all chunks
- **New**: O(log n) ANN search using LanceDB indexes

### 3. **Database Schema**
- **Unchanged**: `documents` table still stores metadata
- **Removed**: `document_chunks` table no longer used (replaced by LanceDB)

## Files Modified

### New Files
- `components/rag/app/service/vectorStore.js` - LanceDB connection and operations

### Updated Files
- `components/rag/app/service/ragService.js` - Now uses LanceDB for vectors
- `components/rag/app/controllers/api/ragController.js` - Updated delete to pass tenantId

### Directory Structure
```
storage/
├── uploads/           ← Raw document files
│   └── tenant_xxx/    ← Per-tenant folders
└── vectors/           ← LanceDB database
    └── tenant_xxx.lance  ← Per-tenant vector tables
```

## API Endpoints (Unchanged)

All API endpoints remain the same:

- `POST /bb-rag/api/rag/ingest` - Upload and process documents
- `POST /bb-rag/api/rag/query` - Query knowledge base
- `GET /bb-rag/api/rag/list` - List documents
- `DELETE /bb-rag/api/rag/delete/:id` - Delete document
- `GET /bb-rag/api/rag/stats` - Get statistics
- `GET /bb-rag/api/rag/storage/usage` - Get storage usage

## Testing

### Test Document Upload
```bash
curl -X POST http://localhost:3000/bb-rag/api/rag/ingest \
  -H "Content-Type: multipart/form-data" \
  -F "file=@test.txt" \
  -F "title=Test Document" \
  -F "tenantId=default"
```

### Test Query
```bash
curl -X POST http://localhost:3000/bb-rag/api/rag/query \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "default",
    "question": "What is this about?",
    "k": 5
  }'
```

### Verify LanceDB Storage
```bash
# Check that vectors directory was created
ls -la storage/vectors/

# Should see tenant_xxx.lance files
```

## Performance Expectations

### Old System
- **Ingest**: ~2-3 seconds per document (embedding generation)
- **Query**: ~500ms-2s for 100 chunks (brute force)
- **Scalability**: Degrades linearly with chunk count

### New System with LanceDB
- **Ingest**: ~2-3 seconds per document (same, limited by OpenAI API)
- **Query**: ~50-200ms for millions of chunks (ANN search)
- **Scalability**: Logarithmic scaling, can handle millions of vectors

## Rollback (If Needed)

If you need to rollback to the old system:

1. Restore old `ragService.js` from git history
2. Re-enable `document_chunks` table
3. Remove LanceDB dependency: `npm uninstall @lancedb/lancedb`
4. Clear `storage/vectors/` directory

## Migration Notes

### Existing Data
- **No automatic migration** - Old embeddings in `document_chunks` are ignored
- **Clean slate** - New documents will use LanceDB
- **Optional**: Write a script to migrate old embeddings if needed

### Storage Requirements
- LanceDB uses ~4KB per 1536-dim vector (text-embedding-3-small)
- 1000 chunks = ~4MB
- 100,000 chunks = ~400MB

## Future Enhancements

LanceDB supports:
- ✅ Metadata filtering (e.g., filter by document_id during search)
- ✅ Hybrid search (vector + keyword)
- ✅ Incremental updates without full re-index
- ✅ Compression for reduced storage

## Support

For issues or questions:
- Check LanceDB docs: https://lancedb.github.io/lancedb/
- Review code in `components/rag/app/service/`
- Test with small documents first

---

**Status**: ✅ Migration Complete - LanceDB is now the default vector store
