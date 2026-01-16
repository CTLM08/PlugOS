-- Payroll Manager Plug Schema
-- Run this SQL migration in your PostgreSQL client

-- Add plug entry
INSERT INTO plugs (name, slug, description, icon, is_active)
VALUES ('Payroll Manager', 'payroll-manager', 'Manage employee salaries and generate payslips', 'mdi:cash-multiple', true)
ON CONFLICT DO NOTHING;

-- Employee salaries table (salary configuration per employee)
CREATE TABLE IF NOT EXISTS employee_salaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  base_salary DECIMAL(12, 2) NOT NULL DEFAULT 0,
  hourly_rate DECIMAL(8, 2) DEFAULT 0,
  currency VARCHAR(10) DEFAULT 'MYR',
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_salaries_org ON employee_salaries(org_id);
CREATE INDEX IF NOT EXISTS idx_salaries_user ON employee_salaries(user_id);

-- Payroll periods table (monthly/bi-weekly pay periods)
CREATE TABLE IF NOT EXISTS payroll_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'processing', 'finalized')),
  created_by UUID REFERENCES users(id),
  finalized_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_periods_org ON payroll_periods(org_id);
CREATE INDEX IF NOT EXISTS idx_periods_status ON payroll_periods(status);

-- Payslips table (individual employee pay records)
CREATE TABLE IF NOT EXISTS payslips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  period_id UUID NOT NULL REFERENCES payroll_periods(id) ON DELETE CASCADE,
  base_salary DECIMAL(12, 2) NOT NULL DEFAULT 0,
  hours_worked DECIMAL(8, 2) DEFAULT 0,
  overtime_hours DECIMAL(8, 2) DEFAULT 0,
  overtime_pay DECIMAL(12, 2) DEFAULT 0,
  deductions DECIMAL(12, 2) DEFAULT 0,
  bonuses DECIMAL(12, 2) DEFAULT 0,
  gross_pay DECIMAL(12, 2) NOT NULL DEFAULT 0,
  net_pay DECIMAL(12, 2) NOT NULL DEFAULT 0,
  notes TEXT,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(period_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_payslips_org ON payslips(org_id);
CREATE INDEX IF NOT EXISTS idx_payslips_user ON payslips(user_id);
CREATE INDEX IF NOT EXISTS idx_payslips_period ON payslips(period_id);
