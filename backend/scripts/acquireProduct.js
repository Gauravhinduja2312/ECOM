require('dotenv').config({ path: '../.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function acquireProduct(productId, finalPrice) {
  console.log(`Acquiring product ${productId} at retail price ₹${finalPrice}...`);

  const { data: product, error: fetchError } = await supabase
    .from('products')
    .select('*')
    .eq('id', productId)
    .single();

  if (fetchError || !product) {
    console.error("Product not found:", fetchError?.message);
    return;
  }

  console.log("Found product:", product.name, "| Current price_offer_status:", product.price_offer_status);

  const { data: updated, error: updateError } = await supabase
    .from('products')
    .update({
      seller_id: null,
      final_price: finalPrice,
      price: finalPrice,
      verification_status: 'verified',
      admin_review_note: `Acquired by Campus Store. Originally paid student ₹${product.price}`,
      updated_at: new Date().toISOString(),
    })
    .eq('id', productId)
    .select('*')
    .single();

  if (updateError) {
    console.error("Update failed:", updateError.message);
    return;
  }

  console.log("SUCCESS! Product is now LIVE on storefront:");
  console.log("  Name:", updated.name);
  console.log("  Retail Price:", updated.price);
  console.log("  Seller ID:", updated.seller_id, "(null = platform-owned)");
  console.log("  Status:", updated.verification_status);
}

// Get productId and finalPrice from command line args
const productId = process.argv[2];
const finalPrice = Number(process.argv[3]);

if (!productId || !finalPrice) {
  console.log("Usage: node acquireProduct.js <productId> <finalPrice>");
  console.log("Example: node acquireProduct.js 41 700");
  process.exit(1);
}

acquireProduct(productId, finalPrice);
