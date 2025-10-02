# Production Deployment Guide

This guide covers deploying Bookbag CE to a production server using PM2.

## Prerequisites

- Node.js 18+ installed
- PM2 installed globally: `npm install -g pm2`
- Your server configured with proper firewall rules
- Domain/subdomain configured (optional)

## Deployment Steps

### 1. Clone and Install Dependencies

```bash
# Clone the repository
git clone <your-repo-url>
cd bookbag-ce

# Install backend dependencies
npm install

# Install frontend dependencies
cd nextjs-app
npm install
cd ..
```

### 2. Configure Environment Variables

**Backend Configuration:**
- JWT secrets will auto-generate on first run
- Update database settings in `config/environments/env.production.json` if needed

**Frontend Configuration:**
```bash
# Set backend URL (replace with your server URL)
export NEXT_PUBLIC_BACKEND_URL=http://your-server-ip:8080
# OR for domain:
export NEXT_PUBLIC_BACKEND_URL=https://api.yourdomain.com
```

### 3. Build Frontend

```bash
cd nextjs-app
npm run build
cd ..
```

### 4. Start Services with PM2

**Option A: Use PM2 Ecosystem File (Recommended)**

```bash
# Start all services
pm2 start ecosystem.config.js

# View status
pm2 status

# View logs
pm2 logs
```

**Option B: Manual PM2 Commands**

```bash
# Start backend
pm2 start server.js --name "bookbag-backend" -- master=production

# Start frontend
cd nextjs-app
pm2 start npm --name "bookbag-frontend" -- start
cd ..

# Save PM2 configuration
pm2 save

# Setup PM2 to restart on server reboot
pm2 startup
```

### 5. Verify Deployment

```bash
# Check PM2 status
pm2 status

# Check backend logs
pm2 logs bookbag-backend

# Check frontend logs
pm2 logs bookbag-frontend

# Test backend API
curl http://localhost:8080/health

# Test frontend
curl http://localhost:3000
```

### 6. Configure Reverse Proxy (Nginx)

**Example Nginx Configuration:**

```nginx
# Backend API
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # WebSocket support for real-time features
    location /socket.io/ {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Frontend
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## PM2 Management Commands

```bash
# View all processes
pm2 list

# Restart all
pm2 restart all

# Restart specific service
pm2 restart bookbag-backend
pm2 restart bookbag-frontend

# Stop all
pm2 stop all

# Delete all
pm2 delete all

# View logs
pm2 logs
pm2 logs bookbag-backend --lines 100
pm2 logs bookbag-frontend --lines 100

# Monitor resources
pm2 monit

# Save current process list
pm2 save

# Resurrect saved processes
pm2 resurrect
```

## Environment Variables

### Backend (.env or config)
- JWT secrets: Auto-generated on first run
- Database: Configure in `config/environments/env.production.json`

### Frontend
Set before building or starting:
```bash
export NEXT_PUBLIC_BACKEND_URL=http://your-backend-url:8080
```

Or create `.env.local` in `nextjs-app/`:
```env
NEXT_PUBLIC_BACKEND_URL=http://your-backend-url:8080
```

## Updating Deployment

```bash
# Pull latest changes
git pull

# Update backend dependencies
npm install

# Update frontend dependencies
cd nextjs-app
npm install

# Rebuild frontend
npm run build
cd ..

# Restart services
pm2 restart all
```

## Troubleshooting

**Backend not starting:**
```bash
pm2 logs bookbag-backend --lines 50
# Check JWT secrets were generated
cat config/environments/env.production.json | grep -A 3 "jwtAPI"
```

**Frontend build errors:**
```bash
cd nextjs-app
rm -rf .next node_modules
npm install
npm run build
```

**Port conflicts:**
```bash
# Check what's running on ports
lsof -i :3000
lsof -i :8080

# Kill process if needed
kill -9 <PID>
```

**PM2 not restarting on reboot:**
```bash
pm2 unstartup
pm2 startup
pm2 save
```

## SSL/HTTPS Setup

Use Certbot with Nginx:
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com -d api.yourdomain.com
```

## Production Checklist

- [ ] Backend dependencies installed
- [ ] Frontend dependencies installed and built
- [ ] Environment variables configured
- [ ] JWT secrets generated (check config files)
- [ ] Database configured and accessible
- [ ] PM2 processes running
- [ ] PM2 configured to restart on reboot
- [ ] Nginx reverse proxy configured (if using)
- [ ] SSL certificates installed (if using HTTPS)
- [ ] Firewall rules configured
- [ ] Logs are being written and rotated
- [ ] Backup strategy in place

