const crypto = require('node:crypto');
const { supabaseAdmin } = require('../services/supabaseAdmin');
const { razorpay } = require('../services/razorpayClient');
const {
  isNonEmptyStringWithMaxLength,
  isIntegerInRange,
  isPositiveNumber,
} = require('../utils/validation');

function normalizeListingDraft(rawDraft) {
  if (!rawDraft || typeof rawDraft !== 'object') {
    throw new Error('Invalid listing payload');
  }

  const name = String(rawDraft.name || '').trim();
  const description = String(rawDraft.description || '').trim();
  const category = String(rawDraft.category || '').trim();
  const imageUrl = String(rawDraft.image_url || '').trim();
  const price = Number(rawDraft.price);
  const stock = Number(rawDraft.stock);
  const isSponsored = Boolean(rawDraft.is_sponsored);

  if (!isNonEmptyStringWithMaxLength(name, 120)) {
    throw new Error('Product name is required (max 120 chars)');
  }

  if (!isNonEmptyStringWithMaxLength(description, 1000)) {
    throw new Error('Description is required (max 1000 chars)');
  }

  if (!isNonEmptyStringWithMaxLength(category, 80)) {
    throw new Error('Category is required (max 80 chars)');
  }

  if (imageUrl && !isNonEmptyStringWithMaxLength(imageUrl, 1000)) {
    throw new Error('Invalid image URL');
  }

  if (!isPositiveNumber(price) || price > 100000) {
    throw new Error('Invalid price amount');
  }

  if (!isIntegerInRange(stock, 1, 10000)) {
    throw new Error('Stock must be between 1 and 10000');
  }

  return {
    name,
    description,
    category,
    image_url: imageUrl,
    price,
    stock,
    is_sponsored: isSponsored,
  };
}

