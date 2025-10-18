# RAG Server Troubleshooting Guide

## Problem: ERR_EMPTY_RESPONSE on Server (Works Locally)

If your RAG endpoints (`/bb-rag/api/rag/list`, `/bb-rag/api/rag/stats`, etc.) return `ERR_EMPTY_RESPONSE` on your Ubuntu DigitalOcean server but work fine locally, this guide will help you diagnose and fix the issue.

### Symptoms
- Frontend shows: `Failed to load resource: net::ERR_EMPTY_RESPONSE`
- Browser console: `TypeError: Failed to fetch`
- RAG features work perfectly on local development machine
- Backend process may be crashing silently when RAG endpoints are accessed

---

## Root Causes and Solutions

### 1. Missing Dependencies

The most common cause is that `@xenova/transformers` or other RAG dependencies are not installed on the server.

**Check:**
```bash
# SSH into your server
cd /path/to/bookbag-ce

# Check if dependencies are installed
npm list @xenova/transformers
npm list @langchain/textsplitters
```

**Fix:**
```bash
# Install all dependencies
npm install

# Or specifically install missing packages
npm install @xenova/transformers @langchain/textsplitters
```

**Verify:**
```bash
# Check node_modules
ls -la node_modules/@xenova
ls -la node_modules/@langchain
```

---

### 2. Backend Crash During Model Initialization

The `@xenova/transformers` library downloads AI models (all-MiniLM-L6-v2, ~80MB) on first use. If this download fails or times out, the backend crashes.

**Check Backend Logs:**
```bash
# If using PM2
pm2 logs bookbag-backend-prod --lines 100

# If running manually
tail -f log/backend.log

# Look for:
# ❌ Failed to load embedding model
# ❌ Failed to initialize RAGService
```

**Common Model Download Issues:**

#### a) Network/Firewall Issues
The server needs to download models from Hugging Face CDN:
```bash
# Test connectivity
curl -I https://huggingface.co
curl -I https://cdn-lfs.huggingface.co
```

If blocked, you may need to:
- Configure firewall rules
- Set up proxy settings
- Pre-download models (see below)

#### b) Timeout During Download
If the download is too slow:
```bash
# Check available bandwidth
speedtest-cli

# Monitor download
pm2 logs bookbag-backend-prod --lines 0 --raw
```

The model initialization now has a 30-second timeout. If it fails, check your network speed.

#### c) Pre-download Models (Offline Deployment)

If your server has limited internet or you want faster startup:

**On your local machine:**
```bash
# Download the model cache
cd bookbag-ce
node -e "
const { pipeline } = require('@xenova/transformers');
(async () => {
  console.log('Downloading model...');
  const pipe = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  console.log('Model downloaded successfully!');
})();
"
```

This downloads models to: `~/.cache/huggingface/` (Linux/Mac) or `%USERPROFILE%\.cache\huggingface\` (Windows)

**Transfer to server:**
```bash
# Compress the cache
cd ~/.cache
tar -czf huggingface-models.tar.gz huggingface/

# Copy to server
scp huggingface-models.tar.gz user@your-server:/tmp/

# On server, extract
ssh user@your-server
mkdir -p ~/.cache
cd ~/.cache
tar -xzf /tmp/huggingface-models.tar.gz
```

---

### 3. Insufficient Memory

The embedding model requires ~300MB of RAM. If your server is low on memory, Node.js may crash.

**Check Memory:**
```bash
# Check available memory
free -h

# Check Node.js process memory
ps aux | grep node

# Monitor during startup
watch -n 1 free -h
```

**Recommended:** At least 1GB free RAM for smooth operation.

**Fix if Low on Memory:**

#### a) Increase Server RAM (DigitalOcean)
Upgrade your droplet to have at least 2GB total RAM.

#### b) Add Swap Space
```bash
# Create 2GB swap
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Make permanent
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

#### c) Disable RAG (Temporary Workaround)
See section 7 below.

---

### 4. Permission Issues

The model cache directory needs write permissions.

**Check:**
```bash
# Check cache directory permissions
ls -la ~/.cache/huggingface/

# Check who runs the Node.js process
ps aux | grep node
```

**Fix:**
```bash
# Ensure the user running Node.js owns the cache
sudo chown -R $USER:$USER ~/.cache/huggingface/

# Or create directory with correct permissions
mkdir -p ~/.cache/huggingface
chmod 755 ~/.cache/huggingface
```

---

### 5. Disk Space Issues

Model downloads require ~500MB of disk space.

**Check:**
```bash
# Check disk space
df -h

# Check cache directory
du -sh ~/.cache/huggingface/
```

**Fix:**
```bash
# Free up space (be careful!)
sudo apt-get clean
sudo apt-get autoremove

# Or upgrade storage on DigitalOcean
```

