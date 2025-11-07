# Changelog

All notable changes to BookBag will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Plugin system with WordPress-style hooks
- Admin settings page for system-wide feature toggles
- Comprehensive documentation structure
- Contributing guidelines
- Security policy
- Code of conduct

### Changed
- Reorganized documentation for open source release
- Improved plugin loading system
- Enhanced sidebar menu generation

### Fixed
- Settings controller pattern for MasterController compatibility
- Database table initialization for admin settings
- React hooks dependencies in settings management UI

## [1.0.0] - TBD

### Added

#### Core Platform
- Self-hosted LLM management platform
- Multi-user chat system with collaboration
- Workspace-based organization
- Admin dashboard and controls
- User authentication and authorization
- Role-based access control (RBAC)

#### LLM Provider Support
- OpenAI integration (GPT-4, GPT-3.5)
- Anthropic Claude integration
- Grok (X.AI) integration
- Ollama local model support
- Azure OpenAI support
- Custom OpenAI-compatible API endpoints

#### Model Management
- Model library with one-click deployment
- Configuration profiles for reusable settings
- Model lifecycle control (publish/unpublish)
- Centralized API key management
- Per-model settings (temperature, max tokens, etc.)
- System prompt configuration
- Grounding modes (strict vs soft) for RAG

#### Chat Features
- Real-time streaming responses
- WebSocket-based chat interface
- Message history and archives
- Chat search functionality
- Token usage tracking per message
- Multi-model support in conversations
- Chat favorites
- Chat archiving and deletion
- Thinking sections for models that support it
- Image generation support
- Vision support for image analysis

#### RAG (Retrieval-Augmented Generation)
- Document upload and processing
- PDF, DOCX, TXT, CSV support
- Local embeddings (all-MiniLM-L6-v2)
- Semantic search functionality
- LanceDB vector storage
- Chat-level and workspace-level knowledge bases
- Document chunking and indexing
- Grounding modes for context control
- RAG settings configuration

#### Workspace Features
- Multi-user workspaces
- Workspace-specific knowledge bases
- Model access control per workspace
- User roles within workspaces
- Shared conversations
- Workspace-level settings

#### Media Management
- Image upload and storage
- AI-generated image handling
- Image analysis with vision models
- Media library with search
- Storage quota management
- Attachment support in messages

#### Token Analytics
- Per-user token tracking
- Per-chat token tracking
- Per-model usage statistics
- Cost attribution
- Usage dashboards
- Analytics API

#### Mail System
- Email notifications
- Password reset emails
- User invitations
- SMTP configuration
- Mail logging and history
- Template-based emails

#### Admin Features
- User management interface
- System settings configuration
- Plugin management
- Model configuration
- Workspace oversight
- Usage monitoring

### Technical Features

#### Backend (Node.js/MasterController)
- MVC architecture with MasterController framework
- Component-based modular structure
- SQLite databases per component
- MasterRecord ORM
- WebSocket support via Socket.IO
- RESTful API endpoints
- Session management
- Authentication middleware

#### Frontend (Next.js)
- Next.js 14+ with App Router
- React Server Components
- Tailwind CSS for styling
- Shadcn/ui component library
- Real-time updates via WebSocket
- Responsive design
- Dark mode support (coming soon)

#### Database
- SQLite for data persistence
- Multiple databases per component
- Migration system
- Seed data support
- Context-based ORM pattern

#### Plugin System
- WordPress-style hook system
- Dynamic plugin loading from database
- Hook registration and execution
- Plugin API with hookService
- Sidebar menu generation via plugins
- Custom plugin development support

### Security
- bcrypt password hashing
- Session-based authentication
- CORS configuration
- Input validation
- SQL injection protection
- XSS prevention
- Role-based access control

### Infrastructure
- Docker support
- Environment-based configuration
- Logging system
- Error handling
- Health check endpoints (coming soon)

## Version History

### Versioning Scheme

We use [Semantic Versioning](https://semver.org/):
- **MAJOR** version when you make incompatible API changes
- **MINOR** version when you add functionality in a backward compatible manner
- **PATCH** version when you make backward compatible bug fixes

### How to Upgrade

See [docs/MIGRATION_GUIDE.md](docs/MIGRATION_GUIDE.md) for detailed upgrade instructions between versions.

### Breaking Changes

Breaking changes will be clearly marked in release notes with migration paths provided.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on contributing to BookBag.

## Support

- **Issues**: [GitHub Issues](https://github.com/bookbaghq/bookbag-ce/issues)
- **Discussions**: [GitHub Discussions](https://github.com/bookbaghq/bookbag-ce/discussions)
- **Documentation**: [docs/](docs/)

---

[Unreleased]: https://github.com/bookbaghq/bookbag-ce/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/bookbaghq/bookbag-ce/releases/tag/v1.0.0
