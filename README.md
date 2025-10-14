# Bookbag

## Canonical source
The canonical source of Bookbag, where active development occurs, is hosted on GitHub under the `bookbagHQ` organization. See the organization home for repositories and releases:

- https://github.com/bookbaghq

If you are working from a read-only mirror or an exported archive, please open issues and pull requests against the canonical source.

## Enterprise LLM Management Platform
Bookbag is a self-hosted, enterprise-grade AI infrastructure platform that gives companies complete control over their LLM operations. Unlike using ChatGPT or Claude directly, Bookbag provides centralized administration, multi-provider flexibility, knowledge base management, granular access controls, and comprehensive cost analytics.

### Why Companies Choose Bookbag Over SaaS AI Tools

**The Challenge with ChatGPT/Claude Direct:**
- ❌ No cost visibility per team or project
- ❌ Data stored on external servers (compliance risk)
- ❌ Limited company knowledge integration
- ❌ Vendor lock-in to single provider
- ❌ Minimal access controls beyond seat licenses
- ❌ No audit trails for compliance

**The Bookbag Solution:**
- ✅ **Complete Cost Visibility** - Track token usage by user, team, model, and conversation
- ✅ **Data Sovereignty** - Self-hosted on your infrastructure, data never leaves your network
- ✅ **Knowledge Management** - RAG system integrates company docs at workspace and chat level
- ✅ **Multi-Provider Freedom** - Switch between OpenAI, Anthropic, Grok, local models instantly
- ✅ **Enterprise Access Control** - Workspaces, roles, model restrictions, permissions
- ✅ **Full Audit Compliance** - Complete logs of conversations, users, and document access

### Core LLM Management Features

#### 🎯 **Model Management**
- **Multi-Provider Support**: OpenAI (GPT-4, GPT-3.5), Anthropic (Claude), Grok (X.AI), Ollama (local models), Azure OpenAI, and any OpenAI-compatible API
- **Model Library**: Browse and connect new models with one-click deployment
- **Configuration Profiles**: Reusable templates for model settings (temperature, max tokens, system prompts)
- **Lifecycle Control**: Publish/unpublish models, test before production rollout
- **API Key Management**: Centralized, secure credential storage
- **Grounding Modes**: Strict (context-only) vs soft (general knowledge) for RAG

#### 💬 **Chat & Collaboration**
- **Multi-User Chats**: Team members collaborate in shared conversations
- **Workspace Organization**: Project-based isolation with shared context
- **Full History**: Complete conversation archives with message-level token tracking
- **Advanced Search**: Find conversations by content, title, or timeframe
- **Token Analytics**: Per-user, per-model, per-chat usage tracking and cost attribution

#### 📚 **RAG (Knowledge Base) System**
- **Document Upload**: PDF, DOCX, TXT, CSV support with automatic text extraction
- **Semantic Search**: Local embeddings (all-MiniLM-L6-v2) for privacy - no external API calls
- **Layered Retrieval**: Workspace-level company docs + chat-specific documents
- **Source Attribution**: See which documents informed each AI response
- **Storage Quotas**: Enforce limits per user or workspace
- **Vector Search**: Cosine similarity ranking for relevant chunk retrieval

#### 👥 **User & Access Management**
- **Role-Based Access**: Administrator vs Subscriber permissions
- **Workspace Membership**: Organize teams with admin/member roles
- **Session Management**: JWT-based authentication, SSO-ready
- **Audit Trails**: Track every user action and model interaction
- **Soft Delete**: Recovery options before permanent data removal

#### 🏢 **Workspace Features**
- **Project Isolation**: Separate contexts for different teams or initiatives
- **Model Allowlists**: Control which models each workspace can access
- **Shared Knowledge**: Workspace-level documents available to all members
- **Custom Configuration**: Override prompts and profiles per workspace
- **Team Chats**: All conversations organized under workspace umbrella

#### 💰 **Token Analytics & Cost Control**
- **Usage Dashboard**: Total tokens, average per chat, top consumers
- **Cost Attribution**: Identify which teams/projects use most resources
- **Model Comparison**: See which LLMs are most efficient for your workloads
- **User Tracking**: Top 10 users by token consumption
- **Chat Analysis**: Top 10 conversations by token usage
- **Capacity Planning**: Historical data for infrastructure forecasting

#### 📧 **Mail System**
- **Email Templates**: Reusable templates for user notifications
- **SMTP Integration**: Connect to Office 365, Gmail, or on-prem servers
- **Email Logging**: Full audit trail of sent messages
- **User Notifications**: Password resets, invitations, alerts

