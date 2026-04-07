const express = require('express');
const {
  createRazorpayOrder,
  verifyAndCreateOrder,
  getMyOrdersWithFulfillment,
  updateOrderStatus,
  getOrderDetails,
} = require('../controllers/paymentController');
const { requireAuth } = require('../middleware/auth');
const { createOrderLimiter, verifyPaymentLimiter } = require('../middleware/rateLimit');

const router = express.Router();

router.post('/create-order', requireAuth, createOrderLimiter, createRazorpayOrder);
router.post('/verify-and-create-order', requireAuth, verifyPaymentLimiter, verifyAndCreateOrder);
router.get('/my-orders', requireAuth, getMyOrdersWithFulfillment);
router.get('/orders/:orderId', requireAuth, getOrderDetails);
router.patch('/orders/:orderId/status', requireAuth, updateOrderStatus);

module.exports = router;