---

### 6. Node.js Version Compatibility

`@xenova/transformers` requires Node.js 16 or higher.

**Check:**
```bash
node --version
```

**Should be:** v16.x.x or higher (v18+ recommended)

**Fix:**
```bash
# Update Node.js using nvm
nvm install 18
nvm use 18
nvm alias default 18

# Or using apt (Ubuntu)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

---

### 7. Disable RAG (Temporary Workaround)

If you need the application running immediately while troubleshooting:

**Option A: Admin Settings**
1. Log into Bookbag admin panel
2. Go to **RAG Settings** (`/bb-admin/rag/settings`)
3. Enable "Disable RAG System Entirely"
4. Restart backend

**Option B: Environment Variable**
```bash
# Add to your PM2 config or .env
DISABLE_RAG=true

# Restart
pm2 restart bookbag-backend-prod
```

---

## Verification Steps

After applying fixes, verify RAG is working:

### 1. Check Backend Logs
```bash
pm2 logs bookbag-backend-prod --lines 50
```

**Look for:**
```
✅ Embedding model loaded in XXXms
✅ RAGService initialized
✓ ragController initialized successfully
```

**Should NOT see:**
```
❌ Failed to load embedding model
❌ Failed to initialize RAGService
⚠️  RAG services unavailable
```

### 2. Test RAG Endpoints

**Test stats endpoint:**
```bash
# Replace with your actual backend URL and get a valid auth cookie first
curl -s "http://147.182.251.85:8080/bb-rag/api/rag/stats?chatId=5" \
  -H "Cookie: your-auth-cookie"
```

**Expected Success Response:**
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

**Expected Warning Response (if RAG unavailable):**
```json
{
  "success": true,
  "stats": { "documentCount": 0, ... },
  "warning": "RAG service is temporarily unavailable",
  "serviceError": "RAG service initialization failed - check if @xenova/transformers is installed"
}
```

### 3. Test in Browser
1. Open your Bookbag frontend
2. Navigate to a chat
3. Open browser DevTools → Network tab
4. Look for requests to `/bb-rag/api/rag/list` and `/bb-rag/api/rag/stats`
5. Should return **200 OK** (not ERR_EMPTY_RESPONSE)

---

## Recent Improvements (Latest Version)

We've added comprehensive error handling to prevent crashes:

1. **Graceful Degradation**: RAG endpoints return empty results instead of crashing
2. **Detailed Logging**: Backend logs show exactly where initialization fails
3. **Service Availability Checks**: Frontend receives warnings when RAG is unavailable
4. **30-Second Timeout**: Model downloads timeout after 30s instead of hanging indefinitely

**Update to latest version:**
```bash
cd /path/to/bookbag-ce
git pull origin main
npm install
pm2 restart bookbag-backend-prod
```

---

## Still Having Issues?

### Get Detailed Diagnostic Info

Run this on your server:
```bash
cd /path/to/bookbag-ce

echo "=== System Info ==="
uname -a
node --version
npm --version

echo -e "\n=== Memory ==="
free -h

echo -e "\n=== Disk Space ==="
df -h

echo -e "\n=== Dependencies ==="
npm list @xenova/transformers @langchain/textsplitters

echo -e "\n=== Cache Directory ==="
ls -lah ~/.cache/huggingface/ 2>/dev/null || echo "Cache directory does not exist"

echo -e "\n=== Recent Backend Logs ==="
pm2 logs bookbag-backend-prod --lines 30 --nostream
```

Share the output when asking for help.

---

## Quick Fix Checklist

- [ ] Run `npm install` on the server
- [ ] Check `pm2 logs` for initialization errors
- [ ] Verify Node.js version is 16+
- [ ] Ensure at least 1GB free RAM
- [ ] Test connectivity to `huggingface.co`
- [ ] Check disk space (need ~500MB free)
- [ ] Verify cache directory permissions
- [ ] Consider pre-downloading models for offline use
- [ ] Update to latest Bookbag version with improved error handling

---

## Why It Works Locally But Not On Server

Common reasons:
1. **Dependencies not installed on server** - forgot to run `npm install`
2. **Different Node.js versions** - local is newer, server is older
3. **Network restrictions** - server can't reach Hugging Face CDN
4. **Less RAM on server** - model can't load in limited memory
5. **PM2 restart limits** - PM2 keeps restarting crashed process too fast
6. **Cached models on local** - models already downloaded locally, server tries to download fresh

---

## Performance Notes

After successful initialization:
- **First startup**: 10-30 seconds (downloads ~80MB model)
- **Subsequent startups**: 1-3 seconds (uses cached model)
- **Memory usage**: ~300MB per process
- **Embedding generation**: ~50-200ms per document chunk

The embedding service is fully local and requires no external API calls once initialized.
