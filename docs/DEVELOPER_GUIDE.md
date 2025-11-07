# Developer Guide

Guide for developers extending and customizing BookBag.

## Table of Contents

- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Backend Development](#backend-development)
- [Frontend Development](#frontend-development)
- [Database & Migrations](#database--migrations)
- [Adding New Features](#adding-new-features)
- [Plugin Development](#plugin-development)
- [Testing](#testing)
- [Best Practices](#best-practices)

## Development Setup

### Prerequisites

- Node.js 18+ (20+ recommended)
- npm 9+
- Git
- Code editor (VS Code recommended)
- Basic knowledge of Node.js, React, and databases

### Environment Setup

1. **Clone Repository**
   ```bash
   git clone https://github.com/bookbaghq/bookbag-ce.git
   cd bookbag-ce
   ```

2. **Install Dependencies**
   ```bash
   # Backend dependencies
   npm install

   # Frontend dependencies
   cd nextjs-app
   npm install
   cd ..
   ```

3. **Install MasterRecord CLI**
   ```bash
   npm install -g masterrecord
   ```

4. **Setup Database Migrations**
   ```bash
   # Enable migrations for all components
   masterrecord enable-migrations-all

   # Run migrations for development
   master=development masterrecord update-database-all
   ```

5. **Start Development Servers**
   ```bash
   # Terminal 1: Backend
   npm run dev

   # Terminal 2: Frontend
   cd nextjs-app && npm run dev
   ```

### Development Tools

**Recommended VS Code Extensions:**
- ESLint
- Prettier
- ES7+ React/Redux/React-Native snippets
- JavaScript (ES6) code snippets
- SQLite Viewer

**Recommended npm Scripts:**
```bash
npm run dev              # Start backend development server
npm run dev:prod         # Start backend in production mode
npm run pm2:status       # View PM2 process status
npm run pm2:logs         # View PM2 logs
npm run pm2:restart      # Restart all PM2 processes
```

## Project Structure

### Root Directory

```
bookbag-ce/
├── components/          # Backend components (MVC structure)
│   ├── admin/          # Admin management
│   ├── chats/          # Chat functionality
│   ├── models/         # Model management
│   ├── rag/            # RAG system
│   ├── user/           # User management
│   ├── workspace/      # Workspace management
│   └── media/          # Media handling
├── nextjs-app/         # Frontend Next.js application
│   ├── app/            # App router pages and layouts
│   ├── components/     # React components
│   ├── services/       # API service layer
│   └── public/         # Static assets
├── app/                # Backend core
│   ├── sockets/        # WebSocket handlers
│   └── middleware/     # Express middleware
├── config/             # Configuration files
│   ├── environments/   # Environment configs
│   └── initializers/   # App initializers
├── bb-storage/         # File storage
│   └── media/         # Uploaded media files
├── docs/              # Documentation
└── scripts/           # Utility scripts
```

### Component Structure

Each backend component follows MVC pattern:

```
components/[component-name]/
├── app/
│   ├── controllers/
│   │   └── api/              # API controllers
│   │       └── [name]Controller.js
│   ├── models/              # Data models
│   │   ├── [model].js
│   │   └── db/
│   │       ├── [env].sqlite3  # Database file
│   │       └── migrations/    # Database migrations
│   └── services/            # Business logic
│       └── [name]Service.js
└── routes.json              # Route definitions
```

## Backend Development

### MasterController Framework

BookBag uses MasterController, a lightweight MVC framework for Node.js.

#### Creating a Controller

```javascript
// components/example/app/controllers/api/exampleController.js
class exampleController {
  constructor(req) {
    this._currentUser = req.authService.currentUser(req.request, req.exampleContext);
    this._exampleContext = req.exampleContext;
  }

  returnJson(obj) {
    return obj;
  }

  async list(obj) {
    const items = this._exampleContext.ExampleModel.all();
    return this.returnJson({
      success: true,
      items
    });
  }

  async get(obj) {
    const { id } = obj.params;
    const item = this._exampleContext.ExampleModel.find(id);

    if (!item) {
      return this.returnJson({
        success: false,
        error: 'Item not found'
      });
    }

    return this.returnJson({
      success: true,
      item
    });
  }

  async create(obj) {
    const { name, description } = obj.body;

    const ExampleModel = require('../../models/exampleModel');
    const item = new ExampleModel();
    item.name = name;
    item.description = description;
    item.created_at = Date.now().toString();

    this._exampleContext.ExampleModel.add(item);
    this._exampleContext.saveChanges();

    return this.returnJson({
      success: true,
      item
    });
  }

  async update(obj) {
    const { id } = obj.params;
    const updates = obj.body;

    const item = this._exampleContext.ExampleModel.find(id);
    if (!item) {
      return this.returnJson({
        success: false,
        error: 'Item not found'
      });
    }

    Object.assign(item, updates);
    item.updated_at = Date.now().toString();
    this._exampleContext.saveChanges();

    return this.returnJson({
      success: true,
      item
    });
  }

  async delete(obj) {
    const { id } = obj.params;

    const item = this._exampleContext.ExampleModel.find(id);
    if (!item) {
      return this.returnJson({
        success: false,
        error: 'Item not found'
      });
    }

    this._exampleContext.ExampleModel.remove(item);
    this._exampleContext.saveChanges();

    return this.returnJson({
      success: true
    });
  }
}

module.exports = exampleController;
```

**Key Points:**
- Class name must be camelCase (not PascalCase)
- Constructor receives `req` with contexts and services
- Methods receive `obj` parameter (not `req, res`)
- Return data using `this.returnJson()`
- Access database via context (`this._exampleContext`)

#### Defining Routes

```json
// components/example/routes.json
{
  "routes": {
    "exampleController": {
      "list": { "type": "get", "path": "/api/example" },
      "get": { "type": "get", "path": "/api/example/:id" },
      "create": { "type": "post", "path": "/api/example" },
      "update": { "type": "put", "path": "/api/example/:id" },
      "delete": { "type": "delete", "path": "/api/example/:id" }
    }
  }
}
```

### MasterRecord ORM

MasterRecord provides database operations.

#### Creating a Model

```javascript
// components/example/app/models/exampleModel.js
const MasterRecord = require("masterrecord");

class ExampleModel extends MasterRecord {
  constructor() {
    super();
  }

  // Database fields
  id(db) { return { type: "INTEGER PRIMARY KEY AUTOINCREMENT" }; }
  name(db) { return { type: "TEXT NOT NULL" }; }
  description(db) { return { type: "TEXT" }; }
  is_active(db) { return { type: "INTEGER DEFAULT 1" }; }
  created_at(db) { return { type: "TEXT NOT NULL" }; }
  updated_at(db) { return { type: "TEXT" }; }

  // Relationships
  belongsTo() {
    return [
      // { model: "User", foreignKey: "user_id" }
    ];
  }

  hasMany() {
    return [
      // { model: "RelatedModel", foreignKey: "example_id" }
    ];
  }
}

module.exports = ExampleModel;
```

**Field Types:**
- `INTEGER` - Numbers, IDs
- `TEXT` - Strings, large text
- `REAL` - Floating point numbers
- `BLOB` - Binary data

**Common Constraints:**
- `PRIMARY KEY` - Unique identifier
- `AUTOINCREMENT` - Auto-incrementing ID
- `NOT NULL` - Required field
- `DEFAULT value` - Default value
- `UNIQUE` - Must be unique

#### Querying Data

```javascript
// Find by ID
const item = context.ExampleModel.find(id);

// Get all records
const items = context.ExampleModel.all();

// Get first record
const first = context.ExampleModel.first();

// Get single record (for singletons)
const single = context.ExampleModel.single();

// Query with conditions
const results = context.ExampleModel.where(item => item.is_active === 1);

// Query with complex conditions
const filtered = context.ExampleModel.where(item => {
  return item.is_active === 1 && item.name.includes('test');
});

// Relationships
const itemWithRelations = context.ExampleModel.find(id);
const user = itemWithRelations.User(); // belongsTo
const children = itemWithRelations.RelatedModels(); // hasMany
```

#### Creating Migrations

```bash
# Generate migration
masterrecord generate-migration example InitMigration
```

This creates: `components/example/app/models/db/migrations/[timestamp]_Init_migration.js`

```javascript
class InitMigration {
  up(table) {
    this.init(table);
    this.createTable(table.ExampleModel);

    // Seed data
    this.seed('ExampleModel', {
      name: 'Default Item',
      description: 'Default description',
      is_active: 1,
      created_at: Date.now().toString(),
      updated_at: Date.now().toString()
    });
  }

  down(table) {
    this.dropTable(table.ExampleModel);
  }

  // Helper for seeding
  seed(modelName, data) {
    const Model = require(`../../${modelName.toLowerCase()}`);
    const instance = new Model();
    Object.assign(instance, data);
    this._context[modelName].add(instance);
    this._context.saveChanges();
  }
}

module.exports = InitMigration;
```

**Run Migrations:**
```bash
master=development masterrecord update-database-all
master=production masterrecord update-database-all
```

### Services

Services contain business logic separate from controllers.

```javascript
// components/example/app/services/exampleService.js
class ExampleService {
  constructor(context, currentUser) {
    this._context = context;
    this._currentUser = currentUser;
  }

  validateData(data) {
    const errors = [];

    if (!data.name || data.name.trim() === '') {
      errors.push('Name is required');
    }

    if (data.name && data.name.length > 100) {
      errors.push('Name must be less than 100 characters');
    }

    return errors;
  }

  async processItem(item) {
    // Complex business logic here
    // e.g., calculations, external API calls, etc.

    return {
      success: true,
      result: item
    };
  }

  getUserItems(userId) {
    return this._context.ExampleModel.where(item => {
      return item.user_id === userId && item.is_active === 1;
    });
  }
}

module.exports = ExampleService;
```

**Using Services in Controllers:**
```javascript
const ExampleService = require('../../services/exampleService');

class exampleController {
  constructor(req) {
    this._context = req.exampleContext;
    this._service = new ExampleService(this._context, this._currentUser);
  }

  async create(obj) {
    const errors = this._service.validateData(obj.body);
    if (errors.length > 0) {
      return this.returnJson({
        success: false,
        errors
      });
    }

    // Continue with creation...
  }
}
```

## Frontend Development

### Next.js App Router

BookBag uses Next.js 14+ with App Router.

#### Page Structure

```javascript
// nextjs-app/app/example/page.js
'use client';

import { useState, useEffect } from 'react';
import exampleService from '@/services/exampleService';

export default function ExamplePage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    try {
      const result = await exampleService.list();
      if (result.success) {
        setItems(result.items);
      }
    } catch (error) {
      console.error('Failed to load items:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Examples</h1>
      <div className="space-y-2">
        {items.map(item => (
          <div key={item.id} className="p-4 border rounded">
            <h2 className="font-semibold">{item.name}</h2>
            <p>{item.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Key Points:**
- Use `'use client'` directive for client components
- Server components by default (no directive needed)
- Tailwind CSS for styling
- Shadcn/ui components for UI

#### API Service Layer

```javascript
// nextjs-app/services/exampleService.js
import apiConfig from '../apiConfig.json';

class ExampleService {
  constructor() {
    this.baseUrl = apiConfig.ApiConfig.main;
  }

  async list() {
    const response = await fetch(`${this.baseUrl}/api/example`, {
      credentials: 'include'
    });
    return await response.json();
  }

  async get(id) {
    const response = await fetch(`${this.baseUrl}/api/example/${id}`, {
      credentials: 'include'
    });
    return await response.json();
  }

  async create(data) {
    const response = await fetch(`${this.baseUrl}/api/example`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data)
    });
    return await response.json();
  }

  async update(id, data) {
    const response = await fetch(`${this.baseUrl}/api/example/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data)
    });
    return await response.json();
  }

  async delete(id) {
    const response = await fetch(`${this.baseUrl}/api/example/${id}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    return await response.json();
  }
}

export default new ExampleService();
```

#### Using Shadcn/ui Components

```bash
# Install a component
cd nextjs-app
npx shadcn@latest add button
npx shadcn@latest add dialog
npx shadcn@latest add input
```

```javascript
// Using components
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

export default function ExampleForm() {
  return (
    <div className="space-y-4">
      <Input placeholder="Enter name" />
      <Button onClick={() => console.log('Clicked')}>
        Submit
      </Button>
    </div>
  );
}
```

## Database & Migrations

### Creating a New Database Context

1. **Define Context in Config**
   ```json
   // config/environments/env.development.json
   {
     "exampleContext": {
       "connection": "/components/example/db/development.sqlite3",
       "password": "",
       "username": "",
       "type": "sqlite"
     }
   }
   ```

2. **Register Context**
   ```javascript
   // config/initializers/config.js
   // Context is automatically loaded from environment config
   ```

3. **Create Migration**
   ```bash
   masterrecord generate-migration example InitMigration
   ```

4. **Run Migration**
   ```bash
   master=development masterrecord update-database example
   ```

### Migration Best Practices

- **Always use timestamps** for `created_at` and `updated_at`
- **Use soft deletes** with `deleted_at` for recoverability
- **Add indexes** for frequently queried fields
- **Seed default data** in migrations
- **Test migrations** before production

## Adding New Features

### Example: Adding a New Component

Let's add a "Tasks" feature as an example.

**Step 1: Create Component Structure**
```bash
mkdir -p components/tasks/app/{controllers/api,models,services}
mkdir -p components/tasks/app/models/db/migrations
```

**Step 2: Create Model**
```javascript
// components/tasks/app/models/task.js
const MasterRecord = require("masterrecord");

class Task extends MasterRecord {
  id(db) { return { type: "INTEGER PRIMARY KEY AUTOINCREMENT" }; }
  user_id(db) { return { type: "INTEGER NOT NULL" }; }
  title(db) { return { type: "TEXT NOT NULL" }; }
  description(db) { return { type: "TEXT" }; }
  status(db) { return { type: "TEXT DEFAULT 'pending'" }; }
  created_at(db) { return { type: "TEXT NOT NULL" }; }
  updated_at(db) { return { type: "TEXT" }; }

  belongsTo() {
    return [{ model: "User", foreignKey: "user_id" }];
  }
}

module.exports = Task;
```

**Step 3: Create Controller**
```javascript
// components/tasks/app/controllers/api/taskController.js
class taskController {
  constructor(req) {
    this._currentUser = req.authService.currentUser(req.request, req.userContext);
    this._taskContext = req.taskContext;
  }

  returnJson(obj) { return obj; }

  async list(obj) {
    const tasks = this._taskContext.Task.where(t =>
      t.user_id === this._currentUser.id
    );
    return this.returnJson({ success: true, tasks });
  }

  // ... other methods
}

module.exports = taskController;
```

**Step 4: Define Routes**
```json
// components/tasks/routes.json
{
  "routes": {
    "taskController": {
      "list": { "type": "get", "path": "/api/tasks" },
      "create": { "type": "post", "path": "/api/tasks" },
      "update": { "type": "put", "path": "/api/tasks/:id" },
      "delete": { "type": "delete", "path": "/api/tasks/:id" }
    }
  }
}
```

**Step 5: Add Context to Config**
```json
// config/environments/env.development.json
{
  "taskContext": {
    "connection": "/components/tasks/db/development.sqlite3",
    "type": "sqlite"
  }
}
```

**Step 6: Create Migration**
```bash
masterrecord generate-migration tasks InitMigration
```

**Step 7: Run Migration**
```bash
master=development masterrecord update-database tasks
```

**Step 8: Create Frontend Service**
```javascript
// nextjs-app/services/taskService.js
import apiConfig from '../apiConfig.json';

class TaskService {
  constructor() {
    this.baseUrl = apiConfig.ApiConfig.main;
  }

  async list() {
    const response = await fetch(`${this.baseUrl}/api/tasks`, {
      credentials: 'include'
    });
    return await response.json();
  }

  // ... other methods
}

export default new TaskService();
```

**Step 9: Create Frontend Page**
```javascript
// nextjs-app/app/tasks/page.js
'use client';

import { useState, useEffect } from 'react';
import taskService from '@/services/taskService';

export default function TasksPage() {
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    const result = await taskService.list();
    if (result.success) {
      setTasks(result.tasks);
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Tasks</h1>
      {/* Task list UI */}
    </div>
  );
}
```

## Plugin Development

See [Plugin Development Guide](plugins/PLUGIN_DEVELOPMENT.md) for detailed plugin development documentation.

**Quick Example:**
```javascript
// bb-plugins/my-plugin/index.js
module.exports = {
  name: 'my-plugin',
  version: '1.0.0',

  init(hookService) {
    hookService.addFilter('chat_message', this.modifyMessage.bind(this));
  },

  modifyMessage(message) {
    // Modify message before sending to LLM
    return message;
  }
};
```

## Testing

### Backend Testing

```javascript
// components/example/app/controllers/api/__tests__/exampleController.test.js
const ExampleController = require('../exampleController');

describe('ExampleController', () => {
  let controller;

  beforeEach(() => {
    // Setup mock context
    const mockReq = {
      exampleContext: {
        ExampleModel: {
          all: jest.fn(),
          find: jest.fn()
        }
      },
      authService: {
        currentUser: jest.fn()
      }
    };

    controller = new ExampleController(mockReq);
  });

  test('list returns all items', async () => {
    const mockItems = [{ id: 1, name: 'Test' }];
    controller._exampleContext.ExampleModel.all.mockReturnValue(mockItems);

    const result = await controller.list({});

    expect(result.success).toBe(true);
    expect(result.items).toEqual(mockItems);
  });
});
```

### Frontend Testing

```javascript
// nextjs-app/app/example/__tests__/page.test.js
import { render, screen } from '@testing-library/react';
import ExamplePage from '../page';

jest.mock('@/services/exampleService');

describe('ExamplePage', () => {
  test('renders items', async () => {
    render(<ExamplePage />);

    // Wait for data to load
    const item = await screen.findByText('Test Item');
    expect(item).toBeInTheDocument();
  });
});
```

## Best Practices

### Code Style

- **Use consistent naming**: camelCase for variables/functions, PascalCase for classes
- **Write descriptive names**: `getUserTasks()` not `get()`
- **Keep functions small**: Single responsibility principle
- **Comment complex logic**: Explain why, not what
- **Use async/await**: Avoid callback hell

### Error Handling

```javascript
// Good error handling
async create(obj) {
  try {
    // Validate input
    if (!obj.body.name) {
      return this.returnJson({
        success: false,
        error: 'Name is required'
      });
    }

    // Create item
    const item = new Item();
    item.name = obj.body.name;
    this._context.Item.add(item);
    this._context.saveChanges();

    return this.returnJson({
      success: true,
      item
    });
  } catch (error) {
    console.error('Error creating item:', error);
    return this.returnJson({
      success: false,
      error: 'Failed to create item'
    });
  }
}
```

### Security

- **Validate all input**: Never trust user input
- **Use parameterized queries**: Prevent SQL injection
- **Check permissions**: Verify user can perform action
- **Sanitize output**: Prevent XSS attacks
- **Hash passwords**: Use bcrypt
- **Use HTTPS in production**: Protect data in transit

### Performance

- **Limit query results**: Paginate large datasets
- **Use indexes**: Speed up database queries
- **Cache when possible**: Reduce redundant calculations
- **Lazy load data**: Don't load everything upfront
- **Optimize images**: Compress and resize

### Database

- **Use transactions**: For multi-step operations
- **Add indexes**: On frequently queried fields
- **Soft delete**: Allow recovery before permanent deletion
- **Timestamp everything**: created_at, updated_at
- **Normalize data**: Avoid duplication

## Debugging

### Backend Debugging

```javascript
// Add debug logging
console.log('User ID:', this._currentUser.id);
console.log('Request body:', obj.body);
console.log('Query result:', items);

// Check database queries
const items = this._context.ExampleModel.all();
console.log('Found items:', items.length);
```

### Frontend Debugging

```javascript
// React DevTools
// Install: https://react.dev/learn/react-developer-tools

// Console debugging
console.log('State:', items);
console.log('Service response:', result);

// Network tab
// Check API requests/responses in browser DevTools
```

### Common Issues

**Backend:**
- Controller not found: Check class name is camelCase
- Database errors: Run migrations
- Authentication errors: Check current user setup
- Route not working: Verify routes.json

**Frontend:**
- Component not rendering: Check console for errors
- API calls failing: Check network tab, CORS settings
- State not updating: Verify useState/useEffect usage
- Hydration errors: Check server/client differences

## Next Steps

- Review [Architecture Documentation](ARCHITECTURE.md)
- Learn about [Plugin Development](plugins/PLUGIN_DEVELOPMENT.md)
- Check [API Documentation](api/API_DOCUMENTATION.md)
- Read [Contributing Guidelines](../CONTRIBUTING.md)

## Resources

- [MasterController Documentation](https://github.com/yourusername/mastercontroller)
- [MasterRecord Documentation](https://github.com/yourusername/masterrecord)
- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [Shadcn/ui](https://ui.shadcn.com)
