# Running Without PM2 - Local Development Guide

## 🚀 Quick Start (No PM2 Required)

The deployment script automatically detects if PM2 is installed and adapts accordingly!

### **Option 1: Use Deploy Script (Recommended)**

```bash
# Set backend URL
export NEXT_PUBLIC_BACKEND_URL=http://localhost:8080

# Run deploy script
npm run deploy
# Choose 1 for dev or 2 for prod
```

**What happens without PM2:**
- ⚠️  Shows a warning about PM2
- ✅ Continues with standard Node.js
- 🚀 Starts backend in background
- 🚀 Starts frontend in foreground
- 📝 Shows PIDs for process management

---

### **Option 2: Manual Setup (Two Terminals)**

**Terminal 1 - Backend:**
```bash
npm run dev              # Development mode
# OR
npm run prod             # Production mode
# OR
npm run start:backend:dev    # Development
npm run start:backend        # Production
```

**Terminal 2 - Frontend:**
```bash
cd nextjs-app

# Development (with hot reload)
npm run dev

# Production (must build first)
npm run build
npm start
```

---

### **Option 3: Background Processes**

**Start Backend in Background:**
```bash
# Development
master=development node server.js > log/backend.log 2>&1 &
echo $! > log/backend.pid

# Production
master=production node server.js > log/backend.log 2>&1 &
echo $! > log/backend.pid
```

**Start Frontend:**
```bash
cd nextjs-app
npm run dev    # Development
# OR
npm start      # Production (after build)
```

**Stop Backend:**
```bash
kill $(cat log/backend.pid)
rm log/backend.pid
```

---

## 📊 Comparison: With vs Without PM2

| Feature | With PM2 | Without PM2|
|---------|----------|-------------|
| **Auto-restart** | ✅ Yes | ❌ No |
| **Background run** | ✅ Yes | ⚠️ Manual |
| **Log management** | ✅ Built-in | 📝 Manual redirect |
| **Monitoring** | ✅ `pm2 monit` | ❌ No |
| **Multiple instances** | ✅ Easy | ❌ Complex |
| **Reboot persistence** | ✅ `pm2 startup` | ❌ No |
| **Easy to use** | ✅ Simple | ⚠️ More manual |
| **Installation** | Requires `npm i -g pm2` | ✅ Built-in Node.js |

---

## 🎯 Recommended Setups

### **Local Development (Your Computer)**
```bash
# Terminal 1: Backend
npm run dev

# Terminal 2: Frontend
cd nextjs-app && npm run dev
```
**Why?** Simple, see logs in real-time, easy to stop (Ctrl+C)

### **Server Deployment**
```bash
# Install PM2 first (one-time)
npm install -g pm2

# Then deploy
npm run deploy
```
**Why?** Auto-restart, run in background, survive server reboot

### **Testing Without PM2**
```bash
# Just run the deploy script
export NEXT_PUBLIC_BACKEND_URL=http://localhost:8080
npm run deploy
# It will work without PM2!
```

---

## 🛠️ Process Management Without PM2

### **View Running Processes:**
```bash
ps aux | grep node
```

### **Find Backend Process:**
```bash
lsof -i :8080
```

### **Find Frontend Process:**
```bash
lsof -i :3000
```

### **Kill Process by Port:**
```bash
# Kill backend (port 8080)
kill $(lsof -t -i:8080)

# Kill frontend (port 3000)
kill $(lsof -t -i:3000)
```

### **View Logs:**
```bash
# Backend logs
tail -f log/backend.log

# Development logs
tail -f log/development.log
```

---

## ⚡ Quick Commands Without PM2

### **Start Everything (Development)**
```bash
# In one terminal (runs both)
export NEXT_PUBLIC_BACKEND_URL=http://localhost:8080
npm run deploy
# Choose option 1
```

### **Start Manually (Two Terminals)**
```bash
# Terminal 1
npm run start:backend:dev

# Terminal 2
cd nextjs-app && npm run dev
```

### **Start Production (Manual)**
```bash
# Build frontend first
cd nextjs-app
npm run build
cd ..

# Terminal 1: Backend
npm run start:backend

# Terminal 2: Frontend
cd nextjs-app && npm start
```

---

## 🔍 Troubleshooting Without PM2

### **Port Already in Use**
```bash
# Find what's using the port
lsof -i :8080
lsof -i :3000

# Kill the process
kill -9 <PID>
```

### **Backend Won't Start**
```bash
# Check logs
tail -f log/backend.log
tail -f log/development.log

# Check JWT secrets
cat config/environments/env.development.json | grep -A 3 "jwtAPI"
```

### **Frontend Build Errors**
```bash
cd nextjs-app
rm -rf .next node_modules
npm install
npm run build
```

### **Stop All Processes**
```bash
# Kill by port
kill $(lsof -t -i:8080)  # Backend
kill $(lsof -t -i:3000)  # Frontend

# Or kill all node processes (careful!)
killall node
```

---

## 💡 When to Use PM2 vs Without

### **Use PM2 When:**
- ✅ Deploying to a server
- ✅ Need auto-restart on crashes
- ✅ Want background processes
- ✅ Need process monitoring
- ✅ Multiple environments on one server

### **Don't Need PM2 When:**
- ✅ Local development on your computer
- ✅ Just testing the app
- ✅ Learning/exploring the codebase
- ✅ Running in terminals you're watching
- ✅ Using Docker (has its own process management)

---

## 📝 Summary

**The deploy script is smart:**
- Detects if PM2 is installed
- Works with or without PM2
- Gives appropriate instructions for each case
- Shows how to manage processes

**For local development:**
```bash
npm run deploy
# Just press Enter and it works!
```

**For servers, install PM2 for better experience:**
```bash
npm install -g pm2
npm run deploy
```

Both ways work perfectly! 🎉

