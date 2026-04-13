const express = require('express');
const {
  getAnalytics,
  getProductSubmissions,
  reviewProductSubmission,
  getSellerPayouts,
  markSellerPayoutsPaid,
  updateOrderStatus,
  getOrders,
} = require('../controllers/adminController');
const { acquireProductInventory } = require('../controllers/productController');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { supabaseAdmin } = require('../services/supabaseAdmin');

const router = express.Router();
const ADMIN_EMAIL = String(process.env.ADMIN_EMAIL || 'gauravhinduja99@gmail.com').toLowerCase();

router.get('/analytics', requireAuth, requireAdmin, getAnalytics);
router.get('/product-submissions', requireAuth, requireAdmin, getProductSubmissions);
router.patch('/product-submissions/:productId/review', requireAuth, requireAdmin, reviewProductSubmission);
router.get('/seller-payouts', requireAuth, requireAdmin, getSellerPayouts);
router.patch('/seller-payouts/:sellerId/mark-paid', requireAuth, requireAdmin, markSellerPayoutsPaid);
router.patch('/orders/:orderId/status', requireAuth, requireAdmin, updateOrderStatus);
router.get('/orders', requireAuth, requireAdmin, getOrders);
router.patch('/products/:productId/acquire', requireAuth, requireAdmin, acquireProductInventory);

module.exports = router;
