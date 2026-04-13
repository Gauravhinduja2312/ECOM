const { supabaseAnon } = require('../services/supabaseAnon');
const { supabaseAdmin } = require('../services/supabaseAdmin');

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

  // Fetch user profile to get role/admin status
  const { data: userProfile, error: profileError } = await supabaseAdmin
    .from('users')
    .select('role')
    .eq('id', req.user.id)
    .single();

  if (!profileError && userProfile) {
    req.user.is_admin = userProfile.role === 'admin';
  } else {
    req.user.is_admin = false;
  }

  next();
}

async function requireAdmin(req, res, next) {
  // requireAdmin assumes requireAuth was called before it
  if (!req.user || !req.user.is_admin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

module.exports = { 
  requireAuth,
  requireAdmin
};