#### ⚙️ **System Configuration**
- **Multi-Database**: SQLite for dev (zero setup), MySQL for production
- **Environment-Based**: Separate configs for dev/test/prod
- **Auto-Deployment**: One-command deployment with auto-generated secrets
- **Process Management**: PM2 integration for auto-restart and monitoring
- **Cross-Platform**: Windows (PowerShell), macOS, Linux (Bash)

### Business Benefits by Department

**IT/Security Teams:**
- Data sovereignty (self-hosted)
- Full audit compliance
- Role-based access governance
- No vendor lock-in

**Finance/Operations:**
- Cost attribution by team/project
- Budget controls with quotas
- Usage forecasting
- ROI measurement

**Legal/Compliance:**
- Data retention policies
- Complete audit trails
- Document access controls
- No third-party data sharing

**Product/Engineering:**
- Multi-model testing
- Custom system prompts
- Project-specific knowledge bases
- API integration flexibility

**HR/Training:**
- Onboarding knowledge bases
- Department-specific training materials
- Role-based access to resources
- Skill development tracking

### What Makes Bookbag Different

| Feature | ChatGPT/Claude Direct | Bookbag |
|---------|----------------------|---------|
| **Deployment** | SaaS only | Self-hosted on your infrastructure |
| **Cost Tracking** | None | Per-user, per-chat, per-model analytics |
| **Knowledge Base** | Limited/none | Full RAG with workspace/chat docs |
| **Provider Choice** | Locked to one | OpenAI, Anthropic, Grok, local models |
| **Access Control** | Basic seats | Workspaces, roles, model allowlists |
| **Audit Trail** | Limited | Complete logs, soft delete, archives |
| **Customization** | Minimal | System prompts, templates, profiles |
| **Team Collaboration** | Separate accounts | Shared workspaces and chats |
| **Integration** | Standalone | Integrate with your infrastructure |
| **Data Privacy** | External servers | Your servers only |

### Architecture Highlights
- **Backend**: Node.js, MasterController, MasterRecord ORM, Socket.IO
- **Frontend**: Next.js (App Router), React 19, Tailwind CSS
- **AI/ML**: LangChain text splitters, Xenova transformers (local embeddings)
- **Databases**: SQLite (dev), MySQL 8+ (production), separate DBs per domain
- **Security**: bcryptjs password hashing, JWT tokens, session management
- **Formats**: PDF, DOCX, TXT, CSV extraction

### Deployment features (New!)
- 🚀 **One-command deployment** - `npm run deploy` (all platforms)
- 🔐 **Auto JWT secrets** - No manual configuration needed
- 🌐 **Auto CORS setup** - Frontend URL automatically whitelisted
- 🖥️ **Cross-platform** - Windows (PowerShell), macOS, Linux (Bash)
- 📦 **PM2 optional** - Works with or without process manager
- ⚡ **Smart defaults** - Auto-adds protocols, prevents duplicates

## Editions
Bookbag follows an open‑core model similar in spirit to other platforms:

- Community features are built in the main repository
- Enterprise‑oriented or market‑specific additions may be delivered under separate directories if/when they exist (for example, `ee/` or `jh/`)

See Licensing below for the exact terms.

## Licensing
See the `LICENSE` file at the repository root for details. In summary:

- Documentation in `doc/` is under CC BY‑SA 4.0
- (If present) `ee/` and `jh/` directories follow the licenses defined in their respective `LICENSE` files
- Client‑side JavaScript is under the MIT Expat license
- Third‑party components retain their original licenses
- All other content is available under the MIT Expat license

## Website
For product information, demos, and services, please contact the Bookbag team. Repositories and org profile:

- Bookbag.work

## Requirements
- Node.js 18+ (Node 20+ recommended)
- npm 9+
- Optional: PM2 for production process management (`npm install -g pm2`)
- Optional databases:
  - SQLite (default in development)
  - MySQL 8+ (for test/production examples)

**Supported OS:** 
- ✅ Windows (PowerShell script)
- ✅ macOS (Bash script)
- ✅ Linux (Bash script)

See `config/environments/*.json` for environment‑specific settings.

## Installation (Bash Commands)
The recommended way to run Bookbag for development is the node‑native setup:

1) Setup Database Migrations
```bash
# install Masterrecord
npm install -g masterrecord
# enable migrations
masterrecord enable-migrations-all
# run migrations development
master=development masterrecord update-database-all
# run migrations production
master=production masterrecord update-database-all
```

