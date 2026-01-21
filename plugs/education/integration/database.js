/**
 * Education Plug Database Configuration
 * 
 * This file contains the plug metadata and SQL for registering the Education plug.
 */

export const plugMetadata = {
  name: 'Education Manager',
  slug: 'education-manager',
  description: 'Manage classrooms, students, assignments, and announcements like Google Classroom',
  icon: 'mdi:school',
  is_active: true
};

/**
 * SQL to insert the Education plug into the plugs table
 * Run this in your database to register the plug
 */
export const insertPlugSQL = `
INSERT INTO plugs (name, slug, description, icon, is_active)
VALUES (
  'Education Manager',
  'education-manager',
  'Manage classrooms, students, assignments, and announcements like Google Classroom',
  'mdi:school',
  true
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  is_active = EXCLUDED.is_active;
`;

/**
 * Route configuration for integration
 */
export const routeConfig = {
  slug: 'education-manager',
  route: '/education',
  apiPath: '/api/education'
};

export default {
  plugMetadata,
  insertPlugSQL,
  routeConfig
};
