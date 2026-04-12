const express = require('express');
const {
  createRazorpayOrder,
  verifyAndCreateOrder,
  getMyOrdersWithFulfillment,
  updateOrderStatus,
  getOrderDetails,
  getSellerOrders,
  confirmPickup,
} = require('../controllers/paymentController');
const { requireAuth } = require('../middleware/auth');
const { createOrderLimiter, verifyPaymentLimiter } = require('../middleware/rateLimit');

const router = express.Router();

router.post('/create-order', requireAuth, createOrderLimiter, createRazorpayOrder);
router.post('/verify-and-create-order', requireAuth, verifyPaymentLimiter, verifyAndCreateOrder);
router.get('/my-orders', requireAuth, getMyOrdersWithFulfillment);
router.get('/orders/:orderId', requireAuth, getOrderDetails);
router.patch('/orders/:orderId/status', requireAuth, updateOrderStatus);
router.patch('/orders/:orderId/reschedule', requireAuth, rescheduleOrder);
router.post('/orders/return', requireAuth, initiateReturn);

// Seller endpoints
router.get('/seller-orders', requireAuth, getSellerOrders);
router.patch('/orders/:orderId/pickup/confirm', requireAuth, confirmPickup);

module.exports = router;
