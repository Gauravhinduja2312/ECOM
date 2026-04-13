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

function buildListingInsertPayload(draft, userId) {
  return {
    ...draft,
    seller_id: userId,
    verification_status: 'pending',
    price_offer_status: 'none',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

async function storeProductOffer(req, res) {
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
      message: 'Product offer submitted successfully',
      product: createdProduct,
    });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Failed to submit product offer' });
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
      payload.verification_status = 'verified';
      payload.price_offer_status = 'accepted';
      payload.admin_review_note = 'Student accepted admin price offer';
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

async function acquireProductInventory(req, res) {
  try {
    const productId = Number(req.params.productId);
    const { finalPrice } = req.body;

    // Note: admin check is handled by requireAdmin middleware in the route
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

    const payload = {
      seller_id: null,
      final_price: Number(finalPrice),
      price: Number(finalPrice),
      verification_status: 'verified',
      admin_review_note: `Acquired by Campus Store. Originally paid student ₹${product.price}`,
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

async function updateHandoverDetails(req, res) {
  try {
    const productId = Number(req.params.productId);
    const { pickupTime, pickupLocation } = req.body;

    const { data: product, error: productError } = await supabaseAdmin
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (product.seller_id !== req.user.id) {
      return res.status(403).json({ error: 'Only the seller can update handover details' });
    }

    // 2-hour safety window check
    if (product.seller_pickup_time) {
      const appointmentTime = new Date(product.seller_pickup_time).getTime();
      const now = Date.now();
      const twoHoursInMs = 2 * 60 * 60 * 1000;
      
      if (appointmentTime - now < twoHoursInMs && appointmentTime > now) {
        return res.status(400).json({ error: 'Cannot modify handover schedule less than 2 hours before the appointment' });
      }
    }

    const payload = {
      updated_at: new Date().toISOString(),
      handover_status: 'rescheduled'
    };

    if (pickupTime) payload.seller_pickup_time = new Date(pickupTime).toISOString();
    if (pickupLocation) payload.seller_pickup_location = pickupLocation;

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
    return res.status(500).json({ error: error.message || 'Failed to update handover' });
  }
}

module.exports = {
  storeProductOffer,
  respondToPriceOffer,
  acquireProductInventory,
  updateHandoverDetails,
};
