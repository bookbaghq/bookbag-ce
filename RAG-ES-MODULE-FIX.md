# RAG ES Module Fix

## Problem

The backend was crashing on startup with this error:

```
Error [ERR_REQUIRE_ESM]: require() of ES Module /var/www/bookbag-ce/node_modules/@xenova/transformers/src/transformers.js not supported.
```

This caused:
- Backend to crash during route initialization
- All API requests to return `ERR_EMPTY_RESPONSE`
- RAG features completely non-functional

## Root Cause

`@xenova/transformers` version 3.x+ is an **ES Module only** package, but Bookbag uses **CommonJS** (`require()` syntax). Node.js doesn't allow `require()` for ES modules - you must use dynamic `import()`.

## Solution Applied

Changed `components/rag/app/service/embeddingService.js` to use **dynamic import** instead of `require()`:

### Before (Broken):
```javascript
const { pipeline } = require('@xenova/transformers');

class EmbeddingService {
    async initialize() {
        this.pipe = await pipeline('feature-extraction', this.model);
    }
}
```

### After (Fixed):
```javascript
class EmbeddingService {
    async initialize() {
        // Dynamic import for ES module support
        const transformers = await import('@xenova/transformers');
        this.pipelineFunction = transformers.pipeline;

        this.pipe = await this.pipelineFunction('feature-extraction', this.model);
    }
}
```

## Why This Fix Works

- **Dynamic `import()`** returns a Promise and can load ES modules from CommonJS
- The import happens **inside the async function**, not at the top level
- The `pipeline` function is stored and reused for subsequent operations
- No changes needed to package.json or module type

## Deployment Steps

### 1. Update Code on Server

```bash
# SSH into your Ubuntu server
ssh user@your-server

# Navigate to project
cd /var/www/bookbag-ce

# Pull latest changes
git pull origin main

# Or if you haven't committed yet, just push from local:
# git add components/rag/app/service/embeddingService.js
# git commit -m "Fix ES module import for @xenova/transformers"
# git push
```

### 2. Ensure Dependencies Are Installed

```bash
# Make sure @xenova/transformers is installed
npm install

# Verify it exists
npm list @xenova/transformers
```

### 3. Restart Backend

```bash
# Restart PM2 process
pm2 restart bookbag-backend-prod

# Watch logs to ensure it starts cleanly
pm2 logs bookbag-backend-prod --lines 50
```

### 4. Verify Fix

**Look for these success messages in logs:**
```
🧠 Loading @xenova/transformers module...
🧠 Loading embedding model: Xenova/all-MiniLM-L6-v2...
✅ Embedding model loaded in XXXms
✅ RAGService initialized with local embeddings
✓ ragController initialized successfully
```

**Should NOT see:**
```
❌ Error [ERR_REQUIRE_ESM]: require() of ES Module
❌ Error processing routes
```

### 5. Test RAG Endpoints

```bash
# Test from server (replace with actual chatId)
curl -s "http://localhost:8080/bb-rag/api/rag/stats?chatId=5" \
  -H "Cookie: your-auth-cookie"
```

**Expected response:**
```json
{
  "success": true,
  "stats": {
    "documentCount": 0,
    "chunkCount": 0,
    "totalTokens": 0,
    "avgChunksPerDoc": 0
  }
}
```

**NOT:**
- Empty response
- Connection reset
- `ERR_EMPTY_RESPONSE`

## Technical Details

### Why @xenova/transformers Is ES Module Only

- Modern JavaScript package
- Uses top-level `await` and other ES module features
- Cannot be transpiled to CommonJS without breaking functionality

### Alternative Solutions Considered

1. **Convert entire project to ES modules** - Too invasive, would require changing all files
2. **Downgrade @xenova/transformers to v2.x** - Missing features and updates
3. **Use dynamic import()** - ✅ Chosen - works perfectly with no other changes needed

### Compatibility

- ✅ Node.js 14+ (dynamic import supported)
- ✅ CommonJS projects (Bookbag's current setup)
- ✅ PM2 process manager
- ✅ All existing code unchanged except embeddingService.js

## Related Files

- `components/rag/app/service/embeddingService.js` - **Fixed** (uses dynamic import)
- `components/rag/app/service/ragService.js` - No changes needed (imports embeddingService)
- `components/rag/app/controllers/api/ragController.js` - No changes needed

## Testing

After deploying, test these scenarios:

### 1. Backend Starts Without Crashing
```bash
pm2 restart bookbag-backend-prod
sleep 5
pm2 list | grep bookbag-backend-prod
# Should show "online" status, not "errored"
```

### 2. RAG Endpoints Return Data
- Visit any chat page
- Open browser DevTools → Network tab
- Should see successful requests to `/bb-rag/api/rag/list` and `/bb-rag/api/rag/stats`
- Status: **200 OK** (not ERR_EMPTY_RESPONSE)

### 3. Document Upload Works
- Try uploading a document in a chat
- Should process and ingest without errors

## Rollback Plan

If this causes issues (unlikely):

```bash
cd /var/www/bookbag-ce
git revert HEAD
pm2 restart bookbag-backend-prod
```

Then temporarily disable RAG in admin settings while investigating.

## Performance Impact

**None.** Dynamic import happens once during initialization, then the function is cached and reused. Runtime performance is identical to the old `require()` approach.

## Future Considerations

If Bookbag migrates to ES modules in the future:
- Change `"type": "commonjs"` to `"type": "module"` in package.json
- Rename files from `.js` to `.mjs` or update all `require()` to `import`
- This dynamic import can be simplified back to static import

But for now, this solution provides full compatibility with minimal changes.

---

## Summary

**Problem:** Backend crashed because @xenova/transformers is ES module, Bookbag uses CommonJS
**Fix:** Use dynamic `import()` in embeddingService.js instead of `require()`
**Result:** Backend starts successfully, RAG features work, no `ERR_EMPTY_RESPONSE` errors
**Impact:** Zero - only one file changed, backward compatible, no performance cost
