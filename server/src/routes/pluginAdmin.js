/**
 * Plugin Admin Routes
 * 
 * Admin API for managing SDK plugins.
 */

import express from 'express';
import { authenticate, requireOrg, requireRole } from '../middleware/auth.js';

const router = express.Router();

// These routes require the plugin manager to be injected
export function createPluginAdminRoutes(pluginManager) {
  
  /**
   * GET /api/admin/plugins
   * List all discovered plugins with their status
   */
  router.get('/', authenticate, async (req, res) => {
    try {
      const plugins = await pluginManager.list();
      res.json(plugins);
    } catch (error) {
      console.error('List plugins error:', error);
      res.status(500).json({ error: 'Failed to list plugins' });
    }
  });

  /**
   * GET /api/admin/plugins/:pluginId
   * Get a specific plugin's status
   */
  router.get('/:pluginId', authenticate, async (req, res) => {
    try {
      const status = pluginManager.getStatus(req.params.pluginId);
      if (!status) {
        return res.status(404).json({ error: 'Plugin not found' });
      }
      res.json(status);
    } catch (error) {
      console.error('Get plugin error:', error);
      res.status(500).json({ error: 'Failed to get plugin status' });
    }
  });

  /**
   * POST /api/admin/plugins/:pluginId/install
   * Install a plugin
   */
  router.post('/:pluginId/install', authenticate, async (req, res) => {
    try {
      const result = await pluginManager.install(req.params.pluginId);
      res.status(201).json(result);
    } catch (error) {
      console.error('Install plugin error:', error);
      res.status(500).json({ error: error.message || 'Failed to install plugin' });
    }
  });

  /**
   * POST /api/admin/plugins/:pluginId/activate
   * Activate a plugin
   */
  router.post('/:pluginId/activate', authenticate, async (req, res) => {
    try {
      const config = req.body.config || {};
      const result = await pluginManager.activate(req.params.pluginId, config);
      res.json(result);
    } catch (error) {
      console.error('Activate plugin error:', error);
      res.status(500).json({ error: error.message || 'Failed to activate plugin' });
    }
  });

  /**
   * POST /api/admin/plugins/:pluginId/deactivate
   * Deactivate a plugin
   */
  router.post('/:pluginId/deactivate', authenticate, async (req, res) => {
    try {
      const result = await pluginManager.deactivate(req.params.pluginId);
      res.json(result);
    } catch (error) {
      console.error('Deactivate plugin error:', error);
      res.status(500).json({ error: error.message || 'Failed to deactivate plugin' });
    }
  });

  /**
   * DELETE /api/admin/plugins/:pluginId
   * Uninstall a plugin
   */
  router.delete('/:pluginId', authenticate, async (req, res) => {
    try {
      const removeData = req.query.removeData === 'true';
      const result = await pluginManager.uninstall(req.params.pluginId, removeData);
      res.json(result);
    } catch (error) {
      console.error('Uninstall plugin error:', error);
      res.status(500).json({ error: error.message || 'Failed to uninstall plugin' });
    }
  });

  /**
   * PUT /api/admin/plugins/:pluginId/config
   * Update plugin configuration
   */
  router.put('/:pluginId/config', authenticate, async (req, res) => {
    try {
      const { pluginId } = req.params;
      const config = req.body;

      // Deactivate and reactivate with new config
      const status = pluginManager.getStatus(pluginId);
      if (status?.isActive) {
        await pluginManager.deactivate(pluginId);
        await pluginManager.activate(pluginId, config);
      }

      res.json({ success: true, config });
    } catch (error) {
      console.error('Update plugin config error:', error);
      res.status(500).json({ error: error.message || 'Failed to update plugin config' });
    }
  });

  /**
   * POST /api/admin/plugins/refresh
   * Re-discover plugins from filesystem
   */
  router.post('/refresh', authenticate, async (req, res) => {
    try {
      await pluginManager.loader.discover();
      const plugins = await pluginManager.list();
      res.json({ success: true, plugins });
    } catch (error) {
      console.error('Refresh plugins error:', error);
      res.status(500).json({ error: 'Failed to refresh plugins' });
    }
  });

  return router;
}

export default createPluginAdminRoutes;
