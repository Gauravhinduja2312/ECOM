const crypto = require('node:crypto');
const { razorpay } = require('../services/razorpayClient');
const { supabaseAdmin } = require('../services/supabaseAdmin');
const {
  isPositiveNumber,
  isValidArray,
} = require('../utils/validation');

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
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(payload)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ error: 'Payment signature verification failed' });
    }

    const productIds = [...new Set(items.map((item) => Number(item.product_id)).filter(Boolean))];

    const { data: products, error: productsError } = await supabaseAdmin
      .from('products')
      .select('id, price, stock, commission_rate, verification_status, seller_id')
      .in('id', productIds);

    if (productsError) {
      return res.status(500).json({ error: productsError.message });
    }

    const productMap = new Map((products || []).map((product) => [Number(product.id), product]));

    const computedItems = [];
    let computedTotal = 0;

    for (const item of items) {
      const productId = Number(item.product_id);
      const quantity = Number(item.quantity);
      const product = productMap.get(productId);

      if (!product) {
        return res.status(400).json({ error: `Product ${productId} not found` });
      }

      if (product.verification_status !== 'verified') {
        return res.status(400).json({ error: `Product ${productId} is not approved for sale` });
      }

      if (!Number.isInteger(quantity) || quantity <= 0) {
        return res.status(400).json({ error: `Invalid quantity for product ${productId}` });
      }

      if (Number(product.stock) < quantity) {
        return res.status(400).json({ error: `Insufficient stock for product ${productId}` });
      }

      const unitPrice = Number(product.price);
      const lineTotal = unitPrice * quantity;
      const commissionRate = Number(product.commission_rate || 0);
      const commissionAmount = Number(((lineTotal * commissionRate) / 100).toFixed(2));
      const sellerEarning = Number((lineTotal - commissionAmount).toFixed(2));

      computedTotal += lineTotal;

      computedItems.push({
        product_id: productId,
        seller_id: product.seller_id,
        quantity,
        price: unitPrice,
        commission_rate: commissionRate,
        commission_amount: commissionAmount,
        seller_earning: sellerEarning,
      });
    }

    const normalizedComputedTotal = Number(computedTotal.toFixed(2));
    const normalizedRequestedTotal = Number(Number(total).toFixed(2));

    if (Math.abs(normalizedComputedTotal - normalizedRequestedTotal) > 1) {
      return res.status(400).json({
        error: `Price mismatch detected. Expected ${normalizedComputedTotal}, received ${normalizedRequestedTotal}`,
      });
    }

    const { data: createdOrder, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        user_id: userId,
        total_price: normalizedComputedTotal,
        status: 'paid',
      })
      .select('*')
      .single();

    if (orderError) {
      return res.status(500).json({ error: orderError.message });
    }

    const orderItemsPayload = computedItems.map((item) => ({
      order_id: createdOrder.id,
      product_id: item.product_id,
      quantity: item.quantity,
      price: item.price,
      commission_rate: item.commission_rate,
      commission_amount: item.commission_amount,
      seller_earning: item.seller_earning,
    }));

    const { error: orderItemsError } = await supabaseAdmin
      .from('order_items')
      .insert(orderItemsPayload);

    if (orderItemsError) {
      return res.status(500).json({ error: orderItemsError.message });
    }

    for (const item of computedItems) {
      const sourceProduct = productMap.get(Number(item.product_id));
      const newStock = Math.max(0, Number(sourceProduct.stock) - Number(item.quantity));

      const { error: stockUpdateError } = await supabaseAdmin
        .from('products')
        .update({ stock: newStock })
        .eq('id', item.product_id);

      if (stockUpdateError) {
        return res.status(500).json({ error: stockUpdateError.message });
      }
    }

    const autoPayoutEnabled = String(process.env.AUTO_PAYOUT_ENABLED || 'false').toLowerCase() === 'true';
    const payoutSummary = {
      autoPayoutEnabled,
      transferredCount: 0,
      transferredAmount: 0,
      skippedCount: 0,
      skippedSellers: [],
      transferErrors: [],
    };

    if (autoPayoutEnabled) {
      const sellerIds = [...new Set(computedItems.map((item) => item.seller_id).filter(Boolean))];

      let sellerAccountById = {};
      if (sellerIds.length) {
        const { data: sellerRows, error: sellerRowsError } = await supabaseAdmin
          .from('users')
          .select('id, email, razorpay_account_id')
          .in('id', sellerIds);

        if (!sellerRowsError) {
          sellerAccountById = Object.fromEntries((sellerRows || []).map((row) => [row.id, row]));
        }
      }

      const sellerPayoutBuckets = {};
      computedItems.forEach((item, index) => {
        if (!item.seller_id) {
          return;
        }

        if (!sellerPayoutBuckets[item.seller_id]) {
          sellerPayoutBuckets[item.seller_id] = {
            totalAmount: 0,
            itemIndexes: [],
          };
        }

        sellerPayoutBuckets[item.seller_id].totalAmount += Number(item.seller_earning || 0);
        sellerPayoutBuckets[item.seller_id].itemIndexes.push(index);
      });

      const sellerIdsForTransfer = Object.keys(sellerPayoutBuckets);

      for (const sellerId of sellerIdsForTransfer) {
        const sellerMeta = sellerAccountById[sellerId] || {};
        const linkedAccountId = sellerMeta.razorpay_account_id;
        const bucket = sellerPayoutBuckets[sellerId];
        const transferAmountInPaise = Math.round(Number(bucket.totalAmount || 0) * 100);

        if (!linkedAccountId || transferAmountInPaise <= 0) {
          payoutSummary.skippedCount += 1;
          payoutSummary.skippedSellers.push({
            sellerId,
            sellerEmail: sellerMeta.email || null,
            reason: !linkedAccountId ? 'missing_razorpay_account_id' : 'invalid_transfer_amount',
          });
          continue;
        }

        try {
          const transfer = await razorpay.transfers.create({
            account: linkedAccountId,
            amount: transferAmountInPaise,
            currency: 'INR',
            notes: {
              order_id: String(createdOrder.id),
              seller_id: sellerId,
              seller_email: sellerMeta.email || '',
            },
          });

          const paidItemIds = bucket.itemIndexes
            .map((itemIndex) => computedItems[itemIndex])
            .map((item) => item.product_id)
            .filter(Boolean);

          const { data: relatedOrderItems } = await supabaseAdmin
            .from('order_items')
            .select('id, product_id')
            .eq('order_id', createdOrder.id)
            .in('product_id', paidItemIds);

          const relatedIds = (relatedOrderItems || []).map((row) => row.id);

          if (relatedIds.length) {
            await supabaseAdmin
              .from('order_items')
              .update({
                payout_status: 'paid',
                payout_paid_at: new Date().toISOString(),
                payout_reference: transfer.id || transfer.utr || transfer.entity || 'auto-transfer',
              })
              .in('id', relatedIds);
          }

          payoutSummary.transferredCount += 1;
          payoutSummary.transferredAmount += Number(bucket.totalAmount || 0);
        } catch (transferError) {
          payoutSummary.transferErrors.push({
            sellerId,
            sellerEmail: sellerMeta.email || null,
            message: transferError.message || 'Transfer failed',
          });
        }
      }

      payoutSummary.transferredAmount = Number(payoutSummary.transferredAmount.toFixed(2));
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
      payoutSummary,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Failed to verify payment' });
  }
}

module.exports = {
  createRazorpayOrder,
  verifyAndCreateOrder,
};
