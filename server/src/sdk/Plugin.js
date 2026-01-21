/**
 * PlugOS Plugin SDK - Plugin Base Class
 * 
 * Base class that all SDK plugins should extend.
 * Provides lifecycle hooks and standard interface.
 */

export class Plugin {
  /**
   * Create a new Plugin instance
   * @param {Object} manifest - The plugin.json manifest
   */
  constructor(manifest) {
    this.manifest = manifest;
    this.id = manifest.id;
    this.name = manifest.name;
    this.version = manifest.version;
    this.isActive = false;
    this.context = null;
  }

  /**
   * Called when the plugin is activated
   * Override this method to initialize your plugin
   * @param {PluginContext} context - The plugin context with dependencies
   */
  async activate(context) {
    this.context = context;
    this.isActive = true;
  }

  /**
   * Called when the plugin is deactivated
   * Override this method to cleanup resources
   */
  async deactivate() {
    this.isActive = false;
    this.context = null;
  }

  /**
   * Called when the plugin is first installed
   * Override this method to run initial setup (e.g., migrations)
   * @param {PluginContext} context - The plugin context
   */
  async onInstall(context) {
    // Default: run migrations
    await context.runMigrations();
  }

  /**
   * Called when the plugin is uninstalled
   * Override this method to cleanup database tables and data
   * @param {PluginContext} context - The plugin context
   */
  async onUninstall(context) {
    // Override to cleanup
  }

  /**
   * Get plugin info
   * @returns {Object} Plugin metadata
   */
  getInfo() {
    return {
      id: this.id,
      name: this.name,
      version: this.version,
      description: this.manifest.description,
      author: this.manifest.author,
      icon: this.manifest.icon,
      isActive: this.isActive,
    };
  }
}

/**
 * PlugOS Plugin SDK - Plugin Builder
 * 
 * Fluent API for building plugins without extending the base class.
 */
export class PluginBuilder {
  constructor(manifest) {
    this.manifest = manifest;
    this._activateHandler = async () => {};
    this._deactivateHandler = async () => {};
    this._installHandler = async (ctx) => ctx.runMigrations();
    this._uninstallHandler = async () => {};
    this._routes = [];
    this._events = [];
  }

  /**
   * Set activation handler
   * @param {Function} handler - Async function called on activation
   */
  onActivate(handler) {
    this._activateHandler = handler;
    return this;
  }

  /**
   * Set deactivation handler
   * @param {Function} handler - Async function called on deactivation
   */
  onDeactivate(handler) {
    this._deactivateHandler = handler;
    return this;
  }

  /**
   * Set install handler
   * @param {Function} handler - Async function called on install
   */
  onInstall(handler) {
    this._installHandler = handler;
    return this;
  }

  /**
   * Set uninstall handler
   * @param {Function} handler - Async function called on uninstall
   */
  onUninstall(handler) {
    this._uninstallHandler = handler;
    return this;
  }

  /**
   * Add a route
   * @param {string} method - HTTP method (GET, POST, etc.)
   * @param {string} path - Route path
   * @param {Function} handler - Route handler
   */
  addRoute(method, path, handler) {
    this._routes.push({ method, path, handler });
    return this;
  }

  /**
   * Subscribe to an event
   * @param {string} event - Event name
   * @param {Function} handler - Event handler
   */
  onEvent(event, handler) {
    this._events.push({ event, handler });
    return this;
  }

  /**
   * Build the plugin
   * @returns {Plugin} The built plugin instance
   */
  build() {
    const self = this;
    
    class BuiltPlugin extends Plugin {
      async activate(context) {
        await super.activate(context);
        
        // Register routes
        for (const route of self._routes) {
          context.registerRoute(route.method, route.path, route.handler);
        }
        
        // Subscribe to events
        for (const { event, handler } of self._events) {
          context.eventBus.on(event, handler);
        }
        
        await self._activateHandler(context);
      }

      async deactivate() {
        await self._deactivateHandler();
        await super.deactivate();
      }

      async onInstall(context) {
        await self._installHandler(context);
      }

      async onUninstall(context) {
        await self._uninstallHandler(context);
      }
    }

    return new BuiltPlugin(this.manifest);
  }
}

/**
 * Factory function to create a plugin
 * @param {Object} manifest - Plugin manifest
 * @returns {PluginBuilder} Plugin builder instance
 */
export function createPlugin(manifest) {
  return new PluginBuilder(manifest);
}

export default Plugin;
