import app from '../server/index.js';

export default async function handler(req, res) {
  // Vercel catch-all รับ path แบบ /transactions/2 (ไม่มี /api prefix)
  // Express register ไว้ทั้ง /api/xxx และ /xxx ผ่าน route() helper
  // ไม่ต้องแก้ path เพราะ route() register /xxx ไว้แล้ว
  return new Promise((resolve, reject) => {
    app(req, res);
    res.on('finish', resolve);
    res.on('error', reject);
  });
}
