// Vercel Serverless Function - Catch all API routes
import app from '../server/index.js';

export default async function handler(req, res) {
  // Vercel strips /api from req.url when routing to [...]path].js
  // e.g. DELETE /api/businesses/3 arrives as req.url = '/businesses/3'
  // Restore /api prefix so Express routes match correctly
  if (!req.url.startsWith('/api')) {
    req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
  }
  return new Promise((resolve, reject) => {
    app(req, res);
    res.on('finish', resolve);
    res.on('error', reject);
  });
}
