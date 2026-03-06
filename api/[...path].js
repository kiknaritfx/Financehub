import app from '../server/index.js';

export default async function handler(req, res) {
  // Vercel ตัด /api prefix ออกก่อนส่งให้ handler
  // req.url จะเป็น /businesses/51, /reports/pl?... ฯลฯ
  // ต้องเติม /api กลับเข้าไปให้ Express หา route เจอ
  if (!req.url.startsWith('/api')) {
    req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
  }
  return new Promise((resolve, reject) => {
    app(req, res);
    res.on('finish', resolve);
    res.on('error', reject);
  });
}
