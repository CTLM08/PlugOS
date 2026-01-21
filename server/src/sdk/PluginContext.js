/**
 * PlugOS Plugin SDK - Plugin Context
 * 
 * Dependency injection container provided to plugins during activation.
 * Gives plugins access to database, logging, events, and route registration.
 */

import { Router } from 'express';
import fs from 'fs';
import path from 'path';

export class PluginContext {
  /**
   * Create a new PluginContext
   * @param {Object} options - Context options
   * @param {Object} options.plugin - The plugin instance
   * @param {Object} options.db - Database pool
   * @param {Object} options.eventBus - Event bus instance
   * @param {Object} options.app - Express app
   * @param {Object} options.config - Plugin configuration
   */
  constructor({ plugin, db, eventBus, app, config = {} }) {
    this.plugin = plugin;
    this.db = db;
    this.eventBus = eventBus;
    this.app = app;
    this.config = config;
    
    // Create plugin-specific router
    this.router = Router();
    this.routePrefix = `/api/plugins/${plugin.id}`;
    this.routes = [];
    
    // Create scoped logger
    this.logger = this._createLogger(plugin.id);
  }

  /**
   * Create a scoped logger for the plugin
   * @private
   */
  _createLogger(pluginId) {
    const prefix = `[Plugin:${pluginId}]`;
    return {
      info: (...args) => console.log(prefix, ...args),
      warn: (...args) => console.warn(prefix, ...args),
      error: (...args) => console.error(prefix, ...args),
      debug: (...args) => console.debug(prefix, ...args),
    };
  }

  /**
   * Register an API route for this plugin
   * Routes are automatically prefixed with /api/plugins/{pluginId}
   * 
   * @param {string} method - HTTP method (GET, POST, PUT, DELETE, PATCH)
   * @param {string} routePath - Route path (e.g., '/data')
   * @param {...Function} handlers - Express route handlers
   */
  registerRoute(method, routePath, ...handlers) {
    const normalizedMethod = method.toLowerCase();
    
    if (!['get', 'post', 'put', 'delete', 'patch'].includes(normalizedMethod)) {
      throw new Error(`Invalid HTTP method: ${method}`);
    }

    // Wrap handlers to inject orgId from header
    const wrappedHandlers = handlers.map(handler => {
      return async (req, res, next) => {
        try {
          // Inject orgId from header if available
          req.orgId = req.orgId || req.headers['x-org-id'];
          await handler(req, res, next);
        } catch (error) {
          this.logger.error(`Route error ${method} ${routePath}:`, error);
          res.status(500).json({ error: 'Internal server error' });
        }
      };
    });

    this.router[normalizedMethod](routePath, ...wrappedHandlers);
    this.routes.push({ method: normalizedMethod, path: routePath });
    this.logger.debug(`Registered route: ${method.toUpperCase()} ${this.routePrefix}${routePath}`);
  }

  /**
   * Mount the plugin router to the Express app
   */
  mountRoutes() {
    this.app.use(this.routePrefix, this.router);
    this.logger.info(`Mounted ${this.routes.length} routes at ${this.routePrefix}`);
  }

  /**
   * Unmount the plugin router
   */
  unmountRoutes() {
    // Find and remove the router from Express
    const stack = this.app._router?.stack;
    if (stack) {
      const index = stack.findIndex(layer => 
        layer.regexp?.test(this.routePrefix) && layer.handle === this.router
      );
      if (index !== -1) {
        stack.splice(index, 1);
        this.logger.info(`Unmounted routes from ${this.routePrefix}`);
      }
    }
  }

  /**
   * Run database migrations for this plugin
   * Looks for SQL files in the plugin's migrations folder
   * 
   * @param {string} migrationsPath - Path to migrations folder
   */
  async runMigrations(migrationsPath) {
    if (!migrationsPath) {
      // Try to find migrations folder relative to plugin
      const possiblePaths = [
        path.join(process.cwd(), 'plugins', this.plugin.id, 'migrations'),
        path.join(process.cwd(), 'node_modules', `plugos-${this.plugin.id}`, 'src', 'migrations'),
      ];
      
      for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
          migrationsPath = p;
          break;
        }
      }
    }

    if (!migrationsPath || !fs.existsSync(migrationsPath)) {
      this.logger.debug('No migrations folder found');
      return;
    }

    // Get migration files sorted by name
    const files = fs.readdirSync(migrationsPath)
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const migrationName = file.replace('.sql', '');
      
      // Check if already applied
      try {
        const result = await this.db.query(
          'SELECT id FROM plugin_migrations WHERE plugin_id = $1 AND migration_name = $2',
          [this.plugin.id, migrationName]
        );

        if (result.rows.length > 0) {
          this.logger.debug(`Migration already applied: ${migrationName}`);
          continue;
        }
      } catch (error) {
        // plugin_migrations table might not exist yet
        if (!error.message.includes('does not exist')) {
          throw error;
        }
      }

      // Run migration
      const sql = fs.readFileSync(path.join(migrationsPath, file), 'utf8');
      this.logger.info(`Running migration: ${migrationName}`);
      
      await this.db.query(sql);
      
      // Record migration
      try {
        await this.db.query(
          'INSERT INTO plugin_migrations (plugin_id, migration_name) VALUES ($1, $2)',
          [this.plugin.id, migrationName]
        );
      } catch (error) {
        // Table might not exist, that's ok for initial setup
        this.logger.debug('Could not record migration (table may not exist yet)');
      }
    }
  }

  /**
   * Get configuration value
   * @param {string} key - Config key
   * @param {*} defaultValue - Default value if not set
   * @returns {*} Config value
   */
  getConfig(key, defaultValue) {
    return this.config[key] ?? defaultValue;
  }

  /**
   * Query the database
   * Convenience method that uses the injected pool
   * 
   * @param {string} sql - SQL query
   * @param {Array} params - Query parameters
   * @returns {Promise<Object>} Query result
   */
  async query(sql, params = []) {
    return this.db.query(sql, params);
  }
}

export default PluginContext;
