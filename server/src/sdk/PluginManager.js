/**
 * PlugOS Plugin SDK - Plugin Manager
 * 
 * Orchestrates plugin lifecycle: discovery, installation, activation,
 * deactivation, and uninstallation.
 */

import { PluginLoader } from './PluginLoader.js';
import { PluginContext } from './PluginContext.js';
import eventBus, { SystemEvents } from './EventBus.js';

export class PluginManager {
  /**
   * Create a new PluginManager
   * @param {Object} app - Express app instance
   * @param {Object} db - Database pool
   * @param {Object} options - Additional options
   */
  constructor(app, db, options = {}) {
    this.app = app;
    this.db = db;
    this.loader = new PluginLoader(options);
    this.eventBus = eventBus;
    
    // Active plugin instances
    this.plugins = new Map();
    // Plugin contexts
    this.contexts = new Map();
  }

  /**
   * Initialize the plugin system
   * Discovers plugins and loads enabled ones
   */
  async initialize() {
    console.log('🔌 Initializing Plugin System...');
    
    // Ensure plugin tables exist
    await this._ensureTables();
    
    // Discover available plugins
    await this.loader.discover();
    
    // Load and activate enabled plugins
    await this._activateEnabledPlugins();
    
    console.log('✅ Plugin System initialized');
  }

  /**
   * Ensure required database tables exist
   * @private
   */
  async _ensureTables() {
    await this.db.query(`
      -- Plugin registry (discovered plugins)
      CREATE TABLE IF NOT EXISTS sdk_plugins (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        version VARCHAR(50) NOT NULL,
        description TEXT,
        author VARCHAR(255),
        icon VARCHAR(100),
        source VARCHAR(20) DEFAULT 'local',
        is_installed BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT false,
        config JSONB DEFAULT '{}',
        installed_at TIMESTAMP,
        activated_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Plugin migrations tracking
      CREATE TABLE IF NOT EXISTS plugin_migrations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        plugin_id VARCHAR(100) NOT NULL,
        migration_name VARCHAR(255) NOT NULL,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(plugin_id, migration_name)
      );

      -- Plugin permissions
      CREATE TABLE IF NOT EXISTS plugin_permissions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        plugin_id VARCHAR(100) NOT NULL,
        permission_key VARCHAR(100) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(plugin_id, permission_key)
      );

      -- Organization plugin settings
      CREATE TABLE IF NOT EXISTS org_plugin_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
        plugin_id VARCHAR(100) NOT NULL,
        config JSONB DEFAULT '{}',
        enabled BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(org_id, plugin_id)
      );
    `);
  }

  /**
   * Activate all plugins marked as active in the database
   * @private
   */
  async _activateEnabledPlugins() {
    const result = await this.db.query(
      'SELECT id, config FROM sdk_plugins WHERE is_installed = true AND is_active = true'
    );

    for (const row of result.rows) {
      try {
        await this.activate(row.id, row.config || {});
      } catch (error) {
        console.error(`Failed to activate plugin ${row.id}:`, error.message);
      }
    }
  }

  /**
   * Install a plugin
   * @param {string} pluginId - Plugin ID
   * @returns {Object} Installation result
   */
  async install(pluginId) {
    const info = this.loader.get(pluginId);
    if (!info) {
      throw new Error(`Plugin not found: ${pluginId}`);
    }

    console.log(`📦 Installing plugin: ${info.manifest.name}`);

    // Load the plugin
    const plugin = await this.loader.load(pluginId);

    // Create context for installation
    const context = new PluginContext({
      plugin,
      db: this.db,
      eventBus: this.eventBus,
      app: this.app,
      config: {},
    });

    // Run onInstall hook
    if (plugin.onInstall) {
      await plugin.onInstall(context);
    }

    // Register permissions
    if (info.manifest.permissions) {
      for (const [key, description] of Object.entries(info.manifest.permissions)) {
        await this.db.query(`
          INSERT INTO plugin_permissions (plugin_id, permission_key, description)
          VALUES ($1, $2, $3)
          ON CONFLICT (plugin_id, permission_key) DO UPDATE SET description = $3
        `, [pluginId, key, description]);
      }
    }

    // Update database
    await this.db.query(`
      INSERT INTO sdk_plugins (id, name, version, description, author, icon, source, is_installed, installed_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, true, NOW())
      ON CONFLICT (id) DO UPDATE SET
        name = $2, version = $3, description = $4, author = $5, icon = $6,
        source = $7, is_installed = true, installed_at = NOW(), updated_at = NOW()
    `, [
      pluginId,
      info.manifest.name,
      info.manifest.version,
      info.manifest.description,
      info.manifest.author,
      info.manifest.icon,
      info.source,
    ]);

    // Emit event
    await this.eventBus.emit(SystemEvents.PLUGIN_INSTALLED, { pluginId });

    console.log(`✅ Plugin installed: ${info.manifest.name}`);
    return { success: true, plugin: info.manifest };
  }

