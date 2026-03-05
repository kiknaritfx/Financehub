
import app from '../server/index.js';

export default async function handler(req, res) {
  if (!req.url.startsWith('/api/')) {
    req.url = '/api' + req.url;
  }
  return new Promise((resolve, reject) => {
    app(req, res);
    res.on('finish', resolve);
    res.on('error', reject);
  });
}
