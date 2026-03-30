const express = require('express');
const {
  getAnalytics,
  getProductSubmissions,
  reviewProductSubmission,
  getSellerPayouts,
  markSellerPayoutsPaid,
  updateOrderStatus,
} = require('../controllers/adminController');
const { requireAuth } = require('../middleware/auth');
const { supabaseAdmin } = require('../services/supabaseAdmin');

const router = express.Router();

async function requireAdmin(req, res, next) {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('role, email')
    .eq('id', req.user.id)
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  if (!data || String(data.role || '').toLowerCase() !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  return next();
}

router.get('/analytics', requireAuth, requireAdmin, getAnalytics);
router.get('/product-submissions', requireAuth, requireAdmin, getProductSubmissions);
router.patch('/product-submissions/:productId/review', requireAuth, requireAdmin, reviewProductSubmission);
router.get('/seller-payouts', requireAuth, requireAdmin, getSellerPayouts);
router.patch('/seller-payouts/:sellerId/mark-paid', requireAuth, requireAdmin, markSellerPayoutsPaid);
router.patch('/orders/:orderId/status', requireAuth, requireAdmin, updateOrderStatus);

module.exports = router;
