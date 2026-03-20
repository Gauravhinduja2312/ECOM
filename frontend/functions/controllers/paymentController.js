const crypto = require('node:crypto');
const { razorpay } = require('../services/razorpayClient');
const { supabaseAdmin } = require('../services/supabaseAdmin');
const { getEnv } = require('../utils/env');
const { isPositiveNumber, isValidArray } = require('../utils/validation');

async function createRazorpayOrder(req, res) {
  try {
    const { amount, currency = 'INR', receipt } = req.body;

    if (!isPositiveNumber(amount)) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100),
      currency,
      receipt,
    });

    return res.json(order);
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Failed to create payment order' });
  }
}

async function verifyAndCreateOrder(req, res) {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      items,
      total,
      userId,
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing payment verification fields' });
    }

    if (!isValidArray(items) || !isPositiveNumber(total) || !userId) {
      return res.status(400).json({ error: 'Invalid order payload' });
    }

    if (req.user.id !== userId) {
      return res.status(403).json({ error: 'Forbidden user mismatch' });
    }

    const payload = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', getEnv('RAZORPAY_KEY_SECRET'))
      .update(payload)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ error: 'Payment signature verification failed' });
    }

    const { data: createdOrder, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        user_id: userId,
        total_price: total,
        status: 'paid',
      })
      .select('*')
      .single();

    if (orderError) {
      return res.status(500).json({ error: orderError.message });
    }

    const orderItemsPayload = items.map((item) => ({
      order_id: createdOrder.id,
      product_id: item.product_id,
      quantity: item.quantity,
      price: item.price,
    }));

    const { error: orderItemsError } = await supabaseAdmin
      .from('order_items')
      .insert(orderItemsPayload);

    if (orderItemsError) {
      return res.status(500).json({ error: orderItemsError.message });
    }

    for (const item of items) {
      const { data: product, error: productError } = await supabaseAdmin
        .from('products')
        .select('stock')
        .eq('id', item.product_id)
        .single();

      if (productError) {
        return res.status(500).json({ error: productError.message });
      }

      const newStock = Math.max(0, Number(product.stock) - Number(item.quantity));

      const { error: stockUpdateError } = await supabaseAdmin
        .from('products')
        .update({ stock: newStock })
        .eq('id', item.product_id);

      if (stockUpdateError) {
        return res.status(500).json({ error: stockUpdateError.message });
      }
    }

    const { error: cartDeleteError } = await supabaseAdmin
      .from('cart')
      .delete()
      .eq('user_id', userId);

    if (cartDeleteError) {
      return res.status(500).json({ error: cartDeleteError.message });
    }

    return res.json({
      success: true,
      message: 'Payment verified and order created successfully',
      order: createdOrder,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Failed to verify payment' });
  }
}

module.exports = {
  createRazorpayOrder,
  verifyAndCreateOrder,
};
