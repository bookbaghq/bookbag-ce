# Deploy Script Documentation

## What is `deploy.sh`?

`deploy.sh` is an **automated deployment script** that sets up and runs the entire Bookbag CE application (backend + frontend) with a single command.

---

## What Does It Do?

The script performs these tasks automatically:

### 1. **Checks PM2 Installation**
- Detects if PM2 is installed
- Works with or without PM2
- Recommends PM2 for production

### 2. **Asks for Deployment Mode**
- **Development**: Hot reload, faster startup
- **Production**: Optimized build, better performance

### 3. **Asks for Backend URL**
- Prompts for your backend URL
- Auto-adds `http://` if missing
- Example: `147.182.251.85:8080` → `http://147.182.251.85:8080`

### 4. **Auto-Configures CORS**
- Calculates frontend URL (port 3000)
- Updates `config/initializers/cors.json`
- Prevents duplicates (won't add same URL twice)
- Supports multiple origins

### 5. **Installs Dependencies**
- Backend: `npm install` in root
- Frontend: `npm install` in `nextjs-app/`

### 6. **Builds Frontend (Production Only)**
- Runs `npm run build` in production mode
- Skips in development mode (uses hot reload)

### 7. **Starts Services**
- **With PM2**: Background processes, auto-restart
- **Without PM2**: Foreground processes, manual management

---

## Platform Compatibility

### ✅ **Windows: YES** (PowerShell Script)

**We now have `deploy.ps1` for native Windows support!**

- ✅ PowerShell script (`.ps1` file)
- ✅ All features from Bash version
- ✅ Colors and formatting work
- ✅ Auto-CORS configuration
- ✅ PM2 support (optional)

**Run with:**
```powershell
npm run deploy:windows
```

### ✅ **macOS: YES** (Bash Script)
- ✅ Has Bash by default
- ✅ All Unix commands available
- ✅ Colors and formatting work
- ✅ No issues

**Run with:**
```bash
npm run deploy
```

### ✅ **Linux: YES** (Bash Script)
- ✅ Has Bash by default
- ✅ All Unix commands available
- ✅ Colors and formatting work
- ✅ No issues

**Run with:**
```bash
npm run deploy
```

---

## Additional Windows Options

### Option 1: Native PowerShell (Recommended) ✅

**Use the included PowerShell script:**

```powershell
# In PowerShell
npm run deploy:windows
```

**Features:**
- ✅ Same functionality as Bash version
- ✅ Auto-CORS configuration
- ✅ Colors and formatting
- ✅ PM2 support (optional)

### Option 2: Use WSL (Windows Subsystem for Linux)

**Alternative for Linux environment:**

```bash
# In WSL Ubuntu/Debian terminal
cd /mnt/c/path/to/bookbag-ce
npm run deploy
```

**Pros:**
- ✅ Uses Bash script
- ✅ Full Linux environment

### Option 3: Use Git Bash

**Included with Git for Windows:**

```bash
# In Git Bash terminal
cd /c/path/to/bookbag-ce
bash deploy.sh
```

**Note:** PowerShell script is now recommended over Git Bash

---

## How to Use

### On Windows (PowerShell):

```powershell
# Run deployment
npm run deploy:windows

# Or directly (if execution policy allows)
.\deploy.ps1
```

**Note:** If you get an execution policy error:
```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

### On macOS/Linux:

```bash
# Make executable (first time only)
chmod +x deploy.sh

# Run deployment
npm run deploy

# Or directly
./deploy.sh
```

### On Windows (WSL):

```bash
# In WSL terminal
npm run deploy
```

---

## What Happens Step-by-Step

### Example Run:

```bash
$ npm run deploy

🚀 Starting Bookbag CE Deployment...

Select deployment mode:
  1) Development (with hot reload)
  2) Production (optimized build)

Enter your choice (1 or 2) [default: 2]: 2

📦 Deploying in PRODUCTION mode

Enter your backend URL (e.g., http://your-server-ip:8080): 147.182.251.85:8080

📦 Backend URL: http://147.182.251.85:8080
🔒 Updating CORS configuration...
✅ CORS updated: Added http://147.182.251.85:3000 to whitelist

📦 Installing backend dependencies...
✅ Backend dependencies installed

📦 Installing frontend dependencies...
✅ Frontend dependencies installed

🏗️  Building frontend...
✅ Frontend built successfully

🚀 Starting services with PM2 (production mode)...
✅ Services started in production mode

💾 Saving PM2 configuration...
✅ PM2 configuration saved

📊 PM2 Status:
┌─────┬────────────────────┬─────────┬─────────┐
│ id  │ name               │ status  │ cpu     │
├─────┼────────────────────┼─────────┼─────────┤
│ 0   │ bookbag-backend    │ online  │ 0%      │
│ 1   │ bookbag-frontend   │ online  │ 0%      │
└─────┴────────────────────┴─────────┴─────────┘

⚙️  To enable PM2 to restart on server reboot, run:
   pm2 startup
   (Then copy and run the command it outputs)

✨ Deployment completed successfully!

📝 Quick Commands:
   View logs:    pm2 logs
   Restart all:  pm2 restart all
   Stop all:     pm2 stop all
   Monitor:      pm2 monit

🌐 Access your application:
   Frontend: http://localhost:3000
   Backend:  http://localhost:8080
```

---

## Technical Details

### Technologies Used:
- **Shell**: Bash (#!/bin/bash)
- **Colors**: ANSI escape codes
- **Commands**: grep, sed, node, npm
- **Error Handling**: `set -e` (exit on error)
- **JSON Parsing**: Node.js inline scripts

### Files Modified:
- `config/initializers/cors.json` - CORS whitelist
- `nextjs-app/.next/` - Built frontend (production)

### Environment Variables:
- `NEXT_PUBLIC_BACKEND_URL` - Backend API URL
- `master` - Deployment environment (development/production)

---

## Troubleshooting

### Script Won't Run on Windows

**Error:**
```
'bash' is not recognized as an internal or external command
```

**Solution:**
- Install WSL or Git Bash
- Or use manual deployment (see Option 3 above)

### Permission Denied (macOS/Linux)

**Error:**
```
bash: ./deploy.sh: Permission denied
```

**Solution:**
```bash
chmod +x deploy.sh
```

### CORS Not Updating

**Issue:** CORS not being added automatically

**Solution:**
```bash
# Manual update
npm run update-cors http://your-frontend-url:3000
```

### PM2 Not Found

**Issue:** Script warns about PM2

**Solution:**
```bash
# Install PM2 globally
npm install -g pm2

# Or continue without PM2 (works fine)
```

---

## Summary

| Platform | Compatible | Command | Script File |
|----------|-----------|---------|-------------|
| **Windows** | ✅ YES | `npm run deploy:windows` | `deploy.ps1` (PowerShell) |
| **macOS** | ✅ YES | `npm run deploy` | `deploy.sh` (Bash) |
| **Linux** | ✅ YES | `npm run deploy` | `deploy.sh` (Bash) |

**All platforms now fully supported!**

- ✅ Windows: Native PowerShell script
- ✅ macOS/Linux: Bash script
- ✅ Same features on all platforms
- ✅ Auto-CORS configuration
- ✅ PM2 support (optional)

**The deployment is now fully cross-platform!**

