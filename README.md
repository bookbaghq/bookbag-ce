# Bookbag

## Canonical source
The canonical source of Bookbag, where active development occurs, is hosted on GitHub under the `bookbagHQ` organization. See the organization home for repositories and releases:

- https://github.com/bookbaghq

If you are working from a read-only mirror or an exported archive, please open issues and pull requests against the canonical source.

## Open software to collaborate on AI chat and admin workflows
Bookbag is a full‑stack AI chat and admin platform with:

- Fine‑grained user access controls
- Modern code review flows (PRs/MRs) in your host platform
- End‑to‑end streaming chat experience
- Admin tools for users, models, mail, media, and chats

### Core features
- Chat client with streaming responses and “thinking” UI
- Admin dashboard: users, models, mail, media, chats
- Model library and server model management (OpenAI‑compatible, Grok)
- Auth flows (login, register, reset) under `bb-auth/*`
- Mail logs, templates, SMTP settings

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
- Optional databases:
  - SQLite (default in development)
  - MySQL 8+ (for test/production examples)

Supported OS: macOS/Linux/Windows (Node.js supported platforms). See `config/environments/*.json` for environment‑specific settings.

## Installation
The recommended way to run Bookbag for development is the node‑native setup:

1) Install dependencies
```bash
# install Masterrecord
npm Install -g masterrecord
# run migrations development
master=development masterrecord update-database-all
# run migrations production
master=development masterrecord update-database-all
# from the repo root
npm install
#then
cd nextjs-app && npm install
```

2) Start the backend
```bash
# from the repo root
# master=development selects config/environments/env.development.json
master=development node server.js
```
Backend default: http://127.0.0.1:8080

3) Start the frontend (Next.js)
```bash
cd nextjs-app
npm run dev
```
Frontend default: http://localhost:3000 (root redirects to `/bb-auth/login`).

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
- Unified chat experience with streaming/tokens/thinking UI
- Admin experiences for users, models, mail, and media
- Works locally (SQLite) and can scale with MySQL‑backed contexts
- Clean Next.js UI and socket‑based live updates
