import pool from './db.js';

const migrations = `
-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Departments table (formalized departments for an org)
CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(org_id, name)
);

-- Organization members (links users to orgs with roles)
CREATE TABLE IF NOT EXISTS org_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'manager', 'employee')),
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, org_id)
);

-- Plugs registry (available plugs)
CREATE TABLE IF NOT EXISTS plugs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Organization plugs (which plugs are enabled for which org)
CREATE TABLE IF NOT EXISTS org_plugs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  plug_id UUID REFERENCES plugs(id) ON DELETE CASCADE,
  settings JSONB DEFAULT '{}',
  enabled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(org_id, plug_id)
);

-- Department plug access (which departments can see which plugs)
CREATE TABLE IF NOT EXISTS department_plugs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
  plug_id UUID REFERENCES plugs(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(department_id, plug_id)
);

-- Employee invites (pre-registration list)
CREATE TABLE IF NOT EXISTS employee_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'employee' CHECK (role IN ('admin', 'manager', 'employee')),
  invited_by UUID REFERENCES users(id),
  registered_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(org_id, email)
);

-- Employees table (for Employee Directory plug)
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  department VARCHAR(255),
  position VARCHAR(255),
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default plugs
INSERT INTO plugs (name, slug, description, icon) VALUES 
  ('Employee Directory', 'employee-directory', 'Manage your organization''s employee information', 'mdi:account-group')
ON CONFLICT (slug) DO NOTHING;

-- Document folders table (for Document Manager plug)
CREATE TABLE IF NOT EXISTS document_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  parent_id UUID REFERENCES document_folders(id) ON DELETE CASCADE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Documents table (for Document Manager plug)
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES document_folders(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  file_type VARCHAR(100),
  file_size INTEGER,
  uploaded_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Document content table (separated for performance)
CREATE TABLE IF NOT EXISTS document_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID UNIQUE REFERENCES documents(id) ON DELETE CASCADE,
  content TEXT NOT NULL
);

-- Insert Document Manager plug
INSERT INTO plugs (name, slug, description, icon) VALUES 
  ('Document Manager', 'document-manager', 'Upload, organize, and share documents with your team', 'mdi:file-document-multiple')
ON CONFLICT (slug) DO NOTHING;

-- Folder permissions table (for Document Manager plug)
CREATE TABLE IF NOT EXISTS folder_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id UUID NOT NULL REFERENCES document_folders(id) ON DELETE CASCADE,
  department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  -- Either department_id OR user_id should be set, not both
  CONSTRAINT check_permission_target CHECK (
    (department_id IS NOT NULL AND user_id IS NULL) OR 
    (department_id IS NULL AND user_id IS NOT NULL)
  )
);

-- Migration: Add department_id to org_members if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'org_members' AND column_name = 'department_id') THEN
    ALTER TABLE org_members ADD COLUMN department_id UUID REFERENCES departments(id) ON DELETE SET NULL;
  END IF;
END $$;
`;

async function runMigrations() {
  try {
    console.log('🔄 Running database migrations...');
    await pool.query(migrations);
    console.log('✅ Migrations completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();
