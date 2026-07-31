-- GBK CRM - Seed Data Script
-- Run this in psql to populate sample records: psql -U postgres -d gbk_crm -f seed.sql

-- 1. SEED USERS
INSERT INTO users (id, first_name, last_name, email, role, status, timezone, phone)
VALUES
  ('usr-1', 'David', 'Acosta', 'dacosta@gbkfinancial.ca', 'Administrator', 'Active', 'America/Toronto', '705-555-0100'),
  ('usr-2', 'Sarah', 'Jenkins', 'sjenkins@gbkfinancial.ca', 'Broker', 'Active', 'America/Toronto', '705-555-0101'),
  ('usr-3', 'Wayne', 'Cross', 'wcross@gbkfinancial.ca', 'Broker', 'Active', 'America/Toronto', '705-555-0102'),
  ('usr-4', 'Dave', 'Peterson', 'dpeterson@gbkfinancial.ca', 'Underwriter', 'Active', 'America/Toronto', '705-555-0103')
ON CONFLICT (email) DO NOTHING;

-- 2. SEED USER SETTINGS
INSERT INTO user_settings (id, user_id, theme, timezone, date_format, time_format, default_landing_page, notifications_enabled, auto_lock_minutes, audit_logging_enabled)
VALUES
  ('set-1', 'usr-1', 'dark', 'America/Toronto', 'YYYY-MM-DD', '12h', 'dashboard', true, 10, true),
  ('set-2', 'usr-2', 'light', 'America/Toronto', 'YYYY-MM-DD', '12h', 'clients', true, 15, true)
ON CONFLICT (user_id) DO NOTHING;

-- 3. SEED CLIENTS
INSERT INTO clients (id, first_name, last_name, email, phone, status, stage, assigned_to, lender, source, loan_amount, property_value, interest_rate, beacon_score, maturity_date, notes)
VALUES
  ('c-1', 'Marcus', 'Vance', 'marcus.vance@example.com', '705-721-8899', 'A-Lender Approved', 'Commitment Issued', 'usr-1', 'First National', 'Direct Realtor Referral', 540000.00, 720000.00, 4.890, 742, '2029-08-15', 'High-net-worth applicant. Self-employed BFS file verified with NOAs.'),
  ('c-2', 'Clara', 'Tremblay', 'clara.tremblay@example.com', '416-992-3401', 'Underwriting', 'Lender Review', 'usr-2', 'Equitable Bank', 'Online Portal', 410000.00, 520000.00, 5.240, 680, '2029-09-01', 'Purchase plus improvements file in Barrie. Appraisal completed.'),
  ('c-3', 'David', 'Martinez', 'david.martinez@example.com', '905-441-2099', 'In Review', 'Initial Intake', 'usr-1', 'MCAP', 'Client Referral', 610000.00, 850000.00, 4.790, 715, '2031-01-10', 'Refinance and debt consolidation query.')
ON CONFLICT (id) DO NOTHING;

-- 4. SEED TASKS
INSERT INTO tasks (id, title, description, assigned_to, related_client_id, due_at, status, priority, category, notes)
VALUES
  ('tsk-1', 'Request 90-day Bank Statement for Marcus Vance', 'Verify down payment funds source per CMHC guidelines', 'usr-1', 'c-1', NOW() + INTERVAL '2 days', 'pending', 'high', 'Document Request', 'Follow up with HR for letter verification'),
  ('tsk-2', 'Review Appraisal Report for Clara Tremblay', 'Confirm property valuation matches $520,000 threshold', 'usr-2', 'c-2', NOW() + INTERVAL '1 day', 'in_progress', 'urgent', 'Underwriting', 'Appraisal received from Appraisals Unlimited'),
  ('tsk-3', 'Schedule Rate Commitment Call with David Martinez', 'Discuss 3-year vs 5-year fixed monoline options', 'usr-1', 'c-3', NOW() + INTERVAL '3 days', 'pending', 'medium', 'Client Meeting', 'Send quote sheet ahead of call')
ON CONFLICT (id) DO NOTHING;

-- 5. SEED AUDIT LOGS
INSERT INTO audit_logs (id, user_id, user_name, action, target_type, target_id, target_name, details)
VALUES
  ('aud-1', 'usr-1', 'David Acosta', 'User Login', 'System', 'sys-1', 'CRM Packager Portal', 'Logged in successfully from local network'),
  ('aud-2', 'usr-1', 'David Acosta', 'View Client Dossier', 'Client', 'c-1', 'Marcus Vance', 'Opened file folder and reviewed commitment conditions'),
  ('aud-3', 'usr-2', 'Sarah Jenkins', 'Update Task Status', 'Task', 'tsk-2', 'Review Appraisal Report', 'Marked task as in_progress')
ON CONFLICT (id) DO NOTHING;

-- 6. SEED PARTNERS
INSERT INTO partners (id, name, category, contact_person, email, phone, rating, status, notes)
VALUES
  ('prt-1', 'Appraisals Unlimited', 'Appraiser', 'John Smith', 'orders@appraisalsunlimited.ca', '705-728-1122', 4.9, 'Active', 'Fast turnarounds for Barrie & Simcoe Region residential properties.'),
  ('prt-2', 'Simcoe Law Chambers', 'Real Estate Lawyer', 'Karen Miller', 'kmiller@simcoelaw.ca', '705-730-5544', 5.0, 'Active', 'Preferred closing partner for private mortgage registrations.')
ON CONFLICT (id) DO NOTHING;
