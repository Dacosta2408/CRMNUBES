-- GBK CRM - PostgreSQL Relational Database Schema
-- Run this script in PostgreSQL: psql -U postgres -d gbk_crm -f schema.sql

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'Broker',
  status VARCHAR(20) NOT NULL DEFAULT 'Active',
  avatar_url TEXT,
  timezone VARCHAR(100) NOT NULL DEFAULT 'America/Toronto',
  phone VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. USER SETTINGS TABLE
CREATE TABLE IF NOT EXISTS user_settings (
  id VARCHAR(64) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR(64) UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  theme VARCHAR(20) NOT NULL DEFAULT 'dark',
  timezone VARCHAR(100) NOT NULL DEFAULT 'America/Toronto',
  date_format VARCHAR(20) NOT NULL DEFAULT 'YYYY-MM-DD',
  time_format VARCHAR(20) NOT NULL DEFAULT '12h',
  default_landing_page VARCHAR(50) NOT NULL DEFAULT 'dashboard',
  notifications_enabled BOOLEAN DEFAULT true,
  auto_lock_minutes INTEGER DEFAULT 10,
  audit_logging_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. CLIENTS TABLE
CREATE TABLE IF NOT EXISTS clients (
  id VARCHAR(64) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  status VARCHAR(50) NOT NULL DEFAULT 'In Review',
  stage VARCHAR(50) DEFAULT 'Initial Application',
  assigned_to VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  retention_owner VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  referred_by VARCHAR(255),
  lender VARCHAR(100),
  source VARCHAR(100) DEFAULT 'Direct Referral',
  loan_amount NUMERIC(14, 2) DEFAULT 0,
  property_value NUMERIC(14, 2) DEFAULT 0,
  interest_rate NUMERIC(5, 3) DEFAULT 0,
  beacon_score INTEGER DEFAULT 0,
  maturity_date DATE,
  notes TEXT,
  retention_notes TEXT,
  raw_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. CLIENT NOTES TABLE
CREATE TABLE IF NOT EXISTS client_notes (
  id VARCHAR(64) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  client_id VARCHAR(64) NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  author_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  author_name VARCHAR(100) NOT NULL,
  note_type VARCHAR(50) DEFAULT 'internal',
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. TASKS TABLE
CREATE TABLE IF NOT EXISTS tasks (
  id VARCHAR(64) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  assigned_to VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  related_client_id VARCHAR(64) REFERENCES clients(id) ON DELETE CASCADE,
  due_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  priority VARCHAR(20) NOT NULL DEFAULT 'medium',
  category VARCHAR(50) DEFAULT 'General',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. EVENTS TABLE
CREATE TABLE IF NOT EXISTS events (
  id VARCHAR(64) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  event_at TIMESTAMP WITH TIME ZONE NOT NULL,
  related_client_id VARCHAR(64) REFERENCES clients(id) ON DELETE CASCADE,
  owner_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. PARTNERS TABLE
CREATE TABLE IF NOT EXISTS partners (
  id VARCHAR(64) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL DEFAULT 'Realtor',
  contact_person VARCHAR(100),
  email VARCHAR(255),
  phone VARCHAR(50),
  notes TEXT,
  rating NUMERIC(2,1) DEFAULT 5.0,
  status VARCHAR(20) DEFAULT 'Active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS audit_logs (
  id VARCHAR(64) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  user_name VARCHAR(100) NOT NULL,
  action VARCHAR(255) NOT NULL,
  target_type VARCHAR(50),
  target_id VARCHAR(64),
  target_name VARCHAR(255),
  details TEXT,
  ip_address VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. DOCUMENTS TABLE
CREATE TABLE IF NOT EXISTS documents (
  id VARCHAR(64) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  client_id VARCHAR(64) NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) DEFAULT 'General',
  file_path TEXT,
  file_size BIGINT DEFAULT 0,
  mime_type VARCHAR(100) DEFAULT 'application/pdf',
  status VARCHAR(50) DEFAULT 'Pending Review',
  notes TEXT,
  uploaded_by VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. RENEWALS TABLE
CREATE TABLE IF NOT EXISTS renewals (
  id VARCHAR(64) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  client_id VARCHAR(64) NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  lender_name VARCHAR(100) NOT NULL,
  current_rate NUMERIC(5,3),
  maturity_date DATE NOT NULL,
  loan_balance NUMERIC(14,2) DEFAULT 0,
  status VARCHAR(50) DEFAULT 'Upcoming',
  assigned_broker_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- INDEXES FOR FAST QUERYING
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_assigned ON clients(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_client ON tasks(related_client_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_client_notes_client ON client_notes(client_id);
CREATE INDEX IF NOT EXISTS idx_documents_client ON documents(client_id);
