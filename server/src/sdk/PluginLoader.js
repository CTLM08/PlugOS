/**
 * PlugOS Plugin SDK - Plugin Loader
 * 
 * Auto-discovery and loading of plugins from:
 * 1. Local plugins/ directory
 * 2. Installed npm packages with plugos- prefix
 */

import fs from 'fs';
import path from 'path';
import Ajv from 'ajv';

// JSON Schema for plugin.json validation
const manifestSchema = {
  type: 'object',
  required: ['id', 'name', 'version', 'main'],
  properties: {
    id: { type: 'string', pattern: '^[a-z][a-z0-9-]*$' },
    name: { type: 'string', minLength: 1 },
    version: { type: 'string', pattern: '^\\d+\\.\\d+\\.\\d+' },
    description: { type: 'string' },
    author: { type: 'string' },
    license: { type: 'string' },
    main: { type: 'string' },
    client: { type: 'string' },
    icon: { type: 'string' },
    permissions: {
      type: 'object',
      additionalProperties: { type: 'string' }
    },
    menu: {
      type: 'object',
      properties: {
        label: { type: 'string' },
        icon: { type: 'string' },
        path: { type: 'string' },
        order: { type: 'number' },
        requiredPermission: { type: 'string' }
      }
    },
    config: {
      type: 'object',
      additionalProperties: {
        type: 'object',
        properties: {
          type: { type: 'string' },
          label: { type: 'string' },
          default: {}
        }
      }
    },
    dependencies: {
      type: 'array',
      items: { type: 'string' }
    }
  }
};

export class PluginLoader {
  constructor(options = {}) {
    this.pluginsDir = options.pluginsDir || path.join(process.cwd(), 'plugins');
    this.nodeModulesDir = options.nodeModulesDir || path.join(process.cwd(), 'node_modules');
    this.discovered = new Map();
    
    // Setup validator
    this.ajv = new Ajv({ allErrors: true });
    this.validateManifest = this.ajv.compile(manifestSchema);
  }

  /**
   * Discover all available plugins
   * @returns {Map<string, Object>} Map of plugin ID to plugin info
   */
  async discover() {
    this.discovered.clear();
    
    // Discover from local plugins/ directory
    await this._discoverLocalPlugins();
    
    // Discover from node_modules (plugos-* packages)
    await this._discoverNpmPlugins();
    
    console.log(`🔌 Discovered ${this.discovered.size} plugins`);
    return this.discovered;
  }

  /**
   * Discover plugins from local plugins/ directory
   * @private
   */
  async _discoverLocalPlugins() {
    if (!fs.existsSync(this.pluginsDir)) {
      console.log(`📁 No local plugins directory found at ${this.pluginsDir}`);
      return;
    }

    const entries = fs.readdirSync(this.pluginsDir, { withFileTypes: true });
    
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      
      const pluginPath = path.join(this.pluginsDir, entry.name);
      const manifestPath = path.join(pluginPath, 'plugin.json');
      
      if (!fs.existsSync(manifestPath)) {
        console.warn(`⚠️ No plugin.json found in ${entry.name}, skipping`);
        continue;
      }

      try {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        
        if (this._validateAndRegister(manifest, pluginPath, 'local')) {
          console.log(`  ✓ ${manifest.name} v${manifest.version} (local)`);
        }
      } catch (error) {
        console.error(`❌ Error loading plugin ${entry.name}:`, error.message);
      }
    }
  }

  /**
   * Discover plugins from node_modules (plugos-* packages)
   * @private
   */
  async _discoverNpmPlugins() {
    if (!fs.existsSync(this.nodeModulesDir)) return;

    const entries = fs.readdirSync(this.nodeModulesDir, { withFileTypes: true });
    
    for (const entry of entries) {
      // Look for plugos-* packages
      if (!entry.name.startsWith('plugos-')) continue;
      if (!entry.isDirectory()) continue;
      
      const pluginPath = path.join(this.nodeModulesDir, entry.name);
      const manifestPath = path.join(pluginPath, 'plugin.json');
      
      if (!fs.existsSync(manifestPath)) continue;

      try {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        
        if (this._validateAndRegister(manifest, pluginPath, 'npm')) {
          console.log(`  ✓ ${manifest.name} v${manifest.version} (npm)`);
        }
      } catch (error) {
        console.error(`❌ Error loading npm plugin ${entry.name}:`, error.message);
      }
    }
  }

  /**
   * Validate manifest and register plugin
   * @private
   */
  _validateAndRegister(manifest, pluginPath, source) {
    // Validate against schema
    const valid = this.validateManifest(manifest);
    
    if (!valid) {
      const errors = this.validateManifest.errors
        .map(e => `${e.instancePath} ${e.message}`)
        .join(', ');
      console.error(`❌ Invalid manifest for ${manifest.id || 'unknown'}: ${errors}`);
      return false;
    }

    // Check for duplicates
    if (this.discovered.has(manifest.id)) {
      const existing = this.discovered.get(manifest.id);
      console.warn(`⚠️ Duplicate plugin ID "${manifest.id}" - using ${existing.source} version`);
      return false;
    }

    // Register the plugin
    this.discovered.set(manifest.id, {
      manifest,
      path: pluginPath,
      source,
      mainPath: path.join(pluginPath, manifest.main),
      clientPath: manifest.client ? path.join(pluginPath, manifest.client) : null,
    });

    return true;
  }

  /**
   * Load a specific plugin's code
   * @param {string} pluginId - Plugin ID
   * @returns {Object} Plugin class or instance
   */
  async load(pluginId) {
    const info = this.discovered.get(pluginId);
    if (!info) {
      throw new Error(`Plugin not found: ${pluginId}`);
    }

    try {
      // Dynamically import the plugin's main file
      const module = await import(`file://${info.mainPath}`);
      
      // Support both default export and named export
      const PluginClass = module.default || module.Plugin || module;
      
      // If it's a class, instantiate it with the manifest
      if (typeof PluginClass === 'function') {
        return new PluginClass(info.manifest);
      }
      
      // If it's already an instance, return it
      return PluginClass;
    } catch (error) {
      console.error(`❌ Failed to load plugin ${pluginId}:`, error);
      throw error;
    }
  }

  /**
   * Get all discovered plugins
   * @returns {Array<Object>} Array of plugin info objects
   */
  getAll() {
    return Array.from(this.discovered.values()).map(info => ({
      id: info.manifest.id,
      name: info.manifest.name,
      version: info.manifest.version,
      description: info.manifest.description,
      author: info.manifest.author,
      icon: info.manifest.icon,
      source: info.source,
      menu: info.manifest.menu,
      permissions: info.manifest.permissions,
    }));
  }

  /**
   * Get a specific plugin's info
   * @param {string} pluginId - Plugin ID
   * @returns {Object|null} Plugin info or null
   */
  get(pluginId) {
    return this.discovered.get(pluginId) || null;
  }
}

export default PluginLoader;
