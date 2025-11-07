# BookBag - Self-Hosted LLM Management Platform

> Enterprise-grade AI infrastructure platform that gives organizations complete control over their LLM operations.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![Next.js](https://img.shields.io/badge/next.js-14%2B-black)](https://nextjs.org/)

## Overview

BookBag is a self-hosted platform that provides centralized management for Large Language Models (LLMs) across your organization. Unlike using ChatGPT or Claude directly, BookBag gives you complete control over costs, data, access, and knowledge integration.

**Key Benefits:**
- Self-hosted on your infrastructure (data sovereignty)
- Multi-provider support (OpenAI, Anthropic, Grok, local models)
- RAG system for company knowledge integration
- Complete cost tracking and attribution
- Enterprise access controls and audit trails
- Team collaboration with workspaces

## Quick Start

```bash
# Clone the repository
git clone https://github.com/bookbaghq/bookbag-ce.git
cd bookbag-ce

# One-command deployment (recommended)
npm run deploy
```

**Default credentials:**
- Email: `admin@bookbag.work`
- Password: `admin` (change after first login)

**Access:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8080

For detailed installation instructions, see [INSTALL.md](docs/INSTALL.md).

## Why BookBag?

### The Challenge with SaaS AI Tools

| Problem | Impact |
|---------|--------|
| No cost visibility | Can't track spending per team/project |
| Data on external servers | Compliance and security risks |
| Vendor lock-in | Stuck with one provider |
| Limited knowledge integration | Can't leverage company documents |
| Basic access controls | Insufficient for enterprise needs |
| No audit trails | Compliance gaps |

### The BookBag Solution

| Feature | Benefit |
|---------|---------|
| **Complete Cost Visibility** | Track token usage by user, team, model, and conversation |
| **Data Sovereignty** | Self-hosted, data never leaves your network |
| **Knowledge Management** | RAG system integrates company docs at workspace and chat level |
| **Multi-Provider Freedom** | Switch between OpenAI, Anthropic, Grok, local models instantly |
| **Enterprise Access Control** | Workspaces, roles, model restrictions, permissions |
| **Full Audit Compliance** | Complete logs of conversations, users, and document access |

## Core Features

### 🎯 Model Management
- **Multi-Provider Support**: OpenAI, Anthropic Claude, Grok (X.AI), Ollama local models, Azure OpenAI
- **Model Library**: Browse and deploy models with one click
- **Configuration Profiles**: Reusable templates for model settings
- **Lifecycle Control**: Publish/unpublish models, test before production
- **Centralized API Keys**: Secure credential management
- **Custom System Prompts**: Enforce behavior and guidelines

### 💬 Chat & Collaboration
- **Real-time Streaming**: WebSocket-based chat with streaming responses
- **Multi-User Support**: Team collaboration in shared conversations
- **Workspace Organization**: Project-based isolation with shared context
- **Full History**: Complete conversation archives
- **Advanced Search**: Find conversations by content or metadata
- **Token Analytics**: Message-level usage tracking

### 📚 RAG (Retrieval-Augmented Generation)
- **Document Support**: PDF, DOCX, TXT, CSV with automatic text extraction
- **Local Embeddings**: Privacy-focused (all-MiniLM-L6-v2), no external API calls
- **Semantic Search**: Vector-based retrieval with cosine similarity
- **Layered Knowledge**: Workspace-level + chat-specific documents
- **Source Attribution**: See which documents informed responses
- **Grounding Modes**: Strict (context-only) vs Soft (general knowledge)

### 👥 User & Access Management
- **Role-Based Access**: Administrator and Subscriber roles
- **Workspace Membership**: Organize teams with granular permissions
- **JWT Authentication**: Session management, SSO-ready
- **Audit Trails**: Track every user action and interaction
- **Soft Delete**: Recovery options before permanent removal

### 🏢 Workspace Features
- **Project Isolation**: Separate contexts for teams or initiatives
- **Model Allowlists**: Control which models each workspace can access
- **Shared Knowledge**: Workspace-level documents for all members
- **Team Chats**: All conversations organized under workspace
- **Access Control**: Admin and member roles per workspace

### 💰 Token Analytics & Cost Control
- **Usage Dashboard**: Total tokens, averages, top consumers
- **Cost Attribution**: Identify resource-intensive teams/projects
- **Model Comparison**: Efficiency analysis across providers
- **User Tracking**: Top consumers and usage patterns
- **Historical Data**: Capacity planning and forecasting

### ⚙️ Admin Features
- **User Management**: Create, edit, and manage user accounts
- **System Settings**: Global feature toggles and configuration
- **Plugin Management**: WordPress-style plugin system
- **Model Configuration**: Centralized model and provider setup
- **Usage Monitoring**: System-wide analytics and insights

## Architecture

### Technology Stack

**Backend:**
- Node.js with MasterController framework (MVC architecture)
- MasterRecord ORM for database operations
- Socket.IO for real-time WebSocket communication
- Component-based modular structure
- SQLite (development) / MySQL (production)

**Frontend:**
- Next.js 14+ with App Router
- React 18+
- Tailwind CSS for styling
- Shadcn/ui component library
- Real-time updates via WebSocket

**AI/ML:**
- LangChain text splitters for document processing
- Xenova transformers for local embeddings
- LanceDB for vector storage
- Support for multiple LLM providers

**Security:**
- bcrypt password hashing
- JWT-based authentication
- Session management
- CORS configuration
- Input validation and XSS prevention

For detailed architecture information, see [ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Documentation

### Getting Started
- [Installation Guide](docs/INSTALL.md) - Complete installation instructions
- [Configuration Guide](docs/CONFIGURATION.md) - Configuration reference
- [User Guide](docs/USER_GUIDE.md) - How to use BookBag features
- [Troubleshooting](docs/TROUBLESHOOTING.md) - Common issues and solutions

### Development
- [Developer Guide](docs/DEVELOPER_GUIDE.md) - Extend and customize BookBag
- [Architecture](docs/ARCHITECTURE.md) - System design and structure
- [API Documentation](docs/api/API_DOCUMENTATION.md) - REST API reference

### Plugin Development
- [Plugin Development Guide](docs/plugins/PLUGIN_DEVELOPMENT.md) - Create custom plugins
- [Hooks Reference](docs/plugins/HOOKS_REFERENCE.md) - Available hooks
- [Plugin API](docs/plugins/PLUGIN_API.md) - Plugin API reference

### Operations
- [Migration Guide](docs/MIGRATION_GUIDE.md) - Upgrade between versions
- [Security Policy](SECURITY.md) - Security best practices
- [Changelog](CHANGELOG.md) - Version history

## Installation

### Prerequisites
- Node.js 18+ (20+ recommended)
- npm 9+
- 4GB+ RAM (8GB recommended)
- 10GB+ disk space

### Quick Installation

**macOS/Linux:**
```bash
git clone https://github.com/bookbaghq/bookbag-ce.git
cd bookbag-ce
npm run deploy
```

**Windows (PowerShell):**
```powershell
git clone https://github.com/bookbaghq/bookbag-ce.git
cd bookbag-ce
npm run deploy:windows
```

The deployment script will:
- Install all dependencies (backend + frontend)
- Auto-generate JWT secrets
- Configure CORS
- Build frontend (production mode)
- Start backend and frontend services

### Manual Installation

If you prefer manual setup:

```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd nextjs-app
npm install
cd ..

# Setup database migrations
npm install -g masterrecord
masterrecord enable-migrations-all
master=development masterrecord update-database-all

# Start development servers (two terminals)
# Terminal 1: Backend
npm run dev

# Terminal 2: Frontend
cd nextjs-app && npm run dev
```

### Production Deployment

For production deployment with PM2:

```bash
# Install PM2 globally
npm install -g pm2

# Deploy in production mode
npm run deploy

# Manage processes
npm run pm2:status    # View status
npm run pm2:logs      # View logs
npm run pm2:restart   # Restart services
npm run pm2:stop      # Stop services
```

For detailed installation options, see [INSTALL.md](docs/INSTALL.md).

## Configuration

### Environment Configuration

BookBag uses JSON configuration files in `config/environments/`:
- `env.development.json` - Development settings
- `env.production.json` - Production settings

Select environment using the `master` variable:
```bash
master=production node server.js
```

### Key Configuration Areas

- **Server Settings**: Ports, hostname, timeouts
- **Database Contexts**: Per-component database configuration
- **JWT Secrets**: Auto-generated authentication tokens
- **LLM Providers**: API endpoints for OpenAI, Anthropic, Grok
- **CORS**: Allowed origins for API access
- **Media Storage**: File upload paths and limits

For complete configuration reference, see [CONFIGURATION.md](docs/CONFIGURATION.md).

## Usage

### First-Time Setup

1. **Create Admin Account**
   - Navigate to http://localhost:3000
   - Use default credentials or create new account
   - First user becomes administrator

2. **Configure LLM Providers**
   - Go to Models > Settings
   - Add API keys for OpenAI, Anthropic, or Grok
   - Test connections

3. **Install Models**
   - Browse Models > Library
   - Click "Install" on desired models
   - Publish models to make them available

4. **Create Workspaces** (optional)
   - Go to Admin > Workspaces
   - Create workspace for your team/project
   - Add members and assign models

5. **Upload Documents** (optional)
   - Navigate to RAG > Documents
   - Upload company documents (PDF, DOCX, TXT)
   - Documents become available for context

For detailed usage instructions, see [USER_GUIDE.md](docs/USER_GUIDE.md).

## Contributing

We welcome contributions from the community! BookBag is open source and built with collaboration in mind.

### How to Contribute

1. **Fork the repository** on GitHub
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes** and commit: `git commit -m 'Add amazing feature'`
4. **Push to your fork**: `git push origin feature/amazing-feature`
5. **Open a Pull Request** against the main repository

### Development Guidelines

- Follow existing code style and conventions
- Write tests for new features
- Update documentation for user-facing changes
- Keep commits focused and write clear commit messages

For detailed contribution guidelines, see [CONTRIBUTING.md](CONTRIBUTING.md).

## Plugin System

BookBag features a WordPress-style plugin system with hooks and filters.

### Creating Plugins

Plugins can extend BookBag functionality without modifying core code:

```javascript
// Example plugin structure
module.exports = {
  name: 'my-custom-plugin',
  version: '1.0.0',

  init(hookService) {
    // Register hooks
    hookService.addFilter('chat_message', this.modifyMessage);
  },

  modifyMessage(message) {
    // Modify chat messages
    return message;
  }
};
```

### Available Hooks

- `chat_message` - Modify messages before sending to LLM
- `admin_menu` - Add items to admin sidebar
- `rag_chunk` - Process document chunks
- And many more...

For plugin development, see [Plugin Development Guide](docs/plugins/PLUGIN_DEVELOPMENT.md).

## Use Cases

### For Enterprises
- **Data Sovereignty**: Keep sensitive conversations on your infrastructure
- **Cost Tracking**: Attribution per department, project, or user
- **Compliance**: Complete audit trails and data retention policies
- **Knowledge Base**: Ground AI in company documentation

### For Development Teams
- **Multi-Model Testing**: Compare providers side-by-side
- **Custom Prompts**: Enforce coding standards and practices
- **Project Knowledge**: Upload specs and docs as context
- **API Integration**: Integrate with your development workflow

### For Security/Compliance
- **Self-Hosted**: No third-party data sharing
- **Access Controls**: Granular permissions and roles
- **Audit Logs**: Track all user actions
- **Data Lifecycle**: Soft delete and retention policies

## Comparison

| Feature | ChatGPT/Claude | BookBag |
|---------|---------------|---------|
| Deployment | SaaS only | Self-hosted |
| Cost Tracking | None | Per-user, per-chat, per-model |
| Knowledge Base | Limited/none | Full RAG system |
| Provider Choice | Locked to one | Multiple providers |
| Access Control | Basic seats | Workspaces, roles, allowlists |
| Audit Trail | Limited | Complete logs |
| Customization | Minimal | System prompts, profiles |
| Team Collaboration | Separate accounts | Shared workspaces |
| Data Privacy | External servers | Your servers only |

## Security

Security is a top priority for BookBag. Key security features:

- **Authentication**: bcrypt password hashing, JWT tokens
- **Authorization**: Role-based access control (RBAC)
- **Data Protection**: All passwords hashed, sensitive data encrypted
- **Input Validation**: Protection against SQL injection and XSS
- **Session Management**: Secure session handling with expiration
- **Audit Logging**: Complete activity trails

### Reporting Security Vulnerabilities

Please report security vulnerabilities to our security team. **Do not create public GitHub issues for security vulnerabilities.**

For details, see our [Security Policy](SECURITY.md).

## License

BookBag follows an open-core model:

- **Core Platform**: MIT License (this repository)
- **Documentation**: CC BY-SA 4.0
- **Client-side JavaScript**: MIT License
- **Third-party Components**: Original licenses apply

See [LICENSE](LICENSE) for complete details.

## Support

### Community Support

- **GitHub Issues**: [Report bugs and request features](https://github.com/bookbaghq/bookbag-ce/issues)
- **GitHub Discussions**: [Ask questions and share ideas](https://github.com/bookbaghq/bookbag-ce/discussions)
- **Documentation**: [Comprehensive guides](docs/)

### Getting Help

1. Check the [Troubleshooting Guide](docs/TROUBLESHOOTING.md)
2. Search [existing issues](https://github.com/bookbaghq/bookbag-ce/issues)
3. Join [GitHub Discussions](https://github.com/bookbaghq/bookbag-ce/discussions)
4. Create a new issue with details

When asking for help, please include:
- BookBag version
- Operating system and Node.js version
- Steps to reproduce the issue
- Error messages and logs
- Relevant configuration (without secrets)

## Roadmap

Upcoming features and improvements:

- [ ] Dark mode support
- [ ] Enhanced analytics dashboard
- [ ] Advanced plugin marketplace
- [ ] Multi-language support
- [ ] PostgreSQL support
- [ ] Kubernetes deployment guides
- [ ] API rate limiting
- [ ] Advanced caching layer
- [ ] Streaming conversation exports
- [ ] Custom embedding models

See [CHANGELOG.md](CHANGELOG.md) for version history and [GitHub Issues](https://github.com/bookbaghq/bookbag-ce/issues) for planned features.

## Community

### Code of Conduct

We are committed to providing a welcoming and inclusive environment. Please read our [Code of Conduct](CODE_OF_CONDUCT.md) before participating.

### Contributing

We love contributions! Whether it's bug fixes, features, documentation, or feedback, all contributions are welcome.

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## Acknowledgments

BookBag is built with amazing open source technologies:

- [Next.js](https://nextjs.org/) - React framework
- [Node.js](https://nodejs.org/) - JavaScript runtime
- [Socket.IO](https://socket.io/) - Real-time communication
- [Tailwind CSS](https://tailwindcss.com/) - CSS framework
- [Shadcn/ui](https://ui.shadcn.com/) - Component library
- [LangChain](https://langchain.com/) - LLM orchestration
- [LanceDB](https://lancedb.com/) - Vector database

Special thanks to all our contributors and the open source community.

## Links

- **Website**: [Bookbag.work](https://bookbag.work)
- **GitHub**: [bookbaghq](https://github.com/bookbaghq)
- **Documentation**: [docs/](docs/)
- **Issues**: [GitHub Issues](https://github.com/bookbaghq/bookbag-ce/issues)
- **Discussions**: [GitHub Discussions](https://github.com/bookbaghq/bookbag-ce/discussions)

---

**Built with ❤️ by the BookBag team**

*Self-hosted AI for everyone*
