/**
 * Hello World Plugin
 * 
 * A simple example plugin demonstrating the PlugOS SDK.
 * Shows how to:
 * - Export a Plugin class
 * - Register routes
 * - Use the plugin context
 * - Listen to events
 */

import { Plugin } from '../../src/sdk/Plugin.js';

export default class HelloWorldPlugin extends Plugin {
  /**
   * Called when the plugin is activated
   */
  async activate(context) {
    await super.activate(context);
    
    const { logger, eventBus, registerRoute } = context;
    
    logger.info('Hello World plugin activated!');
    
    // Get greeting from config
    this.greeting = context.getConfig('greeting', 'Hello from PlugOS!');
    
    // Register API routes
    registerRoute('GET', '/', this.getGreeting.bind(this));
    registerRoute('GET', '/status', this.getStatus.bind(this));
    registerRoute('POST', '/echo', this.echo.bind(this));
    
    // Listen to system events
    eventBus.on('user.login', (user) => {
      logger.info(`User logged in: ${user.email}`);
    });
  }

  /**
   * GET /api/plugins/hello-world/
   * Returns the greeting message
   */
  async getGreeting(req, res) {
    res.json({
      message: this.greeting,
      plugin: this.name,
      version: this.version,
    });
  }

  /**
   * GET /api/plugins/hello-world/status
   * Returns plugin status
   */
  async getStatus(req, res) {
    res.json({
      id: this.id,
      name: this.name,
      version: this.version,
      isActive: this.isActive,
      uptime: process.uptime(),
    });
  }

  /**
   * POST /api/plugins/hello-world/echo
   * Echoes back the request body
   */
  async echo(req, res) {
    res.json({
      echo: req.body,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Called when the plugin is deactivated
   */
  async deactivate() {
    this.context?.logger.info('Hello World plugin deactivated');
    await super.deactivate();
  }
}
