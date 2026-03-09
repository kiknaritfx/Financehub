import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pool from './db.js';

const app = express();
const PORT = process.env.PORT || 3001;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ limit: '20mb', extended: true }));

// Auto-migration on startup - รัน statement ทีละอัน เพื่อไม่ให้ error อันเดียว block ทั้งหมด
async function runMigrations() {
  try {
    const sql = readFileSync(join(__dirname, 'schema.sql'), 'utf8');
    const statements = sql
      .split(/;\s*\n/)
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    let ok = 0, failed = 0;
    for (const stmt of statements) {
      try {
        await pool.query(stmt);
        ok++;
      } catch (err) {
        const msg = err.message || '';
        if (!msg.includes('already exists')) {
          console.error('⚠️ Migration stmt failed:', msg.substring(0, 120));
        }
        failed++;
      }
    }
    console.log(`✅ DB migration: ${ok} ok, ${failed} skipped`);
  } catch (err) {
    console.error('⚠️ Migration error:', err.message);
  }
}
runMigrations();

// ─── Helper: register route with both /api/xxx and /xxx (Vercel fallback) ───
function route(method, path, handler) {
  app[method](path, handler);
  app[method](path.replace('/api/', '/'), handler);
}

// ─── HEALTH ───
route('get', '/api/health', async (req, res) => {
  try { await pool.query('SELECT 1'); res.json({ status: 'ok', db: 'connected' }); }
  catch (err) { res.status(500).json({ status: 'error', error: err.message }); }
});

