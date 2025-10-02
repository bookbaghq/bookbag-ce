# Deployment Modes - Quick Reference

## 🎯 Three Ways to Deploy

### 1️⃣ **Interactive Deployment (Recommended)**
```bash
npm run deploy
```
The script will ask you:
```
Select deployment mode:
  1) Development (with hot reload)
  2) Production (optimized build)

Enter your choice (1 or 2) [default: 2]:
```
- Choose **1** for development (faster, with hot reload)
- Choose **2** for production (optimized, requires build)
- Press **Enter** for default (production)

---

### 2️⃣ **Direct Deployment Commands**

**Development Mode:**
```bash
npm run deploy:dev
```
- Uses `ecosystem.dev.config.js`
- No build required (hot reload)
- Backend: `master=development`
- Frontend: `npm run dev`

**Production Mode:**
```bash
npm run deploy:prod
```
- Uses `ecosystem.prod.config.js`
- Requires build first
- Backend: `master=production`
- Frontend: `npm start`

---

### 3️⃣ **Manual PM2 Commands**

**Development:**
```bash
# Build not needed, just start
npm run pm2:start:dev
```

**Production:**
```bash
# Must build first!
cd nextjs-app
npm run build
cd ..

# Then start
npm run pm2:start:prod
```

---

## 📊 Comparison Table

| Feature | Development | Production |
|---------|------------|------------|
| **Build Required** | ❌ No | ✅ Yes |
| **Hot Reload** | ✅ Yes | ❌ No |
| **Optimized** | ❌ No | ✅ Yes |
| **Speed** | 🚀 Fast start | 🐢 Slower start (build time) |
| **Use Case** | Testing, active dev | Live server, production |
| **Backend Config** | `env.development.json` | `env.production.json` |
| **Frontend Mode** | `npm run dev` | `npm start` (built) |
| **Process Names** | `bookbag-*-dev` | `bookbag-*-prod` |

---

## 🔄 Complete Workflow Examples

### **For Server Deployment (Production):**

```bash
# 1. Set backend URL
export NEXT_PUBLIC_BACKEND_URL=http://YOUR_SERVER_IP:8080

# 2. Run deploy script
npm run deploy
# Choose option 2 (Production)

# 3. Verify
pm2 status
pm2 logs
```

### **For Local Testing (Development):**

```bash
# 1. Set backend URL (localhost)
export NEXT_PUBLIC_BACKEND_URL=http://localhost:8080

# 2. Run deploy script
npm run deploy
# Choose option 1 (Development)

# 3. Test
curl http://localhost:3000
curl http://localhost:8080
```

### **Quick Production Deployment:**

```bash
# All-in-one command
NEXT_PUBLIC_BACKEND_URL=http://YOUR_SERVER_IP:8080 npm run deploy:prod
```

---

## 🛠️ Behind the Scenes

### **Development Mode:**
- Backend runs with: `master=development node server.js`
- Frontend runs with: `npm run dev` (Next.js dev server)
- Files watched for changes
- No optimization

### **Production Mode:**
- Backend runs with: `master=production node server.js`
- Frontend runs with: `npm start` (pre-built Next.js)
- Optimized bundles
- Better performance

---

## ⚡ Quick Commands

```bash
# Check what's running
npm run pm2:status

# View logs
npm run pm2:logs

# Restart everything
npm run pm2:restart

# Stop everything
npm run pm2:stop
```

---

## 🚨 Important Notes

1. **Production requires build:**
   ```bash
   cd nextjs-app
   npm run build
   cd ..
   ```

2. **Backend URL must be set BEFORE building frontend:**
   ```bash
   export NEXT_PUBLIC_BACKEND_URL=http://YOUR_SERVER_IP:8080
   ```

3. **Can run both dev and prod simultaneously** (different process names):
   ```bash
   npm run deploy:dev   # Runs on default ports
   npm run deploy:prod  # May need different ports
   ```

4. **JWT secrets auto-generate** on first run in both modes

---

## 💡 Which Mode Should I Use?

**Use Development if:**
- ✅ Testing locally
- ✅ Making frequent code changes
- ✅ Want instant reload
- ✅ Don't need optimization

**Use Production if:**
- ✅ Deploying to a server
- ✅ Want best performance
- ✅ Code is stable
- ✅ Real users will access it

