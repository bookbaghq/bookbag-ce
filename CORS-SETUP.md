# CORS Configuration Guide

## Overview

The backend uses CORS (Cross-Origin Resource Sharing) to control which frontend origins can access the API. This is configured in `config/initializers/cors.json`.

---

## The Problem You Had

**Error:**
```
Access to fetch at 'http://127.0.0.1:8080/bb-user/api/auth/can-login' from origin 'http://147.182.251.85:3000' 
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

**Causes:**
1. Empty `origin` array in `cors.json`
2. Backend URL missing `http://` protocol prefix

---

## Automatic CORS Setup

The `npm run deploy` script now **automatically**:
1. ✅ Extracts frontend URL from `NEXT_PUBLIC_BACKEND_URL`
2. ✅ Updates `cors.json` with the frontend origin
3. ✅ Ensures URL has proper `http://` or `https://` prefix

**Example:**
```bash
# If you set backend URL to http://147.182.251.85:8080
# Script automatically sets CORS origin to http://147.182.251.85:3000

npm run deploy
```

---

## Manual CORS Update

### Method 1: Use the Update Script

```bash
# Update CORS with your frontend URL
npm run update-cors http://147.182.251.85:3000

# Or directly
node scripts/update-cors.js http://147.182.251.85:3000
```

### Method 2: Edit JSON Directly

Edit `config/initializers/cors.json`:

```json
{
    "origin": ["http://147.182.251.85:3000"],
    "methods": ["GET","HEAD","POST","DELETE","PUT","PATCH", "OPTIONS"],
    "allowedHeaders": "Content-Type",
    "exposeHeaders": false,
    "credentials": true,
    "maxAge": 90
}
```

**Multiple Origins:**
```json
{
    "origin": [
        "http://localhost:3000",
        "http://147.182.251.85:3000",
        "https://yourdomain.com"
    ],
    ...
}
```

---

## Common Scenarios

### Local Development
```bash
# CORS origin: http://localhost:3000
export NEXT_PUBLIC_BACKEND_URL=http://localhost:8080
npm run deploy
```

**Result in `cors.json`:**
```json
{
    "origin": ["http://localhost:3000"],
    ...
}
```

### Production Server (IP)
```bash
# CORS origin: http://147.182.251.85:3000
export NEXT_PUBLIC_BACKEND_URL=http://147.182.251.85:8080
npm run deploy
```

**Result in `cors.json`:**
```json
{
    "origin": ["http://147.182.251.85:3000"],
    ...
}
```

### Production Server (Domain)
```bash
# CORS origin: https://yourdomain.com
export NEXT_PUBLIC_BACKEND_URL=https://api.yourdomain.com
npm run deploy
```

**Result in `cors.json`:**
```json
{
    "origin": ["https://yourdomain.com"],
    ...
}
```

---

## Troubleshooting

### Issue 1: Still Getting CORS Errors

**Check:**
1. Backend URL has proper protocol:
   ```bash
   echo $NEXT_PUBLIC_BACKEND_URL
   # Should be: http://147.182.251.85:8080
   # NOT: 147.182.251.85:8080 (missing http://)
   ```

2. CORS config has frontend URL (port 3000):
   ```bash
   cat config/initializers/cors.json
   # Should have: "origin": ["http://147.182.251.85:3000"]
   ```

3. Restart backend after CORS changes:
   ```bash
   npm run pm2:restart
   # OR
   npm run deploy
   ```

### Issue 2: Wrong URL Construction

**Error:**
```
GET http://147.182.251.85:3000/bb-auth/147.182.251.85:8080/bb-user/api/auth/currentuser 404
```

**Cause:** `NEXT_PUBLIC_BACKEND_URL` set without protocol

**Fix:**
```bash
# Wrong
export NEXT_PUBLIC_BACKEND_URL=147.182.251.85:8080

# Correct
export NEXT_PUBLIC_BACKEND_URL=http://147.182.251.85:8080
```

The deploy script now auto-adds `http://` if missing!

### Issue 3: Multiple Environments

If you need to whitelist multiple origins (local + production):

```bash
# Add first origin
npm run update-cors http://localhost:3000

# Add second origin
npm run update-cors http://147.182.251.85:3000

# Result:
cat config/initializers/cors.json
# "origin": ["http://localhost:3000", "http://147.182.251.85:3000"]
```

---

## How It Works

### Deploy Script Process:

1. **Get Backend URL:**
   ```
   NEXT_PUBLIC_BACKEND_URL=http://147.182.251.85:8080
   ```

2. **Ensure Protocol:**
   ```bash
   # If missing http://, adds it automatically
   ```

3. **Extract Frontend URL:**
   ```bash
   # Replace port :8080 with :3000
   FRONTEND_ORIGIN=http://147.182.251.85:3000
   ```

4. **Update CORS:**
   ```json
   {
       "origin": ["http://147.182.251.85:3000"]
   }
   ```

5. **Backend Reads on Startup:**
   - Allows requests from `http://147.182.251.85:3000`
   - Blocks all other origins

---

## Best Practices

1. **Always use full URLs with protocol:**
   ```bash
   ✅ http://147.182.251.85:8080
   ❌ 147.182.251.85:8080
   ```

2. **Update CORS before starting backend:**
   ```bash
   npm run update-cors http://your-frontend-url:3000
   npm run deploy
   ```

3. **Use environment-specific CORS:**
   - Development: `http://localhost:3000`
   - Production: `https://yourdomain.com`

4. **Never use `*` (wildcard) in production:**
   ```json
   {
       "origin": "*"  // ❌ INSECURE for production
   }
   ```

5. **Keep `credentials: true` for cookies/sessions:**
   ```json
   {
       "credentials": true  // ✅ Required for authentication
   }
   ```

---

## Quick Commands

```bash
# View current CORS config
cat config/initializers/cors.json

# Update CORS for local development
npm run update-cors http://localhost:3000

# Update CORS for server IP
npm run update-cors http://147.182.251.85:3000

# Update CORS for domain
npm run update-cors https://yourdomain.com

# Deploy (auto-updates CORS)
export NEXT_PUBLIC_BACKEND_URL=http://147.182.251.85:8080
npm run deploy
```

---

## Summary

✅ **Deploy script now auto-configures CORS**  
✅ **Adds `http://` prefix if missing**  
✅ **Manual update available: `npm run update-cors <url>`**  
✅ **Supports multiple origins**  
✅ **Backend must restart to apply changes**

