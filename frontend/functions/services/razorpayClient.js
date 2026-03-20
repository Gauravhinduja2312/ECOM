const Razorpay = require('razorpay');
const { getEnv } = require('../utils/env');

const razorpay = new Razorpay({
  key_id: getEnv('RAZORPAY_KEY_ID'),
  key_secret: getEnv('RAZORPAY_KEY_SECRET'),
});

module.exports = { razorpay };
