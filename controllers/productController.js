const { supabaseAdmin } = require('../services/supabaseAdmin');

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

module.exports = {
  respondToPriceOffer,
};
