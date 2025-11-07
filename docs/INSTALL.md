# Installation Guide

This guide walks you through installing BookBag on your system.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Detailed Installation](#detailed-installation)
- [Docker Installation](#docker-installation)
- [Configuration](#configuration)
- [First Run](#first-run)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements

**Minimum:**
- 2 CPU cores
- 4GB RAM
- 10GB disk space
- Ubuntu 20.04+ / macOS 10.15+ / Windows 10+ with WSL2

**Recommended:**
- 4+ CPU cores
- 8GB+ RAM
- 20GB+ disk space (more for RAG documents)
- SSD storage

### Required Software

1. **Node.js**
   - Version: 18.x or higher
   - Download: https://nodejs.org/

2. **npm**
   - Included with Node.js
   - Version: 9.x or higher

3. **Git**
   - For cloning the repository
   - Download: https://git-scm.com/

4. **SQLite3**
   - Usually pre-installed on macOS/Linux
   - Windows: Download from https://www.sqlite.org/

### Optional Software

- **Docker**: For containerized deployment
- **PM2**: For production process management
- **Nginx**: For reverse proxy in production

## Quick Start

For developers who want to get started quickly:

```bash
# Clone repository
git clone https://github.com/bookbaghq/bookbag-ce.git
cd bookbag-ce

# Install backend dependencies
npm install

# Install frontend dependencies
cd nextjs-app
npm install
cd ..

# Start development server
npm run dev
```

Then open:
- Frontend: http://localhost:3000
- Backend: http://localhost:8080

## Detailed Installation

### Step 1: Clone the Repository

```bash
git clone https://github.com/bookbaghq/bookbag-ce.git
cd bookbag-ce
```

Or download and extract the source code archive.

### Step 2: Install Backend Dependencies

```bash
npm install
```

This installs all required Node.js packages including:
- MasterController framework
- MasterRecord ORM
- Socket.IO for WebSocket support
- bcrypt for password hashing
- Other dependencies

### Step 3: Install Frontend Dependencies

```bash
cd nextjs-app
npm install
cd ..
```

This installs:
- Next.js 14+
- React 18+
- Tailwind CSS
- Shadcn/ui components
- Other UI dependencies

### Step 4: Configure Environment

#### Development Configuration

For development, the default configuration usually works:

```bash
# JWT secrets are auto-generated on first run
# Database files are auto-created
# No additional configuration needed for development
```

#### Production Configuration

For production, configure environment variables:

```bash
# Edit production environment file
nano config/environments/env.production.json
```

See [CONFIGURATION.md](CONFIGURATION.md) for all available options.

### Step 5: Initialize Database

Database tables are created automatically on first run via migrations.

To manually run migrations:

```bash
# Not yet implemented - databases auto-initialize
```

### Step 6: Start the Application

#### Development Mode

```bash
npm run dev
```

This starts both backend (port 8080) and frontend (port 3000) with hot reloading.

#### Production Mode

```bash
# Build frontend
cd nextjs-app
npm run build
cd ..

# Start with PM2 (recommended)
pm2 start server.js --name bookbag

# Or start directly
master=production node server.js
```

## Docker Installation

### Using Docker Compose (Recommended)

1. **Create docker-compose.yml:**

```yaml
version: '3.8'

services:
  bookbag:
    build: .
    ports:
      - "8080:8080"
      - "3000:3000"
    volumes:
      - ./data:/app/data
      - ./config:/app/config
    environment:
      - NODE_ENV=production
      - master=production
    restart: unless-stopped
```

2. **Build and start:**

```bash
docker-compose up -d
```

### Using Docker Directly

```bash
# Build image
docker build -t bookbag:latest .

# Run container
docker run -d \
  -p 8080:8080 \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/config:/app/config \
  -e master=production \
  --name bookbag \
  bookbag:latest
```

## Configuration

### Environment Variables

Key environment variables (see [CONFIGURATION.md](CONFIGURATION.md) for complete list):

```bash
# Application environment
NODE_ENV=development|production

# Master environment selector
master=development|production

# Server ports (if different from defaults)
HTTP_PORT=8080
NEXT_PORT=3000
```

### Database Location

Databases are stored in component directories:
```
components/
  ├── admin/db/development.sqlite3
  ├── chats/db/development.sqlite3
  ├── models/db/development.sqlite3
  ├── rag/db/development.sqlite3
  ├── user/db/development.sqlite3
  └── ...
```

### Storage Location

Uploaded files are stored in:
```
bb-storage/
  └── media/
```

Ensure this directory has proper permissions:
```bash
chmod 755 bb-storage
```

## First Run

### Access the Application

1. **Open your browser:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8080

2. **Create admin account:**
   - First user created becomes admin
   - Navigate to signup page
   - Enter credentials

3. **Configure LLM Providers:**
   - Go to Models > Settings
   - Add OpenAI, Anthropic, or Grok API keys
   - Test connections

4. **Install models:**
   - Browse Models > Library
   - Click "Install" on desired models
   - Publish models to make them available

### Initial Setup Checklist

- [ ] Create admin account
- [ ] Configure at least one LLM provider
- [ ] Install and publish at least one model
- [ ] Test chat functionality
- [ ] Configure SMTP (optional, for emails)
- [ ] Set up workspaces (if using)
- [ ] Configure RAG settings (if using)

## Production Deployment

### Using PM2

```bash
# Install PM2 globally
npm install -g pm2

# Start application
pm2 start server.js --name bookbag -i max

# Save process list
pm2 save

# Setup startup script
pm2 startup
```

### Using Systemd

Create `/etc/systemd/system/bookbag.service`:

```ini
[Unit]
Description=BookBag LLM Platform
After=network.target

[Service]
Type=simple
User=bookbag
WorkingDirectory=/opt/bookbag
Environment="master=production"
ExecStart=/usr/bin/node server.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

Then:
```bash
sudo systemctl enable bookbag
sudo systemctl start bookbag
```

### Nginx Reverse Proxy

Example Nginx configuration:

```nginx
server {
    listen 80;
    server_name bookbag.example.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name bookbag.example.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket support
    location /socket.io/ {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }
}
```

## Platform-Specific Notes

### macOS

- SQLite3 is pre-installed
- Use Homebrew for easier package management
- May need to allow Node.js in Security & Privacy settings

### Linux (Ubuntu/Debian)

```bash
# Install Node.js (using NodeSource)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install build tools (if needed)
sudo apt-get install -y build-essential
```

### Windows

- Use WSL2 (Windows Subsystem for Linux) for best experience
- Native Windows installation possible but WSL2 recommended
- Install Node.js from official website or use nvm-windows

## Troubleshooting

### Port Already in Use

```bash
# Find and kill process on port 8080
lsof -ti:8080 | xargs kill -9

# Or use a different port
HTTP_PORT=8081 npm run dev
```

### Database Errors

```bash
# Check database file permissions
ls -la components/*/db/*.sqlite3

# Reset database (⚠️ destroys data)
rm components/*/db/*.sqlite3
# Restart application to recreate
```

### Module Not Found

```bash
# Clean install
rm -rf node_modules package-lock.json
npm install

# Frontend
cd nextjs-app
rm -rf node_modules package-lock.json
npm install
```

### Permission Denied

```bash
# Fix storage permissions
chmod -R 755 bb-storage

# Fix database directory permissions
chmod -R 755 components/*/db/
```

### EADDRINUSE Error

Another process is using the required ports:

```bash
# Check what's using the port
lsof -i:8080
lsof -i:3000

# Kill the processes
kill -9 <PID>
```

## Next Steps

After installation:

1. Read the [USER_GUIDE.md](USER_GUIDE.md) to learn how to use BookBag
2. Check [CONFIGURATION.md](CONFIGURATION.md) for advanced configuration
3. Review [SECURITY.md](../SECURITY.md) for production security best practices
4. Join our community for support and updates

## Getting Help

If you encounter issues:

1. Check [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
2. Search [GitHub Issues](https://github.com/bookbaghq/bookbag-ce/issues)
3. Ask in [GitHub Discussions](https://github.com/bookbaghq/bookbag-ce/discussions)
4. Join our Discord community

## Updating

To update BookBag to the latest version:

```bash
# Pull latest changes
git pull origin main

# Update dependencies
npm install
cd nextjs-app && npm install && cd ..

# Restart application
pm2 restart bookbag
# or
npm run dev
```

See [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md) for version-specific upgrade instructions.
