# Bookbag

A full-stack AI chat and admin platform. The backend is a Node.js server (MasterController + MasterRecord) that exposes API routes and sockets for streaming AI responses. The frontend is a modern Next.js App Router app that provides a chat client, admin tools, model configuration, mail tools, and user management.

## Features

- Chat client with streaming responses and thinking UI
- Admin dashboard: users, models, mail, media, and chats
- Model library and server model management (OpenAI-compatible, Grok)
- User auth flows (login, register, reset) under `bb-auth/*`
- Mail logs, settings, and templating
- Media library and basic content UI components
- Server-sent events / sockets for live updates

## Repository layout

```
root/
  server.js                           # Backend HTTP server (MasterController)
  config/                             # Server and environment configuration
  components/                         # Backend domain components (chats, users, models, mail)
  app/                                # Backend controllers, views, sockets
  nextjs-app/                         # Next.js frontend (App Router)
    app/                              # Routes: bb-client, bb-admin, bb-auth, etc.
    services/                         # Frontend API clients
    components/                       # Shared UI components
```

## Prerequisites

- Node.js 18+ (Node 20+ recommended)
- npm 9+
- Optional (for MySQL environments):
  - MySQL 8+ running at `127.0.0.1:3306` (or your own host/port)

Dev environment defaults to SQLite for the backend contexts; test/prod configs can use MySQL.

## Quick start (development)

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

2) Start the backend server

```bash
# from the repo root
# master=development tells MasterController to use env.development.json
master=development node server.js
```

By default (see `config/environments/env.development.json`), the server binds:
- HTTP: `http://127.0.0.1:8080`

3) Start the frontend (Next.js)

```bash
cd nextjs-app
npm run dev
```

The app will be available at `http://localhost:3000`. The root path `/` redirects to `/bb-auth/login`.

## Configuration

Server configuration lives under `config/environments`:

- `env.development.json` (defaults to SQLite file DBs inside `components/*/db/development.sqlite3`)
- `env.production.json` (example MySQL configurations)

Key sections per file:

- `server` → hostname, httpPort
- `error` → 404/500 paths
- `chatContext`, `userContext`, `modelContext`, `mailContext` → database connections
- `jwtAPI` → token secrets
- `openai`, `grok` → provider base URLs

### MySQL configuration (test/prod)

If you choose MySQL, ensure the contexts are valid. Use separate `host` and `port` keys (do not append `:3306` to the host):

```json
{
  "userContext":  { "host": "127.0.0.1", "port": 3306, "user": "root", "password": "password", "database": "User",  "type": "mysql" },
  "modelContext": { "host": "127.0.0.1", "port": 3306, "user": "root", "password": "password", "database": "Model", "type": "mysql" },
  "mailContext":  { "host": "127.0.0.1", "port": 3306, "user": "root", "password": "password", "database": "Mail",  "type": "mysql" },
  "chatContext":  { "host": "127.0.0.1", "port": 3306, "user": "root", "password": "password", "database": "Chat",  "type": "mysql" }
}
```

Create the databases once (schemas will be created/managed by the app):

```sql
CREATE DATABASE IF NOT EXISTS `User`;
CREATE DATABASE IF NOT EXISTS `Model`;
CREATE DATABASE IF NOT EXISTS `Mail`;
CREATE DATABASE IF NOT EXISTS `Chat`;
```

If you see `ENOTFOUND` errors, remove `:3306` from the `host` and use a separate `port` key. If you see `ER_ACCESS_DENIED_ERROR`, update the `user`/`password` to valid MySQL credentials.

### Frontend API base

The Next.js app reads `nextjs-app/apiConfig.json` to reach the backend. Ensure it points to your server base (e.g., `http://127.0.0.1:8080`).

## Running in production

1) Build the frontend and run it in production mode:

```bash
cd nextjs-app
npm run build
npm run start
```

2) Start the backend using the desired environment:

```bash
# production example (configure env.production.json first)
master=production node server.js
```

You may front the two processes with a reverse proxy (Nginx/Caddy) to serve the Next.js app and proxy API calls to the backend.

## Common routes

- Frontend
  - `/` → redirects to `/bb-auth/login`
  - `/bb-client` → chat client
  - `/bb-admin` → admin dashboard (users, models, mail, media, chats)
  - `/bb-auth/*` → login, register, reset

- Backend (examples; actual routes are in `config/routes.js` and component routes)
  - Components expose under `/bb-<component>/api/*` (users, models, mail, chats)

## Development tips

- The backend uses MasterController and MasterRecord. `master=<env>` selects which `env.<env>.json` to load.
- Logs are written under `log/<environment>.log`.
- For streaming chats, make sure your browser allows cookies against the backend domain so sessions are sent.
- If you switch to MySQL, ensure all four DBs exist and your credentials are correct.

## Troubleshooting

- “Module not found: ... Navbar” → The app was updated to use `@/components/navigation/header` instead of a `(home)/_components/Navbar` import.
- “value prop on input should not be null” → Inputs have been normalized; if you add new forms, prefer empty strings over null.
- MySQL errors:
  - `ENOTFOUND` → use `host: "127.0.0.1", port: 3306` (not `"localhost:3306"`).
  - `ER_BAD_DB_ERROR` → create the missing database via `CREATE DATABASE IF NOT EXISTS ...`.
  - `ER_ACCESS_DENIED_ERROR` → fix the MySQL `user`/`password`.

## License

Proprietary — for internal use unless otherwise specified.
