const { supabaseAnon } = require('../services/supabaseAnon');

async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length)
    : null;

  if (!token) {
    return res.status(401).json({ error: 'Missing bearer token' });
  }

  const { data, error } = await supabaseAnon.auth.getUser(token);

  if (error || !data?.user) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  req.user = data.user;
  req.accessToken = token;
  return next();
}

module.exports = { requireAuth };
