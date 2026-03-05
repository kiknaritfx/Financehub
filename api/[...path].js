import app from '../server/index.js';

export default async function handler(req, res) {
  const originalUrl = req.url;
  
  // Vercel sends path WITHOUT /api prefix to this catch-all handler
  // e.g. PUT /api/businesses/3 → req.url = '/businesses/3'
  // The route() helper in server registers BOTH /api/xxx and /xxx
  // So we just need to make sure it doesn't have double /api
  if (req.url.startsWith('/api/api/')) {
    req.url = req.url.replace('/api/api/', '/api/');
  }

  return new Promise((resolve, reject) => {
    app(req, res);
    res.on('finish', resolve);
    res.on('error', reject);
  });
}