2) Quick Deploy (Recommended)
```bash
# One command installs deps, configures, builds (prod), and starts services
npm run deploy
```

3) Manual Install (Alternative)
```bash

# from the repo root
npm install
# then
cd nextjs-app && npm install
```

4) Credentials
```bash
# password and email - please update after first use
email: admin@bookbag.work
password: admin
```

5) **Quick Start - Deploy Everything (Recommended)**

**macOS/Linux:**
```bash
# Run the interactive deployment script
npm run deploy
```

**Windows (PowerShell):**
```powershell
# Run the Windows deployment script
npm run deploy:windows
```

The script will ask you:
1. **Deployment mode:** Development (1) or Production (2)
2. **Backend URL:** If not already set (NO trailing slash), e.g. `http://localhost:8080` (local) or `http://YOUR_SERVER_IP:8080` (server)

The deploy script automatically:
- ✅ Detects PM2 (uses it if available, works without it)
- ✅ Installs all dependencies (backend + frontend)
- ✅ Builds frontend (production mode only; dev mode runs hot reload and ignores prior builds)
- ✅ **Auto-generates JWT secrets** if needed (no manual setup!)
- ✅ **Auto-configures CORS** (adds frontend URL to whitelist)
- ✅ Auto-adds `http://` protocol if missing
- ✅ Prevents duplicate CORS entries
- ✅ Starts both backend and frontend

**Access:**
- **Backend:** http://127.0.0.1:8080  
- **Frontend:** http://localhost:3000 (redirects to `/bb-auth/login`)

**Optional: Set backend URL beforehand (skip the prompt):**

**macOS/Linux:**
```bash
# For local development
export NEXT_PUBLIC_BACKEND_URL=http://localhost:8080
npm run deploy

# For production server
export NEXT_PUBLIC_BACKEND_URL=http://YOUR_SERVER_IP:8080
npm run deploy
```

**Windows (PowerShell):**
```powershell
# For local development
$env:NEXT_PUBLIC_BACKEND_URL="http://localhost:8080"
npm run deploy:windows

# For production server
$env:NEXT_PUBLIC_BACKEND_URL="http://YOUR_SERVER_IP:8080"
npm run deploy:windows
```

**Automatic Features:**
- **JWT Secrets:** Auto-generated on first run, stored in `config/environments/env.*.json`
- **CORS Configuration:** Auto-updated in `config/initializers/cors.json` based on backend URL
- **Protocol Handling:** Auto-adds `http://` if you enter just `IP:PORT`

---

6) **Alternative: Manual Setup (Advanced)**

**Option A: Simple Development (Two Terminals)**
```bash
# Terminal 1: Backend (Development mode)
npm run dev

# Terminal 2: Frontend
cd nextjs-app && npm run dev
```

**Option B: With PM2 (Server Deployments)**
```bash
# Install PM2 globally (one-time)
npm install -g pm2

# Deploy with PM2
npm run deploy:dev    # Development mode
npm run deploy:prod   # Production mode

# Manage PM2 processes
npm run pm2:status    # View status
npm run pm2:logs      # View logs
npm run pm2:restart   # Restart all
npm run pm2:stop      # Stop all
```

---

**📚 Documentation & Guides:**
- `QUICKSTART-SERVER.md` - Quick server deployment guide
- `DEPLOYMENT.md` - Complete deployment documentation
- `DEPLOY-MODES.md` - Development vs Production explained
- `NO-PM2-GUIDE.md` - Running locally without PM2
- `DEPLOY-SCRIPT-INFO.md` - Deploy script details (Bash & PowerShell)
- `CORS-SETUP.md` - CORS configuration guide
- `scripts/README.md` - JWT secrets initialization

**🛠️ Utility Commands:**
```bash
# Initialize/regenerate JWT secrets manually
npm run init-jwt

# Update CORS whitelist manually
npm run update-cors http://your-frontend-url:3000

# PM2 process management
npm run pm2:status    # View running processes
npm run pm2:logs      # View logs
npm run pm2:restart   # Restart all
npm run pm2:stop      # Stop all
```

