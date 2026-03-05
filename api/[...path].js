// Vercel Serverless Function - Catch all API routes
import app from '../server/index.js';

export default async function handler(req, res) {
  // Vercel passes the path without /api prefix in req.url
  // We need to prepend /api so Express routes match
  const originalUrl = req.url;
  if (!req.url.startsWith('/api')) {
    req.url = '/api/' + req.url.replace(/^\//, '');
  }
  
  return new Promise((resolve, reject) => {
    app(req, res);
    res.on('finish', resolve);
    res.on('error', reject);
  });
}
