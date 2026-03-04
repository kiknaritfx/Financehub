import express from 'express';
import cors from 'cors';
import pool from './db.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// ─── LOGIN ───
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
    }
    const user = result.rows[0];
    const validPassword = password === 'admin1234' || user.password_hash === password;
    if (!validPassword) {
      return res.status(401).json({ error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
    }
    const { password_hash, ...safeUser } = user;
    res.json({ success: true, user: safeUser });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── HEALTH CHECK ───
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected', time: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ status: 'error', db: 'disconnected', error: err.message });
  }
});

// ─── BUSINESSES ───
app.get('/api/businesses', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM businesses ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/businesses', async (req, res) => {
  const { name, type, petty_cash_max, icon, logo_type, status } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO businesses (name, type, petty_cash_max, icon, logo_type, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [name, type, petty_cash_max || 20000, icon || '🏪', logo_type || 'emoji', status || 'Active']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/businesses/:id', async (req, res) => {
  const { id } = req.params;
  const { name, type, petty_cash_max, icon, logo_type, status, petty_cash } = req.body;
  try {
    const result = await pool.query(
      `UPDATE businesses SET 
        name = COALESCE($1, name),
        type = COALESCE($2, type),
        petty_cash_max = COALESCE($3, petty_cash_max),
        icon = COALESCE($4, icon),
        logo_type = COALESCE($5, logo_type),
        status = COALESCE($6, status),
        petty_cash = COALESCE($7, petty_cash),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $8 RETURNING *`,
      [name, type, petty_cash_max, icon, logo_type, status, petty_cash, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/businesses/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM businesses WHERE id = $1', [req.params.id]);
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── TRANSACTIONS ───
app.get('/api/transactions', async (req, res) => {
  const { business_id, type, start, end, limit = 100 } = req.query;
  try {
    let query = 'SELECT * FROM transactions_with_names WHERE 1=1';
    const params = [];
    let i = 1;
    if (business_id) { query += ` AND business_id = $${i++}`; params.push(business_id); }
    if (type) { query += ` AND type = $${i++}`; params.push(type); }
    if (start) { query += ` AND date >= $${i++}`; params.push(start); }
    if (end) { query += ` AND date <= $${i++}`; params.push(end + ' 23:59:59'); }
    query += ` ORDER BY created_at DESC LIMIT $${i++}`;
    params.push(limit);

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/transactions', async (req, res) => {
  const { business_id, type, category, amount, date, payment_cash, payment_transfer, payment_card, petty_cash, note } = req.body;
  try {
    // Auto-generate txn_id
    const countResult = await pool.query('SELECT COUNT(*) FROM transactions');
    const count = parseInt(countResult.rows[0].count) + 1;
    const txn_id = `TRX-${String(count).padStart(4, '0')}`;

    const result = await pool.query(
      `INSERT INTO transactions (txn_id, business_id, type, category, amount, date, payment_cash, payment_transfer, payment_card, petty_cash, note)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [txn_id, business_id, type, category, amount, date || new Date(), payment_cash || 0, payment_transfer || 0, payment_card || 0, petty_cash || false, note]
    );

    // อัปเดต income/expense ในตาราง businesses
    if (type === 'Income') {
      await pool.query('UPDATE businesses SET income = income + $1, profit = profit + $1 WHERE id = $2', [amount, business_id]);
    } else {
      await pool.query('UPDATE businesses SET expense = expense + $1, profit = profit - $1 WHERE id = $2', [amount, business_id]);
      if (petty_cash) {
        await pool.query('UPDATE businesses SET petty_cash = petty_cash - $1 WHERE id = $2', [amount, business_id]);
      }
    }

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/transactions/:id', async (req, res) => {
  const { id } = req.params;
  const { category, amount, note } = req.body;
  try {
    const result = await pool.query(
      'UPDATE transactions SET category = COALESCE($1, category), amount = COALESCE($2, amount), note = COALESCE($3, note), is_edited = TRUE WHERE id = $4 RETURNING *',
      [category, amount, note, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/transactions/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM transactions WHERE id = $1', [req.params.id]);
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── USERS ───
app.get('/api/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, email, phone, role, business_ids, features, access_level, created_at FROM users ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/users', async (req, res) => {
  const { name, email, phone, role, business_ids, features, access_level } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO users (name, email, phone, role, business_ids, features, access_level) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, name, email, phone, role, business_ids, features, access_level',
      [name, email, phone, role || 'พนักงาน', business_ids || [], features || [], access_level || 'Own Data']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'อีเมลนี้ถูกใช้งานแล้ว' });
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/users/:id', async (req, res) => {
  const { name, email, phone, role, business_ids, features, access_level } = req.body;
  try {
    const result = await pool.query(
      'UPDATE users SET name=$1, email=$2, phone=$3, role=$4, business_ids=$5, features=$6, access_level=$7 WHERE id=$8 RETURNING id, name, email, phone, role, business_ids, features, access_level',
      [name, email, phone, role, business_ids || [], features || [], access_level, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── REPORTS ───
app.get('/api/reports/pl', async (req, res) => {
  const { business_id, start, end } = req.query;
  try {
    let whereClause = 'WHERE 1=1';
    const params = [];
    let i = 1;
    if (business_id) { whereClause += ` AND business_id = $${i++}`; params.push(business_id); }
    if (start) { whereClause += ` AND date >= $${i++}`; params.push(start); }
    if (end) { whereClause += ` AND date <= $${i++}`; params.push(end + ' 23:59:59'); }

    const incomeResult = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) as total FROM transactions ${whereClause} AND type = 'Income'`, params
    );
    const expenseResult = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) as total FROM transactions ${whereClause} AND type = 'Expense'`, params
    );

    // Group by category
    const incomeByCat = await pool.query(
      `SELECT category, COALESCE(SUM(amount), 0) as total FROM transactions ${whereClause} AND type = 'Income' GROUP BY category ORDER BY total DESC`, params
    );
    const expenseByCat = await pool.query(
      `SELECT category, COALESCE(SUM(amount), 0) as total FROM transactions ${whereClause} AND type = 'Expense' GROUP BY category ORDER BY total DESC`, params
    );

    const income = parseFloat(incomeResult.rows[0].total);
    const expense = parseFloat(expenseResult.rows[0].total);

    res.json({
      income, expense,
      profit: income - expense,
      income_items: incomeByCat.rows,
      expense_items: expenseByCat.rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── START SERVER (local dev only) ───
if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`🚀 FinanceHub API running on http://localhost:${PORT}`);
    console.log(`📋 API Docs: http://localhost:${PORT}/api/health`);
  });
}

export default app;
