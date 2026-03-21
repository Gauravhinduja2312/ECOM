const { supabaseAdmin } = require('../services/supabaseAdmin');

async function getAnalytics(req, res) {
  try {
    const { data: orders, error: ordersError } = await supabaseAdmin
      .from('orders')
      .select('id, user_id, total_price, status, created_at');

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

    const totalRevenue = orders
      .filter((o) => o.status === 'paid' || o.status === 'shipped' || o.status === 'delivered')
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

    const totalSellerPayout = (orderItems || []).reduce(
      (sum, item) => sum + Number(item.seller_earning || 0),
      0
    );

    return res.json({
      totalRevenue,
      totalCommission,
      totalSellerPayout,
      totalOrders: orders.length,
      totalUsers: users.length,
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
      .select('id, name, description, price, category, stock, seller_id, verification_status, admin_review_note, proposed_price, price_offer_status, final_price, commission_rate, created_at, updated_at')
      .not('seller_id', 'is', null)
      .order('verification_status', { ascending: false })
      .order('created_at', { ascending: false });

    if (productsError) {
      return res.status(500).json({ error: productsError.message });
    }

    const sellerIds = [...new Set((products || []).map((product) => product.seller_id).filter(Boolean))];

    let sellerEmailById = {};
    if (sellerIds.length) {
      const { data: sellers, error: sellersError } = await supabaseAdmin
        .from('users')
        .select('id, email')
        .in('id', sellerIds);

      if (sellersError) {
        return res.status(500).json({ error: sellersError.message });
      }

      sellerEmailById = Object.fromEntries((sellers || []).map((seller) => [seller.id, seller.email]));
    }

    const submissions = (products || []).map((product) => ({
      ...product,
      seller_email: sellerEmailById[product.seller_id] || null,
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

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const payload = {
      updated_at: new Date().toISOString(),
    };

    if (commissionRate !== undefined && commissionRate !== null && commissionRate !== '') {
      const rate = Number(commissionRate);
      if (Number.isNaN(rate) || rate < 0 || rate > 100) {
        return res.status(400).json({ error: 'Commission rate must be between 0 and 100' });
      }
      payload.commission_rate = rate;
    }

    if (action === 'counter') {
      const offeredPrice = Number(proposedPrice);
      if (Number.isNaN(offeredPrice) || offeredPrice <= 0) {
        return res.status(400).json({ error: 'Counter price must be a positive number' });
      }

      payload.proposed_price = offeredPrice;
      payload.price_offer_status = 'pending_student_response';
      payload.verification_status = 'pending';
      payload.admin_review_note = note || 'Admin sent a counter offer';
    }

    if (action === 'verify') {
      const approvedPrice = proposedPrice !== undefined && proposedPrice !== null && proposedPrice !== ''
        ? Number(proposedPrice)
        : Number(product.proposed_price || product.price);

      if (Number.isNaN(approvedPrice) || approvedPrice <= 0) {
        return res.status(400).json({ error: 'Approved price must be a positive number' });
      }

      payload.price = approvedPrice;
      payload.final_price = approvedPrice;
      payload.verification_status = 'verified';
      payload.price_offer_status = product.proposed_price ? 'accepted' : 'none';
      payload.proposed_price = null;
      payload.admin_review_note = note || 'Product verified by admin';
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

    return res.json({
      success: true,
      product: updatedProduct,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Failed to review submission' });
  }
}

async function getSellerPayouts(req, res) {
  try {
    const { data: orderItems, error: orderItemsError } = await supabaseAdmin
      .from('order_items')
      .select('id, order_id, product_id, seller_earning, payout_status, payout_paid_at, payout_reference, order:orders(id, status, created_at), product:products(id, name, seller_id)')
      .gt('seller_earning', 0);

    if (orderItemsError) {
      return res.status(500).json({ error: orderItemsError.message });
    }

    const sellerIds = [...new Set((orderItems || [])
      .map((item) => item.product?.seller_id)
      .filter(Boolean))];

    let sellerEmailById = {};
    if (sellerIds.length) {
      const { data: sellers, error: sellersError } = await supabaseAdmin
        .from('users')
        .select('id, email')
        .in('id', sellerIds);

      if (sellersError) {
        return res.status(500).json({ error: sellersError.message });
      }

      sellerEmailById = Object.fromEntries((sellers || []).map((seller) => [seller.id, seller.email]));
    }

    const payoutMap = {};

    (orderItems || []).forEach((item) => {
      const sellerId = item.product?.seller_id;
      if (!sellerId) {
        return;
      }

      if (!payoutMap[sellerId]) {
        payoutMap[sellerId] = {
          seller_id: sellerId,
          seller_email: sellerEmailById[sellerId] || null,
          total_earning: 0,
          total_paid: 0,
          total_unpaid: 0,
          unpaid_count: 0,
          paid_count: 0,
          items: [],
        };
      }

      const earning = Number(item.seller_earning || 0);
      const status = item.payout_status || 'unpaid';

      payoutMap[sellerId].total_earning += earning;

      if (status === 'paid') {
        payoutMap[sellerId].total_paid += earning;
        payoutMap[sellerId].paid_count += 1;
      } else {
        payoutMap[sellerId].total_unpaid += earning;
        payoutMap[sellerId].unpaid_count += 1;
      }

      payoutMap[sellerId].items.push({
        order_item_id: item.id,
        order_id: item.order_id,
        product_id: item.product_id,
        product_name: item.product?.name || `Product #${item.product_id}`,
        order_status: item.order?.status || null,
        order_created_at: item.order?.created_at || null,
        seller_earning: earning,
        payout_status: status,
        payout_paid_at: item.payout_paid_at || null,
        payout_reference: item.payout_reference || null,
      });
    });

    const payouts = Object.values(payoutMap)
      .map((row) => ({
        ...row,
        total_earning: Number(row.total_earning.toFixed(2)),
        total_paid: Number(row.total_paid.toFixed(2)),
        total_unpaid: Number(row.total_unpaid.toFixed(2)),
      }))
      .sort((a, b) => b.total_unpaid - a.total_unpaid);

    return res.json({ payouts });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Failed to fetch seller payouts' });
  }
}

async function markSellerPayoutsPaid(req, res) {
  try {
    const sellerId = String(req.params.sellerId || '').trim();
    const { orderItemIds, payoutReference } = req.body;

    if (!sellerId) {
      return res.status(400).json({ error: 'Seller id is required' });
    }

    if (!Array.isArray(orderItemIds) || orderItemIds.length === 0) {
      return res.status(400).json({ error: 'orderItemIds must be a non-empty array' });
    }

    const normalizedOrderItemIds = [...new Set(orderItemIds.map((value) => Number(value)).filter((value) => Number.isInteger(value) && value > 0))];

    if (!normalizedOrderItemIds.length) {
      return res.status(400).json({ error: 'No valid order item ids provided' });
    }

    const { data: selectedItems, error: selectedError } = await supabaseAdmin
      .from('order_items')
      .select('id, payout_status, product:products(seller_id)')
      .in('id', normalizedOrderItemIds);

    if (selectedError) {
      return res.status(500).json({ error: selectedError.message });
    }

    if (!selectedItems || !selectedItems.length) {
      return res.status(404).json({ error: 'No matching order items found' });
    }

    const validItemIds = selectedItems
      .filter((item) => item.product?.seller_id === sellerId && (item.payout_status || 'unpaid') !== 'paid')
      .map((item) => item.id);

    if (!validItemIds.length) {
      return res.status(400).json({ error: 'No unpaid items found for this seller' });
    }

    const payload = {
      payout_status: 'paid',
      payout_paid_at: new Date().toISOString(),
      payout_reference: payoutReference || null,
    };

    const { error: updateError } = await supabaseAdmin
      .from('order_items')
      .update(payload)
      .in('id', validItemIds);

    if (updateError) {
      return res.status(500).json({ error: updateError.message });
    }

    return res.json({
      success: true,
      updatedCount: validItemIds.length,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Failed to mark payout as paid' });
  }
}

module.exports = {
  getAnalytics,
  getProductSubmissions,
  reviewProductSubmission,
  getSellerPayouts,
  markSellerPayoutsPaid,
};
