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
  name VARCHAR(100) NOT NULL,
  email VARCHAR(200) UNIQUE NOT NULL,
  phone VARCHAR(20),
  role VARCHAR(50) DEFAULT 'พนักงาน',
  business_ids INTEGER[] DEFAULT '{}',
  features TEXT[] DEFAULT '{}',
  access_level VARCHAR(50) DEFAULT 'Own Data',
  password_hash VARCHAR(255),
  invite_token VARCHAR(100),
  invite_expires_at TIMESTAMP,
  invite_status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- เพิ่ม columns สำหรับ invite (ถ้ายังไม่มี)
ALTER TABLE users ADD COLUMN IF NOT EXISTS invite_token VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS invite_expires_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS invite_status VARCHAR(20) DEFAULT 'pending';

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

-- ข้อมูลตัวอย่าง (Demo Data)
INSERT INTO businesses (name, type, income, expense, profit, growth, petty_cash, petty_cash_max, icon) VALUES
  ('กาแฟ A', 'Cafe', 150000, 80000, 70000, 12.5, 15000, 20000, '☕'),
  ('อาหาร B', 'Restaurant', 320000, 210000, 110000, -5.2, 5000, 30000, '🍱'),
  ('เบเกอรี่ C', 'Bakery', 95000, 45000, 50000, 8.4, 8000, 10000, '🥐')
ON CONFLICT DO NOTHING;

-- Default Admin User
INSERT INTO users (name, email, phone, role, access_level, features) VALUES
  ('Admin FinanceHub', 'admin@financehub.com', '080-000-0000', 'เจ้าของธุรกิจ', 'Full Access', 
   ARRAY['Dashboard','Income','Expense','Transactions','Edit','Delete','Reports','Businesses','Users'])
ON CONFLICT (email) DO NOTHING;

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
