const { supabaseAdmin } = require('../services/supabaseAdmin');
const { createNotification } = require('../services/notificationService');
const {
  isNonEmptyStringWithMaxLength,
  isArrayLengthInRange,
  isUuid,
} = require('../utils/validation');

async function getAnalytics(req, res) {
  try {
    const { data: orders, error: ordersError } = await supabaseAdmin
      .from('orders')
      .select('id, user_id, total_price, status, created_at, delivery_fee');

    if (ordersError) {
      return res.status(500).json({ error: ordersError.message });
    }

    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id, email, role');

    if (usersError) {
      return res.status(500).json({ error: usersError.message });
    }

    const { data: orderItems, error: orderItemsError } = await supabaseAdmin
      .from('order_items')
      .select('commission_amount, seller_earning');

    if (orderItemsError) {
      return res.status(500).json({ error: orderItemsError.message });
    }

    const { data: products, error: productsError } = await supabaseAdmin
      .from('products')
      .select('seller_id, listing_fee, is_sponsored, sponsored_fee, stock');

    if (productsError) {
      return res.status(500).json({ error: productsError.message });
    }

    const totalRevenue = orders
      .filter((o) => ['order_placed', 'processing', 'ready_for_pickup', 'shipped', 'completed'].includes(o.status))
      .reduce((sum, o) => sum + Number(o.total_price), 0);

    const dailySalesMap = {};
    const monthlySalesMap = {};

    orders.forEach((order) => {
      const createdAt = new Date(order.created_at);
      const dayKey = createdAt.toISOString().split('T')[0];
      const monthKey = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, '0')}`;
      dailySalesMap[dayKey] = (dailySalesMap[dayKey] || 0) + Number(order.total_price);
      monthlySalesMap[monthKey] = (monthlySalesMap[monthKey] || 0) + Number(order.total_price);
    });

    const userSpendingMap = {};
    orders.forEach((order) => {
      userSpendingMap[order.user_id] = (userSpendingMap[order.user_id] || 0) + Number(order.total_price);
    });

    const crmUsers = users.map((user) => ({
      ...user,
      total_spending: userSpendingMap[user.id] || 0,
      orders_count: orders.filter((o) => o.user_id === user.id).length,
    }));

    const totalCommission = (orderItems || []).reduce(
      (sum, item) => sum + Number(item.commission_amount || 0),
      0
    );

    const totalLogisticsRevenue = orders
      .filter((o) => ['order_placed', 'processing', 'ready_for_pickup', 'shipped', 'completed'].includes(o.status))
      .reduce((sum, o) => sum + Number(o.delivery_fee || 0), 0);

    const totalSellerPayout = (orderItems || []).reduce(
      (sum, item) => sum + Number(item.seller_earning || 0),
      0
    );

    const totalListingFees = (products || [])
      .filter((product) => Boolean(product.seller_id))
      .reduce((sum, product) => sum + Number(product.listing_fee || 0), 0);

    const totalSponsoredFees = (products || [])
      .filter((product) => Boolean(product.seller_id) && Boolean(product.is_sponsored))
      .reduce((sum, product) => sum + Number(product.sponsored_fee || 0), 0);

    const lowStockCount = (products || []).filter((product) => Number(product.stock || 0) > 0 && Number(product.stock || 0) < 3).length;

    return res.json({
      totalRevenue,
      totalCommission,
      totalSellerPayout,
      totalListingFees,
      totalSponsoredFees,
      totalLogisticsRevenue,
      totalOrders: orders.length,
      totalUsers: users.length,
      lowStockCount,
      dailySales: dailySalesMap,
      monthlySales: monthlySalesMap,
      crmUsers,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Failed to fetch analytics' });
  }
}

async function getProductSubmissions(req, res) {
  try {
    const { data: products, error: productsError } = await supabaseAdmin
      .from('products')
      .select('id, name, description, price, category, stock, seller_id, verification_status, admin_review_note, proposed_price, price_offer_status, final_price, commission_rate, listing_number, listing_fee, is_sponsored, sponsored_fee, sponsored_until, handover_status, created_at, updated_at')
      .not('seller_id', 'is', null)
      .order('verification_status', { ascending: false })
      .order('created_at', { ascending: false });

    if (productsError) {
      return res.status(500).json({ error: productsError.message });
    }

    const sellerIds = [...new Set((products || []).map((product) => product.seller_id).filter(Boolean))];

    let sellerMetaById = {};
    if (sellerIds.length) {
      const { data: sellers, error: sellersError } = await supabaseAdmin
        .from('users')
        .select('id, email, upi_id, upi_qr_url')
        .in('id', sellerIds);

      if (sellersError) {
        return res.status(500).json({ error: sellersError.message });
      }

      sellerMetaById = Object.fromEntries((sellers || []).map((seller) => [seller.id, seller]));
    }

    const submissions = (products || []).map((product) => ({
      ...product,
      seller_email: sellerMetaById[product.seller_id]?.email || null,
      seller_upi_id: sellerMetaById[product.seller_id]?.upi_id || null,
    }));

    return res.json({ submissions });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Failed to fetch submissions' });
  }
}

async function reviewProductSubmission(req, res) {
  try {
    const productId = Number(req.params.productId);
    const { action, proposedPrice, commissionRate, note } = req.body;

    if (!productId || Number.isNaN(productId)) {
      return res.status(400).json({ error: 'Invalid product id' });
    }

    if (!['verify', 'reject', 'counter'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action' });
    }

    const { data: product, error: productError } = await supabaseAdmin
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();

    if (productError) {
      return res.status(500).json({ error: productError.message });
    }

    const payload = {
      updated_at: new Date().toISOString(),
    };

    if (action === 'counter') {
      const offeredPrice = Number(proposedPrice);
      payload.proposed_price = offeredPrice;
      payload.price_offer_status = 'pending_student_response';
      payload.verification_status = 'pending';
      payload.admin_review_note = note || 'Admin sent a counter offer';
    }

    if (action === 'verify') {
      const approvedPrice = proposedPrice ? Number(proposedPrice) : Number(product.proposed_price || product.price);
      payload.price = approvedPrice;
      payload.final_price = approvedPrice;
      payload.verification_status = 'verified';
      payload.price_offer_status = product.proposed_price ? 'accepted' : 'none';
      payload.proposed_price = null;
      payload.admin_review_note = note || 'Product verified by admin';
      payload.handover_code = Math.random().toString(36).substring(2, 8).toUpperCase();
    }

    if (action === 'reject') {
      payload.verification_status = 'rejected';
      payload.price_offer_status = 'rejected';
      payload.admin_review_note = note || 'Product rejected by admin';
    }

    const { data: updatedProduct, error: updateError } = await supabaseAdmin
      .from('products')
      .update(payload)
      .eq('id', productId)
      .select('*')
      .single();

    if (updateError) {
      return res.status(500).json({ error: updateError.message });
    }

    return res.json({ success: true, product: updatedProduct });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Failed to review submission' });
  }
}

async function verifyHandoverCode(req, res) {
  try {
    const { productId, code } = req.body;
    const { data: product, error } = await supabaseAdmin
      .from('products')
      .select('handover_code')
      .eq('id', productId)
      .single();

    if (error || !product) return res.status(404).json({ error: 'Product not found' });
    if (product.handover_code !== code.toUpperCase()) return res.status(400).json({ error: 'Invalid code' });

    await supabaseAdmin
      .from('products')
      .update({ handover_status: 'confirmed', admin_review_note: 'Verified handover.' })
      .eq('id', productId);

    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function processReturn(req, res) {
  try {
    const { returnId, action, note } = req.body;
    const { data: returnData, error: fetchError } = await supabaseAdmin
      .from('returns')
      .select('*, order_item:order_items(product_id, quantity)')
      .eq('id', returnId)
      .single();

    if (fetchError || !returnData) return res.status(404).json({ error: 'Not found' });

    await supabaseAdmin
      .from('returns')
      .update({ status: action, admin_note: note, updated_at: new Date().toISOString() })
      .eq('id', returnId);

    if (action === 'refunded') {
      const productId = returnData.order_item.product_id;
      const { data: product } = await supabaseAdmin.from('products').select('stock').eq('id', productId).single();
      if (product) {
        await supabaseAdmin.from('products').update({ stock: product.stock + returnData.order_item.quantity }).eq('id', productId);
      }
    }

    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function getSellerPayouts(req, res) {
  try {
    const { data: orderItems, error: orderItemsError } = await supabaseAdmin
      .from('order_items')
      .select('id, order_id, product_id, seller_earning, payout_status, payout_paid_at, payout_reference, order:orders(id, status, created_at), product:products(id, name, seller_id)')
      .gt('seller_earning', 0);

    if (orderItemsError) return res.status(500).json({ error: orderItemsError.message });

    const payoutMap = {};
    (orderItems || []).forEach((item) => {
      const sellerId = item.product?.seller_id;
      if (!sellerId) return;
      if (!payoutMap[sellerId]) {
        payoutMap[sellerId] = { seller_id: sellerId, total_earning: 0, items: [] };
      }
      payoutMap[sellerId].total_earning += Number(item.seller_earning || 0);
      payoutMap[sellerId].items.push(item);
    });

    return res.json({ payouts: Object.values(payoutMap) });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function markSellerPayoutsPaid(req, res) {
  try {
    const { orderItemIds, payoutReference } = req.body;
    await supabaseAdmin
      .from('order_items')
      .update({ payout_status: 'paid', payout_paid_at: new Date().toISOString(), payout_reference: payoutReference })
      .in('id', orderItemIds);
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function updateOrderStatus(req, res) {
  try {
    const orderId = Number(req.params.orderId);
    const { status } = req.body;
    await supabaseAdmin
      .from('orders')
      .update({ status, status_updated_at: new Date().toISOString() })
      .eq('id', orderId);
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function getOrders(req, res) {
  try {
    const { data: orders } = await supabaseAdmin.from('orders').select('*').order('created_at', { ascending: false });
    const { data: items } = await supabaseAdmin.from('order_items').select('*, product:products(name)');
    const itemsByOrderId = {};
    (items || []).forEach(item => {
      if (!itemsByOrderId[item.order_id]) itemsByOrderId[item.order_id] = [];
      itemsByOrderId[item.order_id].push(item);
    });
    return res.json({ orders, orderItems: itemsByOrderId });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

module.exports = {
  getAnalytics,
  getProductSubmissions,
  reviewProductSubmission,
  getSellerPayouts,
  markSellerPayoutsPaid,
  updateOrderStatus,
  getOrders,
  verifyHandoverCode,
  processReturn,
};
