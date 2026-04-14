const express = require('express');
const {
  getAnalytics,
  getProductSubmissions,
  reviewProductSubmission,
  getSellerPayouts,
  markSellerPayoutsPaid,
  updateOrderStatus,
  getOrders,
  verifyHandoverCode,
} = require('../controllers/adminController');
const { acquireProductInventory } = require('../controllers/productController');
const { requireAuth } = require('../middleware/auth');
const { supabaseAdmin } = require('../services/supabaseAdmin');

const router = express.Router();
const ADMIN_EMAIL = String(process.env.ADMIN_EMAIL || 'gauravhinduja99@gmail.com').toLowerCase();

async function requireAdmin(req, res, next) {
  const requestEmail = String(req.user?.email || '').trim().toLowerCase();

  const { data, error } = await supabaseAdmin
    .from('users')
    .select('role, email')
    .eq('id', req.user.id)
    .maybeSingle();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  const isRoleAdmin = String(data?.role || '').toLowerCase() === 'admin';
  const isEmailAdmin = Boolean(requestEmail) && requestEmail === ADMIN_EMAIL;

  if (!isRoleAdmin && !isEmailAdmin) {
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
router.get('/orders', requireAuth, requireAdmin, getOrders);
router.patch('/products/:productId/acquire', requireAuth, requireAdmin, acquireProductInventory);
router.post('/verify-handover', requireAuth, requireAdmin, verifyHandoverCode);

module.exports = router;