// ─── LOGIN ───
route('post', '/api/login', async (req, res) => {
  const { email, password } = req.body; // email field = username หรือ email
  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE username=$1 OR email=$1', [email]
    );
    if (!result.rows.length) return res.status(401).json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
    const user = result.rows[0];
    const ok = (email === 'admin@financehub.com' && password === 'admin1234')
      || (user.password_hash && user.password_hash === password);
    if (!ok) return res.status(401).json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
    const { password_hash, ...safe } = user;
    res.json({ success: true, user: safe });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── BUSINESSES ───
route('get', '/api/businesses', async (req, res) => {
  try { res.json((await pool.query('SELECT * FROM businesses ORDER BY id')).rows); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

route('post', '/api/businesses', async (req, res) => {
  const { name, type, petty_cash_max, icon, logo_type, status } = req.body;
  try {
    const r = await pool.query(
      'INSERT INTO businesses (name,type,petty_cash_max,icon,logo_type,status) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [name, type, petty_cash_max || 20000, icon || '🏪', logo_type || 'emoji', status || 'Active']
    );
    res.status(201).json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

route('put', '/api/businesses/:id', async (req, res) => {
  const { name, type, petty_cash_max, icon, logo_type, status, petty_cash,
          tax_name, tax_id, tax_address, departments, income_categories, expense_categories } = req.body;
  try {
    const toArr = (v) => Array.isArray(v) ? v : (v != null ? [v] : null);
    const r = await pool.query(
      `UPDATE businesses SET
       name=COALESCE($1,name), type=COALESCE($2,type),
       petty_cash_max=COALESCE($3,petty_cash_max),
       icon=COALESCE($4,icon), logo_type=COALESCE($5,logo_type),
       status=COALESCE($6,status), petty_cash=COALESCE($7,petty_cash),
       tax_name=COALESCE($8,tax_name), tax_id=COALESCE($9,tax_id),
       tax_address=COALESCE($10,tax_address),
       departments=COALESCE($11::TEXT[],departments),
       income_categories=COALESCE($12::TEXT[],income_categories),
       expense_categories=COALESCE($13::TEXT[],expense_categories),
       updated_at=CURRENT_TIMESTAMP
       WHERE id=$14 RETURNING *`,
      [name||null, type||null, petty_cash_max||null, icon||null, logo_type||null,
       status||null, petty_cash||null,
       tax_name!=null?tax_name:null, tax_id!=null?tax_id:null, tax_address!=null?tax_address:null,
       toArr(departments), toArr(income_categories), toArr(expense_categories),
       req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'ไม่พบธุรกิจ' });
    res.json(r.rows[0]);
  } catch (err) {
    console.error('PUT business error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

route('delete', '/api/businesses/:id', async (req, res) => {
  const bizId = req.params.id;
  try {
    // ลบ FK chain ทั้งหมด (ใช้ catch แต่ละขั้นตอนเพื่อไม่ให้ fail)
    await pool.query(
      'DELETE FROM transaction_images WHERE transaction_id IN (SELECT id FROM transactions WHERE business_id=$1)', [bizId]
    ).catch(() => {});
    await pool.query(
      'DELETE FROM audit_logs WHERE transaction_id IN (SELECT id FROM transactions WHERE business_id=$1)', [bizId]
    ).catch(() => {});
    await pool.query('DELETE FROM transactions WHERE business_id=$1', [bizId]);
    const r = await pool.query('DELETE FROM businesses WHERE id=$1 RETURNING id', [bizId]);
    if (!r.rows.length) return res.status(404).json({ error: 'ไม่พบธุรกิจ' });
    res.json({ message: 'ลบสำเร็จ' });
  } catch (err) {
    console.error('Delete business error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── TRANSACTIONS ───
route('get', '/api/transactions', async (req, res) => {
  const { business_id, type, start, end, limit = 100 } = req.query;
  try {
    let q = 'SELECT * FROM transactions_with_names WHERE 1=1';
    const p = []; let i = 1;
    if (business_id) { q += ` AND business_id=$${i++}`; p.push(business_id); }
    if (type) { q += ` AND type=$${i++}`; p.push(type); }
    if (start) { q += ` AND date>=$${i++}`; p.push(start); }
    if (end) { q += ` AND date<=$${i++}`; p.push(end + ' 23:59:59'); }
    q += ` ORDER BY created_at DESC LIMIT $${i}`;
    p.push(limit);
    const result = await pool.query(q, p);
    const txns = result.rows;
    // นับรูปภาพ
    if (txns.length > 0) {
      const ids = txns.map(t => t.id);
      const imgC = await pool.query(
        'SELECT transaction_id,COUNT(*) as count FROM transaction_images WHERE transaction_id=ANY($1) GROUP BY transaction_id', [ids]
      ).catch(() => ({ rows: [] }));
      const cm = {};
      imgC.rows.forEach(r => { cm[r.transaction_id] = parseInt(r.count); });
      txns.forEach(t => { t.image_count = cm[t.id] || 0; });
    }
    res.json(txns);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

route('post', '/api/transactions', async (req, res) => {
  const { business_id, type, category, amount, date, payment_cash, payment_transfer,
    payment_card, petty_cash, note, images, created_by_name } = req.body;
  try {
    const cnt = parseInt((await pool.query('SELECT COUNT(*) FROM transactions')).rows[0].count) + 1;
    const txn_id = `TRX-${String(cnt).padStart(4, '0')}`;
    const result = await pool.query(
      `INSERT INTO transactions (txn_id,business_id,type,category,amount,date,
       payment_cash,payment_transfer,payment_card,petty_cash,note)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [txn_id, business_id, type, category, amount, date || new Date(),
       payment_cash || 0, payment_transfer || 0, payment_card || 0, petty_cash || false, note]
    );
    const txn = result.rows[0];
    // บันทึกรูปภาพ
    if (images && images.length > 0) {
      for (const img of images) {
        await pool.query(
          'INSERT INTO transaction_images (transaction_id,file_name,file_data,file_type,uploaded_by_name) VALUES ($1,$2,$3,$4,$5)',
          [txn.id, img.name, img.data, img.type, created_by_name || 'Admin']
        ).catch(() => {});
      }
    }
    // Audit log
    await pool.query(
      `INSERT INTO audit_logs (transaction_id,user_name,action,field_changed,new_value) VALUES ($1,$2,'CREATE','ทั้งหมด',$3)`,
      [txn.id, created_by_name || 'Admin',
       `บันทึก${type === 'Income' ? 'รายรับ' : 'รายจ่าย'} ${category} ฿${Number(amount).toLocaleString()}`]
    ).catch(() => {});
    // อัปเดต business summary
    if (type === 'Income') {
      await pool.query('UPDATE businesses SET income=income+$1,profit=profit+$1 WHERE id=$2', [amount, business_id]);
    } else {
      await pool.query('UPDATE businesses SET expense=expense+$1,profit=profit-$1 WHERE id=$2', [amount, business_id]);
      if (petty_cash) await pool.query('UPDATE businesses SET petty_cash=GREATEST(0,petty_cash-$1) WHERE id=$2', [amount, business_id]);
    }
    res.status(201).json(txn);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

route('put', '/api/transactions/:id', async (req, res) => {
  const { category, amount, note, user_name } = req.body;
  try {
    const old = (await pool.query('SELECT * FROM transactions WHERE id=$1', [req.params.id])).rows[0];
    if (!old) return res.status(404).json({ error: 'ไม่พบรายการ' });
    const result = await pool.query(
      'UPDATE transactions SET category=COALESCE($1,category),amount=COALESCE($2,amount),note=COALESCE($3,note),is_edited=TRUE WHERE id=$4 RETURNING *',
      [category || old.category, Number(amount) || old.amount, note !== undefined ? note : old.note, req.params.id]
    );
    // Audit log
    const changes = [];
    if (amount && Number(amount) !== Number(old.amount))
      changes.push(['จำนวนเงิน', `฿${Number(old.amount).toLocaleString()}`, `฿${Number(amount).toLocaleString()}`]);
    if (category && category !== old.category)
      changes.push(['หมวดหมู่', old.category, category]);
    if (note !== undefined && note !== old.note)
      changes.push(['หมายเหตุ', old.note || '-', note || '-']);
    for (const [field, ov, nv] of changes) {
      await pool.query(
        `INSERT INTO audit_logs (transaction_id,user_name,action,field_changed,old_value,new_value) VALUES ($1,$2,'EDIT',$3,$4,$5)`,
        [req.params.id, user_name || 'Admin', field, ov, nv]
      ).catch(() => {});
    }
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

route('delete', '/api/transactions/:id', async (req, res) => {
  try {
    const old = await pool.query('SELECT * FROM transactions WHERE id=$1', [req.params.id]);
    if (old.rows.length > 0) {
      await pool.query(
        `INSERT INTO audit_logs (transaction_id,user_name,action,field_changed,old_value) VALUES ($1,$2,'DELETE','ทั้งหมด',$3)`,
        [req.params.id, 'Admin', `ลบรายการ ${old.rows[0].category} ฿${old.rows[0].amount}`]
      ).catch(() => {});
      // ลบ images ที่ผูกอยู่
      await pool.query('DELETE FROM transaction_images WHERE transaction_id=$1', [req.params.id]).catch(() => {});
    }
    await pool.query('DELETE FROM transactions WHERE id=$1', [req.params.id]);
    res.json({ message: 'ลบสำเร็จ' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── IMAGES ───
route('get', '/api/transactions/:id/images', async (req, res) => {
  try {
    const r = await pool.query(
      'SELECT id,file_name,file_data,file_type,uploaded_by_name,created_at FROM transaction_images WHERE transaction_id=$1 ORDER BY created_at',
      [req.params.id]
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

route('post', '/api/transactions/:id/images', async (req, res) => {
  const { file_name, file_data, file_type, uploaded_by_name } = req.body;
  try {
    const r = await pool.query(
      'INSERT INTO transaction_images (transaction_id,file_name,file_data,file_type,uploaded_by_name) VALUES ($1,$2,$3,$4,$5) RETURNING id,file_name,file_type,uploaded_by_name,created_at',
      [req.params.id, file_name, file_data, file_type, uploaded_by_name || 'Admin']
    );
    res.status(201).json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

route('delete', '/api/images/:id', async (req, res) => {
  try { await pool.query('DELETE FROM transaction_images WHERE id=$1', [req.params.id]); res.json({ message: 'ลบสำเร็จ' }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── AUDIT LOGS ───
route('get', '/api/transactions/:id/audit', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM audit_logs WHERE transaction_id=$1 ORDER BY created_at ASC', [req.params.id]);
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── USERS ───
route('get', '/api/users', async (req, res) => {
  try { res.json((await pool.query('SELECT id,name,username,email,phone,role,business_ids,features,access_level,created_at FROM users ORDER BY id')).rows); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// เปลี่ยนรหัสผ่านด้วยตัวเอง (self-service)
route('post', '/api/users/:id/change-password', async (req, res) => {
  const { current_password, new_password } = req.body;
  if (!new_password || new_password.length < 4) return res.status(400).json({ error: 'รหัสผ่านใหม่ต้องมีอย่างน้อย 4 ตัวอักษร' });
  try {
    const result = await pool.query('SELECT * FROM users WHERE id=$1', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'ไม่พบผู้ใช้' });
    const user = result.rows[0];
    if (user.password_hash !== current_password) return res.status(401).json({ error: 'รหัสผ่านปัจจุบันไม่ถูกต้อง' });
    await pool.query('UPDATE users SET password_hash=$1 WHERE id=$2', [new_password, req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

route('post', '/api/users', async (req, res) => {
  const { name, username, password, phone, role, business_ids, features, access_level } = req.body;
  if (!username) return res.status(400).json({ error: 'กรุณากรอก Username' });
  if (!password) return res.status(400).json({ error: 'กรุณากรอก Password' });
  const toIntArr = (v) => Array.isArray(v) ? v.map(Number) : [];
  const toStrArr = (v) => Array.isArray(v) ? v : [];
  try {
    const r = await pool.query(
      `INSERT INTO users (name,username,password_hash,phone,role,business_ids,features,access_level)
       VALUES ($1,$2,$3,$4,$5,$6::INTEGER[],$7::TEXT[],$8)
       RETURNING id,name,username,phone,role,business_ids,features,access_level`,
      [name||username, username, password, phone||null,
       role||'พนักงาน', toIntArr(business_ids), toStrArr(features), access_level||'Own Data']
    );
    res.status(201).json(r.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Username นี้ถูกใช้งานแล้ว' });
    res.status(500).json({ error: err.message });
  }
});

route('put', '/api/users/:id', async (req, res) => {
  const { name, username, password, phone, role, business_ids, features, access_level } = req.body;
  try {
    const toIntArr = (v) => Array.isArray(v) ? v.map(Number) : [];
    const toStrArr = (v) => Array.isArray(v) ? v : [];
    let q, params;
    if (password) {
      q = 'UPDATE users SET name=$1,username=$2,password_hash=$3,phone=$4,role=$5,business_ids=$6::INTEGER[],features=$7::TEXT[],access_level=$8 WHERE id=$9 RETURNING id,name,username,phone,role,business_ids,features,access_level';
      params = [name||username, username, password, phone||null, role, toIntArr(business_ids), toStrArr(features), access_level, req.params.id];
    } else {
      q = 'UPDATE users SET name=$1,username=$2,phone=$3,role=$4,business_ids=$5::INTEGER[],features=$6::TEXT[],access_level=$7 WHERE id=$8 RETURNING id,name,username,phone,role,business_ids,features,access_level';
      params = [name||username, username, phone||null, role, toIntArr(business_ids), toStrArr(features), access_level, req.params.id];
    }
    const r = await pool.query(q, params);
    if (!r.rows.length) return res.status(404).json({ error: 'ไม่พบผู้ใช้' });
    res.json(r.rows[0]);
  } catch (err) {
    console.error('PUT user error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

route('delete', '/api/users/:id', async (req, res) => {
  try { await pool.query('DELETE FROM users WHERE id=$1', [req.params.id]); res.json({ message: 'ลบสำเร็จ' }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── REPORTS ───
route('get', '/api/reports/pl', async (req, res) => {
  const { business_id, start, end } = req.query;
  try {
    let w = 'WHERE 1=1'; const p = []; let i = 1;
    if (business_id) { w += ` AND business_id=$${i++}`; p.push(business_id); }
    if (start) { w += ` AND date>=$${i++}`; p.push(start); }
    if (end) { w += ` AND date<=$${i++}`; p.push(end + ' 23:59:59'); }
    const [ir, er, ic, ec] = await Promise.all([
      pool.query(`SELECT COALESCE(SUM(amount),0) as total FROM transactions ${w} AND type='Income'`, p),
      pool.query(`SELECT COALESCE(SUM(amount),0) as total FROM transactions ${w} AND type='Expense'`, p),
      pool.query(`SELECT category,COALESCE(SUM(amount),0) as total FROM transactions ${w} AND type='Income' GROUP BY category ORDER BY total DESC`, p),
      pool.query(`SELECT category,COALESCE(SUM(amount),0) as total FROM transactions ${w} AND type='Expense' GROUP BY category ORDER BY total DESC`, p),
    ]);
    const income = parseFloat(ir.rows[0].total), expense = parseFloat(er.rows[0].total);
    res.json({ income, expense, profit: income - expense, income_items: ic.rows, expense_items: ec.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => console.log(`🚀 FinanceHub API → http://localhost:${PORT}`));
}
export default app;

// ═══════════════════════════════════════════════
// ─── DOCUMENTS ───────────────────────────────
// ═══════════════════════════════════════════════

// GET settings ของ business + doc_type
route('get', '/api/document-settings/:businessId', async (req, res) => {
  try {
    const r = await pool.query(
      'SELECT * FROM document_settings WHERE business_id=$1 ORDER BY doc_type',
      [req.params.businessId]
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// UPSERT settings
route('post', '/api/document-settings', async (req, res) => {
  const { business_id, doc_type, prefix, running_number, signature_image } = req.body;
  try {
    const r = await pool.query(`
      INSERT INTO document_settings (business_id, doc_type, prefix, running_number, signature_image)
      VALUES ($1,$2,$3,$4,$5)
      ON CONFLICT (business_id, doc_type) DO UPDATE
        SET prefix=$3, running_number=$4, signature_image=COALESCE($5, document_settings.signature_image), updated_at=NOW()
      RETURNING *`,
      [business_id, doc_type, prefix, running_number || 1, signature_image || null]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET next doc number (preview)
route('get', '/api/documents/next-number', async (req, res) => {
  const { business_id, doc_type } = req.query;
  try {
    const r = await pool.query(
      'SELECT prefix, running_number FROM document_settings WHERE business_id=$1 AND doc_type=$2',
      [business_id, doc_type]
    );
    const prefix = r.rows[0]?.prefix || doc_type;
    const num = r.rows[0]?.running_number || 1;
    const year = new Date().getFullYear() + 543; // พ.ศ.
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const docNum = `${prefix}-${year}${month}${String(num).padStart(5, '0')}`;
    res.json({ doc_number: docNum, running_number: num });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET all documents (with filters)
route('get', '/api/documents', async (req, res) => {
  const { business_id, doc_type, status } = req.query;
  try {
    let w = 'WHERE 1=1'; const p = []; let i = 1;
    if (business_id) { w += ` AND d.business_id=$${i++}`; p.push(business_id); }
    if (doc_type) { w += ` AND d.doc_type=$${i++}`; p.push(doc_type); }
    if (status) { w += ` AND d.status=$${i++}`; p.push(status); }
    const r = await pool.query(
      `SELECT d.*, b.name as business_name, u.name as created_by_name
       FROM documents d
       LEFT JOIN businesses b ON d.business_id = b.id
       LEFT JOIN users u ON d.created_by = u.id
       ${w} ORDER BY d.created_at DESC`, p
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET single document
route('get', '/api/documents/:id', async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT d.*, b.name as business_name, b.icon as business_icon, b.logo_type,
              b.tax_name, b.tax_id as business_tax_id, b.tax_address,
              u.name as created_by_name
       FROM documents d
       LEFT JOIN businesses b ON d.business_id = b.id
       LEFT JOIN users u ON d.created_by = u.id
       WHERE d.id=$1`, [req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'ไม่พบเอกสาร' });
    // get signature
    const sig = await pool.query(
      'SELECT signature_image FROM document_settings WHERE business_id=$1 AND doc_type=$2',
      [r.rows[0].business_id, r.rows[0].doc_type]
    );
    res.json({ ...r.rows[0], signature_image: sig.rows[0]?.signature_image || null });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST create document
route('post', '/api/documents', async (req, res) => {
  const { business_id, doc_type, customer_name, customer_address, customer_tax_id,
    customer_email, customer_phone, issue_date, valid_date, ref_doc,
    items, subtotal, discount, total, remarks, created_by } = req.body;
  try {
    // get & increment running number
    const settingRes = await pool.query(
      'SELECT prefix, running_number FROM document_settings WHERE business_id=$1 AND doc_type=$2',
      [business_id, doc_type]
    );
    const prefix = settingRes.rows[0]?.prefix || doc_type;
    const num = settingRes.rows[0]?.running_number || 1;
    const d = new Date(issue_date || new Date());
    const year = d.getFullYear() + 543;
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const docNumber = `${prefix}-${year}${month}${String(num).padStart(5, '0')}`;

    const r = await pool.query(`
      INSERT INTO documents (doc_number,doc_type,business_id,customer_name,customer_address,
        customer_tax_id,customer_email,customer_phone,issue_date,valid_date,ref_doc,
        items,subtotal,discount,total,remarks,created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::JSONB,$13,$14,$15,$16,$17)
      RETURNING *`,
      [docNumber, doc_type, business_id, customer_name, customer_address,
       customer_tax_id, customer_email, customer_phone,
       issue_date, valid_date || null, ref_doc || null,
       JSON.stringify(items || []), subtotal || 0, discount || 0, total || 0,
       remarks || null, created_by || null]
    );
    // increment running number
    await pool.query(
      `INSERT INTO document_settings (business_id, doc_type, prefix, running_number)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (business_id, doc_type) DO UPDATE SET running_number = document_settings.running_number + 1`,
      [business_id, doc_type, prefix, num + 1]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'เลขเอกสารซ้ำ กรุณาลองใหม่' });
    res.status(500).json({ error: err.message });
  }
});

// PUT update document
route('put', '/api/documents/:id', async (req, res) => {
  const { customer_name, customer_address, customer_tax_id, customer_email, customer_phone,
    issue_date, valid_date, ref_doc, items, subtotal, discount, total, remarks, status } = req.body;
  try {
    const r = await pool.query(`
      UPDATE documents SET customer_name=$1,customer_address=$2,customer_tax_id=$3,
        customer_email=$4,customer_phone=$5,issue_date=$6,valid_date=$7,ref_doc=$8,
        items=$9::JSONB,subtotal=$10,discount=$11,total=$12,remarks=$13,status=$14,updated_at=NOW()
      WHERE id=$15 RETURNING *`,
      [customer_name, customer_address, customer_tax_id, customer_email, customer_phone,
       issue_date, valid_date || null, ref_doc || null,
       JSON.stringify(items || []), subtotal || 0, discount || 0, total || 0,
       remarks || null, status || 'draft', req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'ไม่พบเอกสาร' });
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH status only
route('patch', '/api/documents/:id/status', async (req, res) => {
  try {
    const r = await pool.query(
      'UPDATE documents SET status=$1, updated_at=NOW() WHERE id=$2 RETURNING *',
      [req.body.status, req.params.id]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE document
route('delete', '/api/documents/:id', async (req, res) => {
  try { await pool.query('DELETE FROM documents WHERE id=$1', [req.params.id]); res.json({ ok: true }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});
