// Vercel Serverless Function - Catch all API routes
import app from '../server/index.js';

export default async function handler(req, res) {
  return new Promise((resolve, reject) => {
    app(req, res);
    res.on('finish', resolve);
    res.on('error', reject);
  });
}
