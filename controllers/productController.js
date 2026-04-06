const crypto = require('node:crypto');
const { supabaseAdmin } = require('../services/supabaseAdmin');
const { razorpay } = require('../services/razorpayClient');
const {
  isNonEmptyStringWithMaxLength,
  isIntegerInRange,
  isPositiveNumber,
} = require('../utils/validation');

const LISTING_FEE_AMOUNT = Number(process.env.LISTING_FEE_AMOUNT || 10);
const SPONSORED_FEE_AMOUNT = Number(process.env.SPONSORED_FEE_AMOUNT || 49);

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

async function computeListingFeeBreakup(userId, isSponsored) {
  const { count, error } = await supabaseAdmin
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('seller_id', userId);

  if (error) {
    throw new Error(error.message || 'Failed to compute listing fee');
  }

  const existingListings = Number(count || 0);
  const listingFee = existingListings >= 1 ? LISTING_FEE_AMOUNT : 0;
  const sponsoredFee = isSponsored ? SPONSORED_FEE_AMOUNT : 0;
  const totalFee = Number((listingFee + sponsoredFee).toFixed(2));

  return {
    listingFee,
    sponsoredFee,
    totalFee,
    existingListings,
  };
}

function buildListingInsertPayload(draft, userId) {
  return {
    name: draft.name,
    description: draft.description,
    price: draft.price,
    category: draft.category,
    image_url: draft.image_url,
    stock: draft.stock,
    is_sponsored: draft.is_sponsored,
    seller_id: userId,
    verification_status: 'pending',
    price_offer_status: 'none',
    proposed_price: null,
    final_price: draft.price,
  };
}

async function prepareListingFeePayment(req, res) {
  try {
    const draft = normalizeListingDraft(req.body?.listingDraft);
    const feeBreakup = await computeListingFeeBreakup(req.user.id, draft.is_sponsored);

    if (feeBreakup.totalFee <= 0) {
      return res.json({
        requiresPayment: false,
        feeBreakup,
      });
    }

    const paymentOrder = await razorpay.orders.create({
      amount: Math.round(feeBreakup.totalFee * 100),
      currency: 'INR',
      receipt: `listing_fee_${String(req.user.id).slice(0, 8)}_${Date.now()}`,
      notes: {
        user_id: String(req.user.id),
        listing_fee: String(feeBreakup.listingFee),
        sponsored_fee: String(feeBreakup.sponsoredFee),
      },
    });

    return res.json({
      requiresPayment: true,
      feeBreakup,
      order: paymentOrder,
    });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Failed to prepare listing payment' });
  }
}

async function verifyListingFeeAndCreate(req, res) {
  try {
    const draft = normalizeListingDraft(req.body?.listingDraft);
    const feeBreakup = await computeListingFeeBreakup(req.user.id, draft.is_sponsored);

    const totalFee = Number(feeBreakup.totalFee || 0);

    let paymentRecordPayload = {
      user_id: req.user.id,
      listing_fee: feeBreakup.listingFee,
      sponsored_fee: feeBreakup.sponsoredFee,
      total_fee: totalFee,
      payment_status: totalFee > 0 ? 'pending' : 'waived',
      razorpay_order_id: null,
      razorpay_payment_id: null,
      razorpay_signature: null,
      product_id: null,
    };

    if (totalFee > 0) {
      const razorpayOrderId = String(req.body?.razorpay_order_id || '').trim();
      const razorpayPaymentId = String(req.body?.razorpay_payment_id || '').trim();
      const razorpaySignature = String(req.body?.razorpay_signature || '').trim();

      if (
        !isNonEmptyStringWithMaxLength(razorpayOrderId, 128)
        || !isNonEmptyStringWithMaxLength(razorpayPaymentId, 128)
        || !isNonEmptyStringWithMaxLength(razorpaySignature, 256)
      ) {
        return res.status(400).json({ error: 'Missing or invalid payment verification fields' });
      }

      const payload = `${razorpayOrderId}|${razorpayPaymentId}`;
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(payload)
        .digest('hex');

      if (expectedSignature !== razorpaySignature) {
        return res.status(400).json({ error: 'Payment signature verification failed' });
      }

      const { data: existingPayment } = await supabaseAdmin
        .from('listing_fee_payments')
        .select('id')
        .eq('razorpay_payment_id', razorpayPaymentId)
        .maybeSingle();

      if (existingPayment) {
        return res.status(400).json({ error: 'Payment already used for a listing' });
      }

      const paymentDetails = await razorpay.payments.fetch(razorpayPaymentId);
      const expectedAmountInPaise = Math.round(totalFee * 100);

      if (Number(paymentDetails?.amount || 0) !== expectedAmountInPaise) {
        return res.status(400).json({ error: 'Payment amount does not match required listing fee' });
      }

      if (String(paymentDetails?.order_id || '') !== razorpayOrderId) {
        return res.status(400).json({ error: 'Payment order mismatch detected' });
      }

      paymentRecordPayload = {
        ...paymentRecordPayload,
        payment_status: 'paid',
        razorpay_order_id: razorpayOrderId,
        razorpay_payment_id: razorpayPaymentId,
        razorpay_signature: razorpaySignature,
      };
    }

    const { data: paymentRecord, error: paymentInsertError } = await supabaseAdmin
      .from('listing_fee_payments')
      .insert(paymentRecordPayload)
      .select('id')
      .single();

    if (paymentInsertError) {
      return res.status(500).json({ error: paymentInsertError.message });
    }

    const productPayload = buildListingInsertPayload(draft, req.user.id);

    const { data: createdProduct, error: productInsertError } = await supabaseAdmin
      .from('products')
      .insert(productPayload)
      .select('id, name, listing_number, listing_fee, is_sponsored, sponsored_fee, sponsored_until, verification_status, created_at')
      .single();

    if (productInsertError) {
      return res.status(500).json({ error: productInsertError.message });
    }

    await supabaseAdmin
      .from('listing_fee_payments')
      .update({ product_id: createdProduct.id })
      .eq('id', paymentRecord.id);

    return res.json({
      success: true,
      product: createdProduct,
      feeBreakup,
      paymentStatus: paymentRecordPayload.payment_status,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Failed to verify fee and create listing' });
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

module.exports = {
  prepareListingFeePayment,
  verifyListingFeeAndCreate,
  respondToPriceOffer,
  acquireProductInventory,
};
