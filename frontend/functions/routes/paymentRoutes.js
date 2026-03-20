const express = require('express');
const {
  createRazorpayOrder,
  verifyAndCreateOrder,
} = require('../controllers/paymentController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/create-order', requireAuth, createRazorpayOrder);
router.post('/verify-and-create-order', requireAuth, verifyAndCreateOrder);

module.exports = router;