  /**
   * Activate a plugin
   * @param {string} pluginId - Plugin ID
   * @param {Object} config - Plugin configuration
   * @returns {Object} Activation result
   */
  async activate(pluginId, config = {}) {
    if (this.plugins.has(pluginId)) {
      console.log(`Plugin ${pluginId} is already active`);
      return { success: true, alreadyActive: true };
    }

    const info = this.loader.get(pluginId);
    if (!info) {
      throw new Error(`Plugin not found: ${pluginId}`);
    }

    console.log(`🚀 Activating plugin: ${info.manifest.name}`);

    // Load the plugin
    const plugin = await this.loader.load(pluginId);

    // Create context
    const context = new PluginContext({
      plugin,
      db: this.db,
      eventBus: this.eventBus,
      app: this.app,
      config,
    });

    // Activate the plugin
    await plugin.activate(context);

    // Mount routes
    context.mountRoutes();

    // Store references
    this.plugins.set(pluginId, plugin);
    this.contexts.set(pluginId, context);

    // Update database
    await this.db.query(`
      UPDATE sdk_plugins 
      SET is_active = true, activated_at = NOW(), config = $2, updated_at = NOW()
      WHERE id = $1
    `, [pluginId, config]);

    // Emit event
    await this.eventBus.emit(SystemEvents.PLUGIN_ACTIVATED, { pluginId });

    console.log(`✅ Plugin activated: ${info.manifest.name}`);
    return { success: true, plugin: plugin.getInfo() };
  }

  /**
   * Deactivate a plugin
   * @param {string} pluginId - Plugin ID
   * @returns {Object} Deactivation result
   */
  async deactivate(pluginId) {
    const plugin = this.plugins.get(pluginId);
    const context = this.contexts.get(pluginId);

    if (!plugin) {
      return { success: false, error: 'Plugin not active' };
    }

    console.log(`🔌 Deactivating plugin: ${plugin.name}`);

    // Unmount routes
    if (context) {
      context.unmountRoutes();
    }

    // Deactivate the plugin
    await plugin.deactivate();

    // Remove references
    this.plugins.delete(pluginId);
    this.contexts.delete(pluginId);

    // Update database
    await this.db.query(`
      UPDATE sdk_plugins SET is_active = false, updated_at = NOW() WHERE id = $1
    `, [pluginId]);

    // Emit event
    await this.eventBus.emit(SystemEvents.PLUGIN_DEACTIVATED, { pluginId });

    console.log(`✅ Plugin deactivated: ${plugin.name}`);
    return { success: true };
  }

  /**
   * Uninstall a plugin
   * @param {string} pluginId - Plugin ID
   * @param {boolean} removeData - Whether to remove plugin data
   * @returns {Object} Uninstall result
   */
  async uninstall(pluginId, removeData = false) {
    // Deactivate first if active
    if (this.plugins.has(pluginId)) {
      await this.deactivate(pluginId);
    }

    const info = this.loader.get(pluginId);
    if (!info) {
      throw new Error(`Plugin not found: ${pluginId}`);
    }

    console.log(`🗑️ Uninstalling plugin: ${info.manifest.name}`);

    if (removeData) {
      // Load plugin to call onUninstall
      const plugin = await this.loader.load(pluginId);
      const context = new PluginContext({
        plugin,
        db: this.db,
        eventBus: this.eventBus,
        app: this.app,
      });

      if (plugin.onUninstall) {
        await plugin.onUninstall(context);
      }

      // Remove migrations record
      await this.db.query(
        'DELETE FROM plugin_migrations WHERE plugin_id = $1',
        [pluginId]
      );
    }

    // Remove permissions
    await this.db.query(
      'DELETE FROM plugin_permissions WHERE plugin_id = $1',
      [pluginId]
    );

    // Update database
    await this.db.query(`
      UPDATE sdk_plugins 
      SET is_installed = false, is_active = false, updated_at = NOW() 
      WHERE id = $1
    `, [pluginId]);

    // Emit event
    await this.eventBus.emit(SystemEvents.PLUGIN_UNINSTALLED, { pluginId });

    console.log(`✅ Plugin uninstalled: ${info.manifest.name}`);
    return { success: true };
  }

  /**
   * Get all discovered plugins with their status
   * @returns {Array<Object>} List of plugins
   */
  async list() {
    const discovered = this.loader.getAll();
    
    // Get installation status from database
    const result = await this.db.query(
      'SELECT id, is_installed, is_active, config FROM sdk_plugins'
    );
    const dbStatus = new Map(result.rows.map(r => [r.id, r]));

    return discovered.map(plugin => ({
      ...plugin,
      isInstalled: dbStatus.get(plugin.id)?.is_installed || false,
      isActive: this.plugins.has(plugin.id),
      config: dbStatus.get(plugin.id)?.config || {},
    }));
  }

  /**
   * Get a specific plugin's status
   * @param {string} pluginId - Plugin ID
   * @returns {Object} Plugin status
   */
  getStatus(pluginId) {
    const info = this.loader.get(pluginId);
    if (!info) return null;

    return {
      ...info.manifest,
      isActive: this.plugins.has(pluginId),
      routes: this.contexts.get(pluginId)?.routes || [],
    };
  }

  /**
   * Get the event bus instance
   * @returns {EventBus} Event bus
   */
  getEventBus() {
    return this.eventBus;
  }
}

export default PluginManager;
