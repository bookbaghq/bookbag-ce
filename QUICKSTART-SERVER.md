# Server Deployment - Quick Start Guide

## 🚀 Simple Deployment (One Command)

The easiest way to deploy to your server:

```bash
# Set your backend URL (replace with your actual server IP/domain)
export NEXT_PUBLIC_BACKEND_URL=http://YOUR_SERVER_IP:8080

# Run the deployment script
npm run deploy
```

That's it! The script will:
- ✅ Install all dependencies (backend + frontend)
- ✅ Build the frontend
- ✅ Start both services with PM2
- ✅ Save PM2 configuration

---

## 📋 Step-by-Step Manual Deployment

If you prefer to run commands manually:

### 1. Install PM2 (if not installed)
```bash
npm install -g pm2
```

### 2. Set Backend URL
```bash
# Replace with your server's IP or domain
export NEXT_PUBLIC_BACKEND_URL=http://YOUR_SERVER_IP:8080
```

### 3. Install Dependencies
```bash
# Backend dependencies
npm install

# Frontend dependencies
cd nextjs-app
npm install
cd ..
```

### 4. Build Frontend
```bash
cd nextjs-app
npm run build
cd ..
```

### 5. Start with PM2
```bash
# Start both backend and frontend
pm2 start ecosystem.config.js

# Save PM2 config
pm2 save

# Enable auto-restart on server reboot
pm2 startup
# (Copy and run the command it outputs)
```

### 6. Verify
```bash
pm2 status
pm2 logs
```

---

## 🎯 Common Scenarios

### Deploying to VPS/Cloud Server

```bash
# SSH into your server
ssh user@your-server-ip

# Clone the repo
git clone <your-repo-url>
cd bookbag-ce

# Set backend URL (use your server's public IP)
export NEXT_PUBLIC_BACKEND_URL=http://YOUR_PUBLIC_IP:8080

# Deploy
npm run deploy
```

### Deploying with Domain Name

```bash
# If you have a domain pointing to your server
export NEXT_PUBLIC_BACKEND_URL=https://api.yourdomain.com

npm run deploy
```

### Deploying to Localhost (Testing)

```bash
# For local testing
export NEXT_PUBLIC_BACKEND_URL=http://localhost:8080

npm run deploy
```

---

## 🔧 PM2 Management Commands

All PM2 commands are available as npm scripts:

```bash
npm run pm2:status     # View running processes
npm run pm2:logs       # View logs
npm run pm2:restart    # Restart all services
npm run pm2:stop       # Stop all services
npm run pm2:start      # Start services (if stopped)
```

Or use PM2 directly:

```bash
pm2 list               # List all processes
pm2 logs               # View all logs
pm2 logs bookbag-backend    # Backend logs only
pm2 logs bookbag-frontend   # Frontend logs only
pm2 restart all        # Restart everything
pm2 restart bookbag-backend # Restart backend only
pm2 restart bookbag-frontend # Restart frontend only
pm2 stop all           # Stop everything
pm2 delete all         # Remove all processes
pm2 monit              # Live monitoring
```

---

## ✅ Verification Checklist

After deployment, verify:

- [ ] PM2 shows both processes running: `pm2 status`
- [ ] No errors in logs: `pm2 logs`
- [ ] Backend responds: `curl http://localhost:8080`
- [ ] Frontend responds: `curl http://localhost:3000`
- [ ] JWT secrets generated: `cat config/environments/env.production.json | grep -A 3 "jwtAPI"`

---

## 🔄 Updating Your Deployment

When you have new code:

```bash
# Pull latest changes
git pull

# Redeploy
npm run deploy
```

Or manually:

```bash
git pull
npm install
cd nextjs-app
npm install
npm run build
cd ..
pm2 restart all
```

---

## 🌐 Accessing Your Application

After successful deployment:

- **Frontend**: `http://YOUR_SERVER_IP:3000`
- **Backend API**: `http://YOUR_SERVER_IP:8080`

### With Domain (Using Nginx)

Set up a reverse proxy to access via domain:

- **Frontend**: `https://yourdomain.com`
- **Backend API**: `https://api.yourdomain.com`

See `DEPLOYMENT.md` for Nginx configuration examples.

---

## 🆘 Troubleshooting

### Backend URL Not Set
```bash
# Make sure this is exported before building
export NEXT_PUBLIC_BACKEND_URL=http://YOUR_SERVER_IP:8080

# Then rebuild frontend
cd nextjs-app
npm run build
cd ..
pm2 restart bookbag-frontend
```

### Port Already in Use
```bash
# Check what's using the ports
lsof -i :3000
lsof -i :8080

# Stop PM2 processes
pm2 delete all

# Then restart
pm2 start ecosystem.config.js
```

### PM2 Not Starting on Reboot
```bash
# Run this once to set up auto-start
pm2 startup
# Copy and run the command it outputs

# Then save your processes
pm2 save
```

### View Error Logs
```bash
# Check logs for errors
pm2 logs bookbag-backend --err --lines 50
pm2 logs bookbag-frontend --err --lines 50
```

---

## 📚 Additional Resources

- **Full Deployment Guide**: See `DEPLOYMENT.md`
- **PM2 Documentation**: https://pm2.keymetrics.io/
- **Nginx Setup**: See `DEPLOYMENT.md` for reverse proxy config

