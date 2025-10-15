# Deployment Port Default Fix

## Problem
When running `npm run deploy` and entering just an IP address without a port (e.g., `147.182.251.85`), the deployment script was defaulting to port `80` for HTTP connections. This caused issues because:

1. The Bookbag backend runs on port `8080`, not `80`
2. The frontend would receive a backend URL like `http://147.182.251.85:80`
3. Browsers strip `:80` from HTTP URLs (it's the default), resulting in requests to `http://147.182.251.85/bb-user/api/auth/currentuser`
4. The backend wasn't actually listening on port `80`, so all API calls failed

### Example of the Problem

**Input during deployment:**
```
Enter your backend URL: 147.182.251.85
```

**Old behavior:**
- Script added `http://` → `http://147.182.251.85`
- Script defaulted to port `80` → `http://147.182.251.85:80`
- Saved to `apiConfig.json` as `"main": "http://147.182.251.85:80"`
- Browser stripped `:80` → Requests went to `http://147.182.251.85/...` (port 80)
- **Backend was actually on port 8080** ❌

## Solution
Updated both deployment scripts (`deploy.sh` and `deploy.ps1`) to default to port `8080` (Bookbag's actual backend port) when no port is specified, instead of the standard HTTP port `80`.

## Changes Made

### 1. **deploy.sh** (macOS/Linux)

**Before:**
```bash
if [[ "$BACKEND_HOSTPORT" == *:* ]]; then
    BACKEND_PORT="${BACKEND_HOSTPORT##*:}"
else
    if [ "$BACKEND_SCHEME" = "https" ]; then BACKEND_PORT=443; else BACKEND_PORT=80; fi
fi
```

**After:**
```bash
if [[ "$BACKEND_HOSTPORT" == *:* ]]; then
    BACKEND_PORT="${BACKEND_HOSTPORT##*:}"
else
    # Default to 8080 for HTTP, 443 for HTTPS (Bookbag backend runs on 8080, not 80)
    if [ "$BACKEND_SCHEME" = "https" ]; then BACKEND_PORT=443; else BACKEND_PORT=8080; fi

    # Add the port to the URL if it wasn't included
    export NEXT_PUBLIC_BACKEND_URL="${NEXT_PUBLIC_BACKEND_URL%/}:${BACKEND_PORT}"
    echo -e "${YELLOW}⚠️  No port specified in URL, defaulting to :${BACKEND_PORT}${NC}"
    echo -e "${GREEN}✅ Updated Backend URL: $NEXT_PUBLIC_BACKEND_URL${NC}"
fi
```

### 2. **deploy.ps1** (Windows PowerShell)

**Added:**
```powershell
# Check if port is specified, if not add default port 8080
if ($env:NEXT_PUBLIC_BACKEND_URL -notmatch ':\d+$') {
    # Determine default port based on protocol
    if ($env:NEXT_PUBLIC_BACKEND_URL -match '^https://') {
        $defaultPort = "443"
    } else {
        $defaultPort = "8080"
    }

    $env:NEXT_PUBLIC_BACKEND_URL = "$($env:NEXT_PUBLIC_BACKEND_URL):$defaultPort"
    Write-Host "⚠️  No port specified in URL, defaulting to :$defaultPort" -ForegroundColor Yellow
}
```

## New Behavior

### Example Inputs and Results

**Input: Just IP address**
```
Enter your backend URL: 147.182.251.85
```
**Result:**
- Script adds `http://` → `http://147.182.251.85`
- Script adds `:8080` → `http://147.182.251.85:8080` ✅
- Saved to `apiConfig.json` as `"main": "http://147.182.251.85:8080"`
- Browser keeps `:8080` → Requests go to `http://147.182.251.85:8080/...` ✅

**Input: IP with custom port**
```
Enter your backend URL: 147.182.251.85:9000
```
**Result:**
- Script adds `http://` → `http://147.182.251.85:9000`
- Script detects port already specified, doesn't add default ✅
- Saved to `apiConfig.json` as `"main": "http://147.182.251.85:9000"`

**Input: Full URL with port**
```
Enter your backend URL: http://147.182.251.85:8080
```
**Result:**
- Script detects full URL, no changes needed ✅
- Saved to `apiConfig.json` as `"main": "http://147.182.251.85:8080"`

**Input: HTTPS without port**
```
Enter your backend URL: https://api.example.com
```
**Result:**
- Script detects HTTPS → Defaults to port `443` ✅
- Saved to `apiConfig.json` as `"main": "https://api.example.com:443"`

**Input: Empty (press Enter)**
```
Enter your backend URL: [Enter]
```
**Result:**
- Uses detected network IP with port 8080: `http://192.168.1.100:8080` ✅

## Port Defaults

| Protocol | Default Port | Reason |
|----------|--------------|--------|
| `http://` | `8080` | Bookbag backend default port |
| `https://` | `443` | Standard HTTPS port |

## User Experience

When deploying, users will now see clear feedback:

```bash
🚀 Starting Bookbag CE Deployment...

Select deployment mode:
  1) Development (with hot reload)
  2) Production (optimized build)

Enter your choice (1 or 2) [default: 2]: 2

Enter your backend URL (e.g., http://your-server-ip:8080) [default: http://192.168.1.100:8080]: 147.182.251.85

⚠️  No port specified in URL, defaulting to :8080
✅ Updated Backend URL: http://147.182.251.85:8080
```

## Why Port 8080?

Bookbag uses port `8080` as its default backend port because:

1. **Non-privileged port**: Ports below 1024 (like 80 and 443) require root/administrator privileges
2. **Development-friendly**: Easy to run without sudo/admin rights
3. **Common alternative**: Port 8080 is the standard alternative HTTP port
4. **No conflicts**: Less likely to conflict with other services (like system web servers on port 80)

## Reverse Proxy Setup

If you're using a reverse proxy (Nginx, Apache, etc.) to serve on port 80 or 443, you should still enter the full URL with the correct port:

```bash
# If Nginx proxies port 80 to backend port 8080
Enter your backend URL: http://147.182.251.85:8080

# If using HTTPS with Nginx on 443 proxying to 8080
Enter your backend URL: https://147.182.251.85
# (Will default to 443, which is correct for the frontend to connect to)
```

## Migration Notes

**No action required!** If you've already deployed:

1. The fix only affects **new deployments**
2. Existing `apiConfig.json` files are not modified
3. If you had the wrong port configured, just run `npm run deploy` again and enter the correct URL

## Verification

After deployment, verify the correct port is configured:

```bash
# Check apiConfig.json on the server
cat nextjs-app/apiConfig.json

# Should show:
{
  "ApiConfig": {
    "main": "http://147.182.251.85:8080",  // ✅ Port 8080, not 80
    ...
  }
}
```

## Troubleshooting

### Issue: API calls still fail after fix
**Solution**: Ensure your backend is actually running on port 8080

```bash
# Check if backend is listening on port 8080
pm2 logs bookbag-backend-prod
# or
lsof -i :8080
# or
netstat -tuln | grep 8080
```

### Issue: Want to use a different port
**Solution**: Just specify it when deploying

```bash
Enter your backend URL: http://your-server-ip:9000
```

### Issue: Using reverse proxy on port 80
**Solution**: Your reverse proxy config should proxy to backend port 8080

**Nginx example:**
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:8080;  # Backend on 8080
        proxy_set_header Host $host;
    }
}
```

Enter during deployment: `http://your-domain.com` (will add :8080 automatically)
