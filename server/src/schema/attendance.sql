-- Attendance Tracker Plug Schema
-- Run this SQL migration in your PostgreSQL client

-- Add plug entry
INSERT INTO plugs (name, slug, description, icon, is_active)
VALUES ('Attendance Tracker', 'attendance-tracker', 'Track employee attendance and leave requests', 'mdi:clock-check-outline', true)
ON CONFLICT DO NOTHING;

-- Attendance records table (clock in/out)
CREATE TABLE IF NOT EXISTS attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  clock_in TIMESTAMPTZ NOT NULL,
  clock_out TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attendance_org_user ON attendance_records(org_id, user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance_records(clock_in);

-- Leave requests table
CREATE TABLE IF NOT EXISTS leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  leave_type VARCHAR(50) NOT NULL, -- 'annual', 'sick', 'personal', 'unpaid'
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leave_org_user ON leave_requests(org_id, user_id);
CREATE INDEX IF NOT EXISTS idx_leave_status ON leave_requests(status);

-- Custom leave types per organization
CREATE TABLE IF NOT EXISTS leave_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,
  color VARCHAR(20) DEFAULT '#6366f1', -- hex color for UI
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, name)
);

CREATE INDEX IF NOT EXISTS idx_leave_types_org ON leave_types(org_id);

-- Insert default leave types (will be called per org when enabling plug)
-- These are just examples, admins can add their own
