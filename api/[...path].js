import app from '../server/index.js';

export default async function handler(req, res) {
  // Debug: log ทุก request เพื่อดูว่า req.url เป็นอะไรจริงๆ
  console.log(`[Handler] ${req.method} ${req.url}`);
  
  // Vercel อาจส่ง path มาหลายแบบ normalize ให้เป็น /api/xxx เสมอ
  if (!req.url.startsWith('/api')) {
    req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
  }
  
  console.log(`[Handler] normalized to: ${req.url}`);

  return new Promise((resolve, reject) => {
    app(req, res);
    res.on('finish', resolve);
    res.on('error', reject);
  });
}
