/**
 * PlugOS Plugin SDK
 * 
 * Main entry point for the SDK. Re-exports all components.
 */

export { Plugin, PluginBuilder, createPlugin } from './Plugin.js';
export { PluginContext } from './PluginContext.js';
export { PluginLoader } from './PluginLoader.js';
export { PluginManager } from './PluginManager.js';
export { default as eventBus, EventBus, SystemEvents } from './EventBus.js';

// Default export for convenient importing
export { PluginManager as default } from './PluginManager.js';
