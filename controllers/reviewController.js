const { supabaseAdmin } = require('../services/supabaseAdmin');
const {
  isIntegerInRange,
  isNonEmptyStringWithMaxLength,
} = require('../utils/validation');

async function getProductReviews(req, res) {
  try {
    const productId = Number(req.params.productId);

    if (!isIntegerInRange(productId, 1, 1_000_000_000)) {
      return res.status(400).json({ error: 'Invalid product id' });
    }

    const { data: reviews, error } = await supabaseAdmin
      .from('product_reviews')
      .select('id, order_id, product_id, user_id, rating, review, created_at, user:users(email, full_name)')
      .eq('product_id', productId)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const normalizedReviews = (reviews || []).map((row) => ({
      id: row.id,
      order_id: row.order_id,
      product_id: row.product_id,
      user_id: row.user_id,
      rating: row.rating,
      review: row.review,
      created_at: row.created_at,
      user_name: row.user?.full_name || row.user?.email || 'Student Buyer',
    }));

    const totalReviews = normalizedReviews.length;
    const averageRating = totalReviews
      ? Number((normalizedReviews.reduce((sum, row) => sum + Number(row.rating || 0), 0) / totalReviews).toFixed(1))
      : 0;

    return res.json({
      reviews: normalizedReviews,
      summary: {
        totalReviews,
        averageRating,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Failed to fetch reviews' });
  }
}

async function createReview(req, res) {
  try {
    const userId = req.user.id;
    const { orderId, productId, rating, review } = req.body;

    const normalizedOrderId = Number(orderId);
    const normalizedProductId = Number(productId);
    const normalizedRating = Number(rating);
    const normalizedReview = review === undefined || review === null ? '' : String(review).trim();

    if (!isIntegerInRange(normalizedOrderId, 1, 1_000_000_000)) {
      return res.status(400).json({ error: 'Invalid order id' });
    }

    if (!isIntegerInRange(normalizedProductId, 1, 1_000_000_000)) {
      return res.status(400).json({ error: 'Invalid product id' });
    }

    if (!isIntegerInRange(normalizedRating, 1, 5)) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    if (normalizedReview && !isNonEmptyStringWithMaxLength(normalizedReview, 500)) {
      return res.status(400).json({ error: 'Review must be up to 500 characters' });
    }

    const { data: orderRow, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('id, user_id, status')
      .eq('id', normalizedOrderId)
      .maybeSingle();

    if (orderError) {
      return res.status(500).json({ error: orderError.message });
    }

    if (!orderRow || String(orderRow.user_id) !== String(userId)) {
      return res.status(403).json({ error: 'You can only review your own completed orders' });
    }

    const normalizedOrderStatus = String(orderRow.status || '').toLowerCase();
    const allowedReviewStatuses = new Set([
      'order_placed',
      'processing',
      'ready_for_pickup',
      'shipped',
      'completed',
      'paid',
      'delivered',
      'pending',
    ]);

    if (!allowedReviewStatuses.has(normalizedOrderStatus)) {
      return res.status(400).json({ error: 'Reviews are allowed only after successful purchase' });
    }

    const { data: orderItem, error: itemError } = await supabaseAdmin
      .from('order_items')
      .select('id')
      .eq('order_id', normalizedOrderId)
      .eq('product_id', normalizedProductId)
      .maybeSingle();

    if (itemError) {
      return res.status(500).json({ error: itemError.message });
    }

    if (!orderItem) {
      return res.status(400).json({ error: 'This product is not part of the selected order' });
    }

    const payload = {
      order_id: normalizedOrderId,
      product_id: normalizedProductId,
      user_id: userId,
      rating: normalizedRating,
      review: normalizedReview || null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin
      .from('product_reviews')
      .upsert(payload, { onConflict: 'order_id,product_id,user_id' })
      .select('id, order_id, product_id, rating, review, created_at, updated_at')
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ success: true, review: data });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Failed to submit review' });
  }
}

module.exports = {
  getProductReviews,
  createReview,
};
