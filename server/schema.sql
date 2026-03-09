-- FinanceHub Database Schema
-- รัน script นี้ใน Neon PostgreSQL

-- ตาราง businesses (สาขาธุรกิจ)
CREATE TABLE IF NOT EXISTS businesses (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(100),
  income DECIMAL(12,2) DEFAULT 0,
  expense DECIMAL(12,2) DEFAULT 0,
  profit DECIMAL(12,2) DEFAULT 0,
  growth DECIMAL(5,2) DEFAULT 0,
  petty_cash DECIMAL(12,2) DEFAULT 0,
  petty_cash_max DECIMAL(12,2) DEFAULT 20000,
  status VARCHAR(20) DEFAULT 'Active',
  logo_type VARCHAR(20) DEFAULT 'emoji',
  icon VARCHAR(10) DEFAULT '🏪',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ตาราง users (ผู้ใช้งาน)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100),
  username VARCHAR(100) UNIQUE NOT NULL,
  email VARCHAR(200),
  phone VARCHAR(20),
  role VARCHAR(50) DEFAULT 'พนักงาน',
  business_ids INTEGER[] DEFAULT '{}',
  features TEXT[] DEFAULT '{}',
  access_level VARCHAR(50) DEFAULT 'Own Data',
  password_hash VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Migration: เพิ่ม username column สำหรับ DB เดิม
ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(100);
ALTER TABLE users DROP COLUMN IF EXISTS invite_token;
ALTER TABLE users DROP COLUMN IF EXISTS invite_expires_at;
ALTER TABLE users DROP COLUMN IF EXISTS invite_status;

-- ตาราง transactions (รายรับ-รายจ่าย)
CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  txn_id VARCHAR(20) UNIQUE,
  business_id INTEGER REFERENCES businesses(id) ON DELETE SET NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('Income', 'Expense')),
  category VARCHAR(200),
  amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  payment_cash DECIMAL(12,2) DEFAULT 0,
  payment_transfer DECIMAL(12,2) DEFAULT 0,
  payment_card DECIMAL(12,2) DEFAULT 0,
  petty_cash BOOLEAN DEFAULT FALSE,
  note TEXT,
  date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  is_edited BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ตาราง audit_logs (ประวัติการแก้ไข)
CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  transaction_id INTEGER REFERENCES transactions(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(50),
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- View สำหรับ transactions พร้อมชื่อ
CREATE OR REPLACE VIEW transactions_with_names AS
SELECT 
  t.*,
  b.name AS business_name,
  b.icon AS business_icon,
  u.name AS created_by_name
FROM transactions t
LEFT JOIN businesses b ON t.business_id = b.id
LEFT JOIN users u ON t.created_by = u.id;

-- (Demo data removed - ไม่ใส่ข้อมูลตัวอย่างอัตโนมัติแล้ว)

-- Default Admin User
INSERT INTO users (name, username, email, phone, role, access_level, features) VALUES
  ('Admin FinanceHub', 'admin', 'admin@financehub.com', '080-000-0000', 'เจ้าของธุรกิจ', 'Full Access', 
   ARRAY['Dashboard','Income','Expense','Transactions','Edit','Delete','Reports','Businesses','Users'])
ON CONFLICT (username) DO NOTHING;

-- ตาราง transaction_images (NEW - รูปภาพหลักฐาน)
CREATE TABLE IF NOT EXISTS transaction_images (
  id SERIAL PRIMARY KEY,
  transaction_id INTEGER REFERENCES transactions(id) ON DELETE CASCADE,
  file_name VARCHAR(255),
  file_data TEXT,
  file_type VARCHAR(50),
  uploaded_by_name VARCHAR(100) DEFAULT 'Admin',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- เพิ่ม columns ใน audit_logs ถ้ายังไม่มี
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_name VARCHAR(100);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS field_changed VARCHAR(100);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS old_value TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS new_value TEXT;

-- เพิ่ม columns ใหม่สำหรับ Business Management v2
-- Fix type column size (เผื่อ database เก่ายังเป็น VARCHAR ขนาดเล็ก)
ALTER TABLE businesses ALTER COLUMN type TYPE VARCHAR(100);
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS tax_name VARCHAR(200);
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS tax_id VARCHAR(13);
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS tax_address TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS departments TEXT[] DEFAULT '{}';
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS income_categories TEXT[] DEFAULT '{}';
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS expense_categories TEXT[] DEFAULT '{}';

-- แก้ icon column ให้รองรับ base64 image
ALTER TABLE businesses ALTER COLUMN icon TYPE TEXT;
-- ตาราง document_settings (ตั้งค่าตัวย่อ + running number per business)
CREATE TABLE IF NOT EXISTS document_settings (
  id SERIAL PRIMARY KEY,
  business_id INTEGER REFERENCES businesses(id) ON DELETE CASCADE,
  doc_type VARCHAR(20) NOT NULL, -- 'QO', 'IV', 'RC'
  prefix VARCHAR(20) NOT NULL DEFAULT '',
  running_number INTEGER NOT NULL DEFAULT 1,
  signature_image TEXT, -- base64
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(business_id, doc_type)
);

-- ตาราง documents
CREATE TABLE IF NOT EXISTS documents (
  id SERIAL PRIMARY KEY,
  doc_number VARCHAR(50) UNIQUE NOT NULL,
  doc_type VARCHAR(20) NOT NULL, -- 'QO','IV','RC'
  business_id INTEGER REFERENCES businesses(id) ON DELETE SET NULL,
  customer_name VARCHAR(200),
  customer_address TEXT,
  customer_tax_id VARCHAR(20),
  customer_email VARCHAR(200),
  customer_phone VARCHAR(50),
  issue_date DATE NOT NULL,
  valid_date DATE,
  ref_doc VARCHAR(50),
  items JSONB NOT NULL DEFAULT '[]',
  subtotal NUMERIC(12,2) DEFAULT 0,
  discount NUMERIC(12,2) DEFAULT 0,
  total NUMERIC(12,2) DEFAULT 0,
  remarks TEXT,
  status VARCHAR(20) DEFAULT 'draft', -- draft, sent, paid, cancelled
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Migration
ALTER TABLE documents ADD COLUMN IF NOT EXISTS discount NUMERIC(12,2) DEFAULT 0;
