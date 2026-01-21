# 🧩 Plugin SDK Development

This guide explains how to create **SDK packages** for PlugOS that can be published and shared with the community.

## Overview

PlugOS supports two types of extensions:

| Type | Description | Distribution |
|------|-------------|--------------|
| **Built-in Plugs** | Core features bundled with PlugOS | Part of main repo |
| **SDK Packages** | Third-party extensions | Published to npm |

This guide focuses on creating **SDK packages** that others can install via npm.

---

## SDK Package Structure

A PlugOS SDK package should follow this structure:

```
plugos-example-plugin/
├── package.json          # npm package config
├── plugin.json           # PlugOS manifest
├── README.md             # Documentation
├── LICENSE               # License file
├── src/
│   ├── index.js          # Main entry point
│   ├── routes/           # API route handlers
│   └── migrations/       # Database migrations
└── client/
    └── index.jsx         # React component
```

---

## Creating an SDK Package

### Step 1: Initialize the Package

```bash
mkdir plugos-my-plugin
cd plugos-my-plugin
npm init
```

Set these in `package.json`:

```json
{
  "name": "plugos-my-plugin",
  "version": "1.0.0",
  "description": "My awesome PlugOS plugin",
  "main": "src/index.js",
  "keywords": ["plugos", "plugin", "plugos-plugin"],
  "peerDependencies": {
    "express": "^4.18.0",
    "pg": "^8.0.0"
  }
}
```

> 💡 **Tip**: Use the `plugos-` prefix and `plugos-plugin` keyword for discoverability.

---

### Step 2: Create the Manifest

Create `plugin.json`:

```json
{
  "id": "my-plugin",
  "name": "My Plugin",
  "version": "1.0.0",
  "description": "Description of what this plugin does",
  "author": "Your Name",
  "license": "MIT",
  "icon": "mdi:puzzle",
  "main": "src/index.js",
  "client": "client/index.jsx",
  
  "permissions": {
    "my-plugin:view": "View plugin content",
    "my-plugin:manage": "Manage plugin settings"
  },
  
  "menu": {
    "label": "My Plugin",
    "icon": "mdi:puzzle",
    "path": "/my-plugin",
    "order": 100,
    "requiredPermission": "my-plugin:view"
  },
  
  "config": {
    "setting1": {
      "type": "string",
      "label": "Setting 1",
      "default": "value"
    }
  }
}
```

---

### Step 3: Export Plugin Class

Create `src/index.js`:

```javascript
/**
 * PlugOS SDK Plugin
 */
export default class MyPlugin {
  constructor(manifest) {
    this.manifest = manifest;
    this.id = manifest.id;
  }

  /**
   * Called when the plugin is activated
   * @param {PluginContext} context - Injected dependencies
   */
  async activate(context) {
    const { db, eventBus, logger, registerRoute } = context;
    
    this.db = db;
    this.logger = logger;

    // Register API routes
    registerRoute('GET', '/data', this.getData.bind(this));
    registerRoute('POST', '/data', this.createData.bind(this));

    // Listen to system events
    eventBus.on('user.created', this.onUserCreated.bind(this));

    this.logger.info('Plugin activated');
  }

  /**
   * Called when the plugin is deactivated
   */
  async deactivate() {
    this.logger.info('Plugin deactivated');
  }

  /**
   * Called when plugin is first installed
   */
  async onInstall(context) {
    // Run database migrations
    await context.runMigrations();
  }

  /**
   * Called when plugin is uninstalled
   */
  async onUninstall(context) {
    // Optional: cleanup database tables
  }

  // Route handlers
  async getData(req, res) {
    const result = await this.db.query(
      'SELECT * FROM my_plugin_data WHERE org_id = $1',
      [req.orgId]
    );
    res.json(result.rows);
  }

  async createData(req, res) {
    // Handle creation
  }

  // Event handlers
  async onUserCreated(user) {
    this.logger.info(`New user: ${user.email}`);
  }
}
```

---

### Step 4: Create Database Migration

Create `src/migrations/001_initial.sql`:

```sql
-- Create plugin tables
CREATE TABLE IF NOT EXISTS my_plugin_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_my_plugin_org ON my_plugin_data(org_id);
```

---

### Step 5: Create React Component

Create `client/index.jsx`:

```jsx
import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';

/**
 * PlugOS Plugin Component
 * @param {Object} props
 * @param {Object} props.context - Plugin context (user, org, api)
 */
export default function MyPlugin({ context }) {
  const { api, currentOrg, user } = context;
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await api.get('/data');
      setData(response.data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Icon icon="mdi:loading" className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">My Plugin</h1>
      {/* Your UI */}
    </div>
  );
}
```

---

## Plugin Context API

Your plugin receives a `context` object with these utilities:

| Property | Type | Description |
|----------|------|-------------|
| `db` | Pool | PostgreSQL connection pool |
| `logger` | Logger | Scoped logging (`info`, `warn`, `error`) |
| `eventBus` | EventBus | Subscribe to system events |
| `config` | Object | Plugin configuration values |
| `registerRoute` | Function | Register API endpoints |
| `runMigrations` | Function | Run SQL migrations |

### Available Events

| Event | Payload | Description |
|-------|---------|-------------|
| `user.created` | `{ id, email, name }` | New user registered |
| `user.login` | `{ id, email }` | User logged in |
| `org.created` | `{ id, name, slug }` | New organization created |
| `plug.enabled` | `{ plugId, orgId }` | Plug enabled for org |
| `plug.disabled` | `{ plugId, orgId }` | Plug disabled for org |

---

## Publishing Your Package

### 1. Test Locally

```bash
# In your plugin directory
npm link

# In PlugOS server directory
npm link plugos-my-plugin
```

### 2. Publish to npm

```bash
npm login
npm publish
```

### 3. Document Installation

Add to your README:

```markdown
## Installation

1. Install the package:
   ```bash
   npm install plugos-my-plugin
   ```

2. Register in PlugOS (see SDK docs)

3. Enable the plugin from the admin dashboard
```

---

## Best Practices

### Naming Convention
- Package name: `plugos-{name}` (e.g., `plugos-analytics`)
- Plugin ID: `{name}` (e.g., `analytics`)
- Use kebab-case throughout

### Security
- Never hardcode credentials
- Validate all user inputs
- Scope all queries by `org_id`
- Use parameterized SQL queries

### Compatibility
- Specify `peerDependencies` for PlugOS core libs
- Test with multiple PlugOS versions
- Document minimum PlugOS version required

### Documentation
- Include clear README with screenshots
- Document all configuration options
- Provide example usage

---

## Example Packages

Check out these example SDK packages for reference:
- [plugos-analytics](https://github.com/example/plugos-analytics) - Analytics dashboard
- [plugos-chat](https://github.com/example/plugos-chat) - Team messaging

---

## Need Help?

- Open an issue on the [PlugOS repository](https://github.com/liming/PlugOS)
- Check the [API Reference](./api-reference.md)
- Review the [Architecture](./architecture.md)
