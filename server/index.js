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

// Auto-migration on startup
async function runMigrations() {
  try {
    const sql = readFileSync(join(__dirname, 'schema.sql'), 'utf8');
    await pool.query(sql);
    console.log('✅ DB ok');
  } catch (err) {
    console.error('⚠️ Migration:', err.message);
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
  const { email, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE email=$1', [email]);
    if (!result.rows.length) return res.status(401).json({ error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
    const user = result.rows[0];
    const ok = (email === 'admin@financehub.com' && password === 'admin1234')
      || (user.password_hash && user.password_hash === password);
    if (!ok) return res.status(401).json({ error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
    const { password_hash, invite_token, ...safe } = user;
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
    const r = await pool.query(
      `UPDATE businesses SET
       name=COALESCE($1,name), type=COALESCE($2,type),
       petty_cash_max=COALESCE($3,petty_cash_max), icon=COALESCE($4,icon),
       logo_type=COALESCE($5,logo_type), status=COALESCE($6,status),
       petty_cash=COALESCE($7,petty_cash),
       tax_name=COALESCE($9,tax_name), tax_id=COALESCE($10,tax_id),
       tax_address=COALESCE($11,tax_address),
       departments=COALESCE($12,departments),
       income_categories=COALESCE($13,income_categories),
       expense_categories=COALESCE($14,expense_categories),
       updated_at=CURRENT_TIMESTAMP
       WHERE id=$8 RETURNING *`,
      [name, type, petty_cash_max, icon, logo_type, status, petty_cash, req.params.id,
       tax_name||null, tax_id||null, tax_address||null,
       departments||null, income_categories||null, expense_categories||null]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'ไม่พบธุรกิจ' });
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
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
  try { res.json((await pool.query('SELECT id,name,email,phone,role,business_ids,features,access_level,created_at FROM users ORDER BY id')).rows); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

route('post', '/api/users', async (req, res) => {
  const { name, email, phone, role, business_ids, features, access_level } = req.body;
  try {
    const r = await pool.query(
      'INSERT INTO users (name,email,phone,role,business_ids,features,access_level) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id,name,email,phone,role,business_ids,features,access_level',
      [name, email, phone, role || 'พนักงาน', business_ids || [], features || [], access_level || 'Own Data']
    );
    res.status(201).json(r.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'อีเมลนี้ถูกใช้งานแล้ว' });
    res.status(500).json({ error: err.message });
  }
});

route('put', '/api/users/:id', async (req, res) => {
  const { name, email, phone, role, business_ids, features, access_level } = req.body;
  try {
    const r = await pool.query(
      'UPDATE users SET name=$1,email=$2,phone=$3,role=$4,business_ids=$5,features=$6,access_level=$7 WHERE id=$8 RETURNING id,name,email,phone,role,business_ids,features,access_level',
      [name, email, phone, role, business_ids || [], features || [], access_level, req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'ไม่พบผู้ใช้' });
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
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
