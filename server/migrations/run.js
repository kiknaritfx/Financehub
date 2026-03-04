import "dotenv/config";
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pool from '../db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigrations() {
  try {
    console.log('🔄 Running database migrations...');
    
    const schemaSQL = readFileSync(join(__dirname, '../schema.sql'), 'utf8');
    await pool.query(schemaSQL);
    
    console.log('✅ Migrations completed successfully!');
    console.log('📊 Tables created: businesses, users, transactions, audit_logs');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations();