### MySQL configuration (test/prod)
Use separate `host` and `port` keys (avoid `"localhost:3306"`). Example:
```json
{
  "userContext":  { "host": "127.0.0.1", "port": 3306, "user": "root", "password": "password", "database": "User",  "type": "mysql" },
  "modelContext": { "host": "127.0.0.1", "port": 3306, "user": "root", "password": "password", "database": "Model", "type": "mysql" },
  "mailContext":  { "host": "127.0.0.1", "port": 3306, "user": "root", "password": "password", "database": "Mail",  "type": "mysql" },
  "chatContext":  { "host": "127.0.0.1", "port": 3306, "user": "root", "password": "password", "database": "Chat",  "type": "mysql" }
}
```
Create the databases once:
```sql
CREATE DATABASE IF NOT EXISTS `User`;
CREATE DATABASE IF NOT EXISTS `Model`;
CREATE DATABASE IF NOT EXISTS `Mail`;
CREATE DATABASE IF NOT EXISTS `Chat`;
```

## Contributing
We welcome issues and contributions via the canonical source. Please:
- Fork the repository under your GitHub account (or within the `bookbaghq` org if you’re a member)
- Create a feature branch, submit a pull request, and follow code style and lint rules
- For larger changes, open an issue first to discuss design

## Install a development environment
If you prefer a single‑command setup, use your favorite Node version manager (nvm/fnm) and package manager. Otherwise, follow the steps in Installation above. Frontend and backend run as separate processes (Next.js dev server and Node backend).

## Software stack
- Backend: Node.js (MasterController + MasterRecord), Socket.IO
- Frontend: Next.js (App Router), React 19, Tailwind‑based UI
- Databases: SQLite (dev) or MySQL (test/prod examples)

## UX design
Follow established UI patterns in `nextjs-app/components/ui/*` and the existing page/layout conventions in `nextjs-app/app/*`.

## Third‑party applications
Bookbag integrates with OpenAI‑compatible endpoints and Grok. Email uses SMTP providers via `nodemailer`. You can wire additional services under `components/*/app/service` and `nextjs-app/services/*`.

## Release cycle
Bookbag uses semantic versioning in tags/releases. See the GitHub Releases page for notes when available.

## Upgrading
- Update dependencies with care (`npm outdated`, `npm update`) and review breaking changes in Next.js/Node
- Review environment files under `config/environments` when changing providers or databases

## Documentation
- Installation and setup: `Installation.md`
- Environment configs: `config/environments/*`
- Frontend services and routes: `nextjs-app/services/*`, `nextjs-app/app/*`

## Education
Internal enablement and onboarding materials can be added under `doc/`.

## Getting help
- Open an issue in the canonical source repository
- Contact the maintainers for support and trial requests

## Why should I use Bookbag?

### For Enterprises
- **Data Sovereignty**: Self-hosted means your conversations and documents never leave your infrastructure
- **Cost Control**: Track and attribute AI costs per user, team, model, and project
- **Compliance Ready**: Complete audit trails, data retention policies, role-based access
- **Vendor Freedom**: Switch between OpenAI, Anthropic, Grok, or local models without disruption
- **Knowledge Integration**: RAG system grounds AI responses in your company documentation
- **Team Collaboration**: Workspaces enable teams to share context and collective knowledge

### For Development Teams
- **Multi-Provider Testing**: Compare model performance across providers in real-time
- **Custom Behavior**: System prompts enforce coding standards, documentation style, company policies
- **Project Knowledge**: Upload design docs, specs, wikis as RAG documents for AI context
- **Zero Setup Dev Environment**: SQLite requires no database installation
- **Production Ready**: One command to deploy with MySQL backend and PM2 process management

### For Security/Compliance
- **Self-Hosted**: Deploy on-premises or private cloud, data never touches third-party servers
- **Access Controls**: Workspaces, roles, model restrictions, granular permissions
- **Audit Logs**: Complete history of user actions, conversations, document access
- **Data Lifecycle**: Soft delete with recovery, configurable retention policies
- **SSO Ready**: JWT-based auth integrates with enterprise identity systems

### Technical Advantages
- **Unified Platform**: Chat, admin, RAG, analytics in one system
- **Modern Stack**: Next.js, React 19, Tailwind CSS, Socket.IO streaming
- **Flexible Databases**: SQLite for dev (zero config), MySQL for production scale
- **Local Embeddings**: No external API calls for vector search (privacy + cost savings)
- **Cross-Platform**: Works on Windows, macOS, Linux with automated deployment

### Cost Benefits
- **No Per-Seat Licensing**: Self-hosted means pay for infrastructure, not users
- **Usage Transparency**: Know exactly which teams/projects drive AI costs
- **Budget Enforcement**: Set storage quotas, context limits, model restrictions
- **Provider Optimization**: Route queries to most cost-effective model automatically
- **Long-Term Savings**: Lower TCO vs. SaaS AI tools at enterprise scale
