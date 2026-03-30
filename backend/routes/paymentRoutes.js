const express = require('express');
const {
  createRazorpayOrder,
  verifyAndCreateOrder,
  getMyOrdersWithFulfillment,
} = require('../controllers/paymentController');
const { requireAuth } = require('../middleware/auth');
const { createOrderLimiter, verifyPaymentLimiter } = require('../middleware/rateLimit');

const router = express.Router();

router.post('/create-order', requireAuth, createOrderLimiter, createRazorpayOrder);
router.post('/verify-and-create-order', requireAuth, verifyPaymentLimiter, verifyAndCreateOrder);
router.get('/my-orders', requireAuth, getMyOrdersWithFulfillment);

module.exports = router;
