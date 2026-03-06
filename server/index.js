import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pool from './db.js';

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Middleware
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ limit: '20mb', extended: true }));

// Auto-migration on startup (ทำงานเมื่อ Server เริ่มต้น)
async function runMigrations() {
  try {
    const sql = readFileSync(join(__dirname, 'schema.sql'), 'utf8');
    await pool.query(sql);
    console.log('✅ Database Schema Updated');
  } catch (err) {
    console.error('⚠️ Migration Error:', err.message);
  }
}
runMigrations();

// ─── Helper: register route with both /api/xxx and /xxx (Vercel Compatibility) ───
function route(method, path, handler) {
  app[method](path, handler);
  app[method](path.replace('/api/', '/'), handler);
}

// ─── HEALTH CHECK ───
route('get', '/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected', timestamp: new Date() });
  } catch (err) {
    res.status(500).json({ status: 'error', error: err.message });
  }
});

// ─── USERS MANAGEMENT ───

// GET ALL USERS
route('get', '/api/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CREATE USER
route('post', '/api/users', async (req, res) => {
  const { name, email, phone, role, business_ids, features, access_level } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO users (name, email, phone, role, business_ids, features, access_level) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [name, email, phone, role, business_ids || [], features || [], access_level || 'Own Data']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE USER
route('put', '/api/users/:id', async (req, res) => {
  const { name, email, phone, role, business_ids, features, access_level } = req.body;
  try {
    const result = await pool.query(
      `UPDATE users SET name=$1, email=$2, phone=$3, role=$4, business_ids=$5, features=$6, access_level=$7 
       WHERE id=$8 RETURNING *`,
      [name, email, phone, role, business_ids, features, access_level, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE USER
route('delete', '/api/users/:id', async (req, res) => {