/**
 * plugos-plugs-education Integration Module
 * 
 * This module provides everything needed to integrate the Education plug
 * into a PlugOS installation or any Express + React application.
 */

// Database configuration and SQL
export { plugMetadata, insertPlugSQL, routeConfig } from './database.js';

// Express routes factory
export { createEducationRoutes } from './routes.js';

// React component info
export { componentInfo } from './EducationManager.jsx';
