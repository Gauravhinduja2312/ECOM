const crypto = require('node:crypto');
const { razorpay } = require('../services/razorpayClient');
const { supabaseAdmin } = require('../services/supabaseAdmin');
const { createNotification } = require('../services/notificationService');
const {
  isNonEmptyStringWithMaxLength,
  isPositiveNumber,
  isIntegerInRange,
  isArrayLengthInRange,
  isValidArray,
  isUuid,
} = require('../utils/validation');

async function createRazorpayOrder(req, res) {
  try {
    const { amount, currency = 'INR', receipt } = req.body;

    if (!isPositiveNumber(amount)) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    if (String(currency).toUpperCase() !== 'INR') {
      return res.status(400).json({ error: 'Unsupported currency' });
    }

    if (receipt !== undefined && receipt !== null && !isNonEmptyStringWithMaxLength(receipt, 100)) {
      return res.status(400).json({ error: 'Invalid receipt' });
    }

    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100),
      currency: 'INR',
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
      pickupLocation,
      pickupTime,
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing payment verification fields' });
    }

    if (
      !isNonEmptyStringWithMaxLength(razorpay_order_id, 128)
      || !isNonEmptyStringWithMaxLength(razorpay_payment_id, 128)
      || !isNonEmptyStringWithMaxLength(razorpay_signature, 256)
    ) {
      return res.status(400).json({ error: 'Invalid payment verification fields' });
    }

    if (!isValidArray(items) || !isPositiveNumber(total) || !userId) {
      return res.status(400).json({ error: 'Invalid order payload' });
    }

    const normalizedPickupLocation = String(pickupLocation || '').trim();
    const normalizedPickupTime = pickupTime ? new Date(pickupTime) : null;

    if (!isNonEmptyStringWithMaxLength(normalizedPickupLocation, 120)) {
      return res.status(400).json({ error: 'Pickup location is required (max 120 chars)' });
    }

    if (!(normalizedPickupTime instanceof Date) || Number.isNaN(normalizedPickupTime.getTime())) {
      return res.status(400).json({ error: 'Valid pickup time is required' });
    }

    if (!isUuid(String(userId))) {
      return res.status(400).json({ error: 'Invalid user id format' });
    }

    if (!isArrayLengthInRange(items, 1, 50)) {
      return res.status(400).json({ error: 'Invalid number of order items' });
    }

    if (total > 1000000) {
      return res.status(400).json({ error: 'Total amount exceeds allowed limit' });
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

      if (!isIntegerInRange(productId, 1, 1_000_000_000)) {
        return res.status(400).json({ error: 'Invalid product id in order items' });
      }

      if (!isIntegerInRange(quantity, 1, 100)) {
        return res.status(400).json({ error: `Invalid quantity for product ${productId}` });
      }

      const product = productMap.get(productId);

      if (!product) {
        return res.status(400).json({ error: `Product ${productId} not found` });
      }

      if (product.seller_id && String(product.seller_id) === String(userId)) {
        return res.status(400).json({ error: `You cannot purchase your own product (Product ${productId})` });
      }

      if (product.verification_status !== 'verified') {
        return res.status(400).json({ error: `Product ${productId} is not approved for sale` });
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
        status: 'order_placed',
        pickup_location: normalizedPickupLocation,
        pickup_time: normalizedPickupTime.toISOString(),
        status_updated_at: new Date().toISOString(),
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

    await createNotification({
      userId,
      type: 'order_status',
      title: `Order #${createdOrder.id} placed`,
      message: 'Your order was placed successfully. Seller will process it soon.',
      actionUrl: '/dashboard',
    });

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

async function getMyOrdersWithFulfillment(req, res) {
  try {
    const userId = req.user.id;

    const { data: orders, error: ordersError } = await supabaseAdmin
      .from('orders')
      .select('id, user_id, total_price, status, pickup_location, pickup_time, pickup_confirmed_by_seller, status_updated_at, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (ordersError) {
      return res.status(500).json({ error: ordersError.message });
    }

    if (!orders || orders.length === 0) {
      return res.json({ orders: [] });
    }

    const orderIds = orders.map((order) => order.id);

    const { data: orderItems, error: orderItemsError } = await supabaseAdmin
      .from('order_items')
      .select('id, order_id, product_id, quantity, price')
      .in('order_id', orderIds);

    if (orderItemsError) {
      return res.status(500).json({ error: orderItemsError.message });
    }

    const productIds = [...new Set((orderItems || []).map((item) => item.product_id).filter(Boolean))];

    let productsById = {};
    if (productIds.length) {
      const { data: products, error: productsError } = await supabaseAdmin
        .from('products')
        .select('id, name, seller_id')
        .in('id', productIds);

      if (productsError) {
        return res.status(500).json({ error: productsError.message });
      }

      productsById = Object.fromEntries((products || []).map((product) => [product.id, product]));
    }

    const sellerIds = [...new Set(Object.values(productsById).map((product) => product.seller_id).filter(Boolean))];

    let sellersById = {};
    if (sellerIds.length) {
      const { data: sellers, error: sellersError } = await supabaseAdmin
        .from('users')
        .select('id, email, phone')
        .in('id', sellerIds);

      if (sellersError) {
        return res.status(500).json({ error: sellersError.message });
      }

      sellersById = Object.fromEntries((sellers || []).map((seller) => [seller.id, seller]));
    }

    const itemsByOrderId = {};

    (orderItems || []).forEach((item) => {
      const product = productsById[item.product_id] || null;
      const seller = product?.seller_id ? sellersById[product.seller_id] || null : null;

      if (!itemsByOrderId[item.order_id]) {
        itemsByOrderId[item.order_id] = [];
      }

      itemsByOrderId[item.order_id].push({
        id: item.id,
        product_id: item.product_id,
        product_name: product?.name || `Product #${item.product_id}`,
        quantity: item.quantity,
        price: item.price,
        seller_id: product?.seller_id || null,
        seller_email: seller?.email || null,
        seller_phone: seller?.phone || null,
      });
    });

    const normalizedOrders = orders.map((order) => ({
      ...order,
      items: itemsByOrderId[order.id] || [],
    }));

    return res.json({ orders: normalizedOrders });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Failed to fetch orders' });
  }
}

async function updateOrderStatus(req, res) {
  try {
    const orderId = Number(req.params.orderId);
    const { status } = req.body;

    const validStatuses = ['order_placed', 'processing', 'ready_for_pickup', 'shipped', 'completed'];

    if (!isIntegerInRange(orderId, 1, 1_000_000_000)) {
      return res.status(400).json({ error: 'Invalid order id' });
    }

    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Allowed: ${validStatuses.join(', ')}` });
    }

    // Only admin can update orders
    if (!req.user || !req.user.is_admin) {
      return res.status(403).json({ error: 'Only admin can update order status' });
    }

    const { data: updatedOrder, error: updateError } = await supabaseAdmin
      .from('orders')
      .update({
        status,
        status_updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .select('*')
      .single();

    if (updateError) {
      return res.status(500).json({ error: updateError.message });
    }

    if (!updatedOrder) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Create notification for order status update
    await createNotification({
      userId: updatedOrder.user_id,
      type: 'order_status',
      title: `Order #${updatedOrder.id} - Status Updated`,
      message: `Your order status is now: ${status.replace(/_/g, ' ')}`,
      actionUrl: `/order/${updatedOrder.id}`,
    });

    return res.json({
      success: true,
      message: 'Order status updated successfully',
      order: updatedOrder,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Failed to update order status' });
  }
}

async function getSellerOrders(req, res) {
  try {
    const sellerId = req.user.id;

    if (!req.user.is_admin && req.query.sellerId && String(req.query.sellerId) !== String(sellerId)) {
      return res.status(403).json({ error: 'Forbidden: Can only view your own orders' });
    }

    const querySellerId = req.query.sellerId && req.user.is_admin ? req.query.sellerId : sellerId;

    // Get all order items for this seller
    const { data: sellerOrderItems, error: itemsError } = await supabaseAdmin
      .from('order_items')
      .select('id, order_id, product_id, quantity, price')
      .eq('seller_id', querySellerId);

    if (itemsError) {
      return res.status(500).json({ error: itemsError.message });
    }

    if (!sellerOrderItems || sellerOrderItems.length === 0) {
      return res.json({ orders: [] });
    }

    const orderIds = [...new Set(sellerOrderItems.map((item) => item.order_id))];

    // Get orders
    const { data: orders, error: ordersError } = await supabaseAdmin
      .from('orders')
      .select('id, user_id, total_price, status, pickup_location, pickup_time, status_updated_at, created_at')
      .in('id', orderIds)
      .order('created_at', { ascending: false });

    if (ordersError) {
      return res.status(500).json({ error: ordersError.message });
    }

    // Get buyer info
    const buyerIds = [...new Set((orders || []).map((o) => o.user_id))];
    let buyersById = {};
    if (buyerIds.length) {
      const { data: buyers } = await supabaseAdmin
        .from('users')
        .select('id, email, full_name, phone')
        .in('id', buyerIds);

      if (buyers) {
        buyersById = Object.fromEntries(buyers.map((b) => [b.id, b]));
      }
    }

    // Get order logistics
    const { data: allLogistics } = await supabaseAdmin
      .from('order_logistics')
      .select('*')
      .in('order_id', orderIds);

    const logisticsByOrderId = Object.fromEntries(
      (allLogistics || []).map((l) => [l.order_id, l])
    );

    const normalized = (orders || []).map((order) => {
      const itemsForOrder = sellerOrderItems.filter((item) => item.order_id === order.id);
      const buyer = buyersById[order.user_id] || {};
      const logistics = logisticsByOrderId[order.id];

      return {
        ...order,
        items: itemsForOrder,
        buyer,
        logistics,
      };
    });

    return res.json({ orders: normalized });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Failed to fetch seller orders' });
  }
}

async function confirmPickup(req, res) {
  try {
    const orderId = Number(req.params.orderId);
    const { status } = req.body;
    const sellerId = req.user.id;

    if (!isIntegerInRange(orderId, 1, 1_000_000_000)) {
      return res.status(400).json({ error: 'Invalid order id' });
    }

    const validPickupStatuses = ['pending_pickup', 'pickup_confirmed', 'picked_up'];
    if (!status || !validPickupStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Allowed: ${validPickupStatuses.join(', ')}` });
    }

    // Check if seller is selling products in this order
    const { data: orderItems, error: itemsError } = await supabaseAdmin
      .from('order_items')
      .select('id, seller_id')
      .eq('order_id', orderId)
      .eq('seller_id', sellerId);

    if (itemsError) {
      return res.status(500).json({ error: itemsError.message });
    }

    if (!orderItems || orderItems.length === 0) {
      return res.status(403).json({ error: 'Forbidden: You are not the seller for this order' });
    }

    // Get or create logistics entry
    const { data: existingLogistics } = await supabaseAdmin
      .from('order_logistics')
      .select('*')
      .eq('order_id', orderId)
      .eq('seller_id', sellerId)
      .single();

    let updatedLogistics;

    if (existingLogistics) {
      const updates = {
        status,
        updated_at: new Date().toISOString(),
      };

      if (status === 'pickup_confirmed') {
        updates.pickup_confirmed_at = new Date().toISOString();
      } else if (status === 'picked_up') {
        updates.pickup_completed_at = new Date().toISOString();
      }

      const { data: updated, error: updateError } = await supabaseAdmin
        .from('order_logistics')
        .update(updates)
        .eq('id', existingLogistics.id)
        .select('*')
        .single();

      if (updateError) {
        return res.status(500).json({ error: updateError.message });
      }

      updatedLogistics = updated;
    } else {
      // Create new logistics entry
      const logisticsPayload = {
        order_id: orderId,
        seller_id: sellerId,
        pickup_location: '', // Will be filled from order
        pickup_time: new Date().toISOString(),
        status,
      };

      if (status === 'pickup_confirmed') {
        logisticsPayload.pickup_confirmed_at = new Date().toISOString();
      }

      const { data: created, error: createError } = await supabaseAdmin
        .from('order_logistics')
        .insert(logisticsPayload)
        .select('*')
        .single();

      if (createError) {
        return res.status(500).json({ error: createError.message });
      }

      updatedLogistics = created;
    }

    // Get order to notify buyer
    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('user_id')
      .eq('id', orderId)
      .single();

    if (order) {
      const statusMessages = {
        pickup_confirmed: 'Seller confirmed your pickup order!',
        picked_up: 'Your order has been picked up by the seller',
      };

      await createNotification({
        userId: order.user_id,
        type: 'pickup_status',
        title: `Order #${orderId} - Pickup Update`,
        message: statusMessages[status] || `Pickup status: ${status.replace(/_/g, ' ')}`,
        actionUrl: `/dashboard`,
      });
    }

    return res.json({
      success: true,
      message: `Pickup status updated to ${status}`,
      logistics: updatedLogistics,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Failed to confirm pickup' });
  }
}

async function getOrderDetails(req, res) {
  try {
    const orderId = Number(req.params.orderId);

    if (!isIntegerInRange(orderId, 1, 1_000_000_000)) {
      return res.status(400).json({ error: 'Invalid order id' });
    }

    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Check access: user can see own order or admin can see any
    if (order.user_id !== req.user.id && !req.user.is_admin) {
      return res.status(403).json({ error: 'You do not have access to this order' });
    }

    // Get order items with product details
    const { data: orderItems, error: itemsError } = await supabaseAdmin
      .from('order_items')
      .select('id, product_id, quantity, price, commission_rate, commission_amount, seller_earning')
      .eq('order_id', orderId);

    if (itemsError) {
      return res.status(500).json({ error: itemsError.message });
    }

    const productIds = [...new Set((orderItems || []).map((item) => item.product_id).filter(Boolean))];

    let productsById = {};
    if (productIds.length) {
      const { data: products, error: productsError } = await supabaseAdmin
        .from('products')
        .select('id, name, image_url, seller_id')
        .in('id', productIds);

      if (!productsError) {
        productsById = Object.fromEntries((products || []).map((product) => [product.id, product]));
      }
    }

    // Get order logistics for pickup details
    const { data: logistics, error: logisticsError } = await supabaseAdmin
      .from('order_logistics')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false });

    const normalizedItems = (orderItems || []).map((item) => ({
      ...item,
      product_name: productsById[item.product_id]?.name || `Product #${item.product_id}`,
      product_image: productsById[item.product_id]?.image_url || null,
      seller_id: productsById[item.product_id]?.seller_id || null,
    }));

    return res.json({
      order: {
        ...order,
        items: normalizedItems,
        logistics: logistics || [],
      },
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Failed to fetch order details' });
  }
}

module.exports = {
  createRazorpayOrder,
  verifyAndCreateOrder,
  getMyOrdersWithFulfillment,
  updateOrderStatus,
  getOrderDetails,
  getSellerOrders,
  confirmPickup,
};
