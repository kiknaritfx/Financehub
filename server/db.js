import "dotenv/config";
import pg from 'pg';
const { Pool } = pg;

// เชื่อมต่อ Database จาก Environment Variable
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' 
    ? { rejectUnauthorized: false }  // จำเป็นสำหรับ Neon + Vercel
    : false
});

// ทดสอบการเชื่อมต่อ
pool.on('connect', () => {
  console.log('✅ Database connected successfully');
});

pool.on('error', (err) => {
  console.error('❌ Database connection error:', err.message);
});

export default pool;
