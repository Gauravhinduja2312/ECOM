const express = require('express');
const { getAnalytics } = require('../controllers/adminController');
const { requireAuth } = require('../middleware/auth');
const { supabaseAdmin } = require('../services/supabaseAdmin');

const router = express.Router();

router.get('/analytics', requireAuth, async (req, res, next) => {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('role')
    .eq('id', req.user.id)
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  if (!data || data.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  return next();
}, getAnalytics);

module.exports = router;