async function createProductOffer(req, res) {
  try {
    const draft = normalizeListingDraft(req.body?.listingDraft);
    const productPayload = buildListingInsertPayload(draft, req.user.id);

    const { data: createdProduct, error: productInsertError } = await supabaseAdmin
      .from('products')
      .insert(productPayload)
      .select('id, name, verification_status, created_at')
      .single();

    if (productInsertError) {
      return res.status(500).json({ error: productInsertError.message });
    }

    return res.json({
      success: true,
      product: createdProduct,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Failed to submit product offer' });
  }
}

async function respondToPriceOffer(req, res) {
  try {
    const productId = Number(req.params.productId);
    const { decision } = req.body;

    if (!productId || Number.isNaN(productId)) {
      return res.status(400).json({ error: 'Invalid product id' });
    }

    if (!['accept', 'reject'].includes(decision)) {
      return res.status(400).json({ error: 'Decision must be accept or reject' });
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

    if (product.seller_id !== req.user.id) {
      return res.status(403).json({ error: 'Only the seller can respond to this offer' });
    }

    if (product.price_offer_status !== 'pending_student_response' || product.proposed_price === null) {
      return res.status(400).json({ error: 'No pending price offer for this product' });
    }

    const payload = {
      updated_at: new Date().toISOString(),
    };

    if (decision === 'accept') {
      payload.price = Number(product.proposed_price);
      payload.final_price = Number(product.proposed_price);
      payload.verification_status = 'pending'; // Stays pending until Admin physically acquires it
      payload.price_offer_status = 'accepted';
      payload.admin_review_note = 'Student accepted admin price offer. Awaiting payment and acquisition.';
      payload.proposed_price = null;
    }

    if (decision === 'reject') {
      payload.verification_status = 'rejected';
      payload.price_offer_status = 'rejected';
      payload.admin_review_note = 'Student rejected admin price offer';
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
    return res.status(500).json({ error: error.message || 'Failed to respond to offer' });
  }
}

async function getRecommendedProducts(req, res) {
  try {
    const productId = Number(req.params.productId);

    if (!isIntegerInRange(productId, 1, 1_000_000_000)) {
      return res.status(400).json({ error: 'Invalid product id' });
    }

    // Get current product details
    const { data: currentProduct, error: productError } = await supabaseAdmin
      .from('products')
      .select('id, category, seller_id')
      .eq('id', productId)
      .single();

    if (productError || !currentProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Strategy 1: Same category products (excluding self)
    const { data: categoryProducts, error: categoryError } = await supabaseAdmin
      .from('products')
      .select('id, name, price, image_url, stock, is_sponsored, sponsored_until')
      .eq('category', currentProduct.category)
      .eq('verification_status', 'verified')
      .neq('id', productId)
      .neq('seller_id', currentProduct.seller_id)
      .limit(6)
      .order('created_at', { ascending: false });

    if (categoryError) {
      return res.status(500).json({ error: categoryError.message });
    }

    // Strategy 2: Trending products (most reviewed)
    const { data: trendingProducts, error: trendingError } = await supabaseAdmin
      .from('products')
      .select('id, name, price, image_url, stock, is_sponsored, sponsored_until')
      .eq('verification_status', 'verified')
      .neq('id', productId)
      .limit(4)
      .order('created_at', { ascending: false });

    if (trendingError) {
      return res.status(500).json({ error: trendingError.message });
    }

    // Get reviews for recommended products to compute ratings
    const allRecommendedIds = [
      ...new Set([
        ...(categoryProducts || []).map((p) => p.id),
        ...(trendingProducts || []).map((p) => p.id),
      ]),
    ];

    let reviewsByProductId = {};
    if (allRecommendedIds.length > 0) {
      const { data: reviews } = await supabaseAdmin
        .from('product_reviews')
        .select('product_id, rating')
        .in('product_id', allRecommendedIds);

      if (reviews) {
        allRecommendedIds.forEach((pid) => {
          const productReviews = reviews.filter((r) => r.product_id === pid);
          const totalReviews = productReviews.length;
          const avgRating = totalReviews
            ? Number((productReviews.reduce((sum, r) => sum + Number(r.rating || 0), 0) / totalReviews).toFixed(1))
            : 0;
          reviewsByProductId[pid] = { totalReviews, avgRating };
        });
      }
    }

    const normalizeProduct = (product) => ({
      ...product,
      reviews: reviewsByProductId[product.id] || { totalReviews: 0, avgRating: 0 },
    });

    return res.json({
      sameCategory: (categoryProducts || []).map(normalizeProduct),
      trending: (trendingProducts || []).map(normalizeProduct),
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Failed to fetch recommendations' });
  }
}

async function getLowStockProducts(req, res) {
  try {
    const { data: lowStockProducts, error } = await supabaseAdmin
      .from('products')
      .select('id, name, stock, category, seller_id')
      .eq('verification_status', 'verified')
      .gt('stock', 0)
      .lt('stock', 3)
      .order('stock', { ascending: true });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const products = lowStockProducts || [];

    // Get seller info
    const sellerIds = [...new Set(products.map((p) => p.seller_id).filter(Boolean))];
    let sellersById = {};
    if (sellerIds.length) {
      const { data: sellers } = await supabaseAdmin
        .from('users')
        .select('id, email')
        .in('id', sellerIds);

      if (sellers) {
        sellersById = Object.fromEntries(sellers.map((s) => [s.id, s]));
      }
    }

    const normalized = products.map((p) => ({
      ...p,
      seller_email: sellersById[p.seller_id]?.email || null,
    }));

    return res.json({ lowStockProducts: normalized });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Failed to fetch low stock products' });
  }
}

async function acquireProductInventory(req, res) {
  try {
    const productId = Number(req.params.productId);
    const { finalPrice } = req.body;

    if (!req.user || !req.user.is_admin) {
      return res.status(403).json({ error: 'Only admins can acquire inventory' });
    }

    if (!isPositiveNumber(finalPrice) || finalPrice > 100000) {
      return res.status(400).json({ error: 'Invalid final retail price' });
    }

    const { data: product, error: productError } = await supabaseAdmin
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (product.price_offer_status !== 'accepted') {
      return res.status(400).json({ error: 'Student has not accepted a price offer yet' });
    }

    const retailPrice = Number(finalPrice) || (Number(product.price) * 1.1).toFixed(2);

    const payload = {
      seller_id: null, // Ownership transfers to platform!
      final_price: Number(retailPrice),
      price: Number(retailPrice), // Ensure the displayed price is the new retail price
      verification_status: 'verified', // Finally live
      admin_review_note: `Acquired by Campus Store. Paid student ₹${product.proposed_price || product.price}. Ref: ${req.body.payoutReference || 'N/A'}`,
      updated_at: new Date().toISOString(),
    };

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
      message: 'Product acquired and live on storefront',
      product: updatedProduct,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Failed to acquire product' });
  }
}

module.exports = {
  createProductOffer,
  respondToPriceOffer,
  getRecommendedProducts,
  getLowStockProducts,
  acquireProductInventory,
};
