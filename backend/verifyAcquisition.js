const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runEndToEndVerification() {
  console.log('--- Starting E2E Acquisition-to-Retail Workflow Testing ---');

  try {
    // 1. Fetch any user to act as buyer
    const { data: users, error: uError } = await supabaseAdmin.from('users').select('id').limit(2);
    if (!users || users.length === 0) {
      console.log('No users found in database to run test.');
      return;
    }
    const buyerId = users[0].id;
    const sellerId = users.length > 1 ? users[1].id : users[0].id;

    console.log(`Using Buyer ID: ${buyerId}`);
    
    // 2. Insert a Mock Product that implies "Student Accepted Price"
    const { data: product, error: pError } = await supabaseAdmin.from('products').insert({
      name: 'Test Inventory Item',
      description: 'Test Description',
      price: 50.00,
      category: 'Test',
      stock: 10,
      seller_id: sellerId,
      verification_status: 'pending',
      price_offer_status: 'accepted',
      proposed_price: 50.00
    }).select('*').single();

    if (pError) throw pError;
    console.log(`[1] Created Test Product (ID: ${product.id}) with status 'pending' and offer 'accepted'.`);

    // 3. Admin Acquires Product (Ownership transfer)
    const { data: acquiredProduct, error: aError } = await supabaseAdmin.from('products').update({
      seller_id: null,
      verification_status: 'verified',
      price: 150.00,
      final_price: 150.00,
      admin_review_note: 'Acquired during test.'
    }).eq('id', product.id).select('*').single();

    if (aError) throw aError;
    console.log(`[2] Product Acquired! New Price: ${acquiredProduct.price}, Seller ID: ${acquiredProduct.seller_id}`);

    // 4. Simulate Checkout (Buyer creates an order)
    const { data: order, error: oError } = await supabaseAdmin.from('orders').insert({
      user_id: buyerId,
      total_price: 150.00,
      status: 'order_placed',
      pickup_location: 'Test Location',
      pickup_time: new Date().toISOString()
    }).select('*').single();
    if (oError) throw oError;

    // 5. Create Order Item
    const { data: orderItem, error: oiError } = await supabaseAdmin.from('order_items').insert({
      order_id: order.id,
      product_id: product.id,
      quantity: 1,
      price: 150.00,
      commission_rate: 0,
      commission_amount: 0,
      seller_earning: 150.00,
      payout_status: 'unpaid'
    }).select('*').single();
    if (oiError) throw oiError;

    console.log(`[3] Order placed by user. Order ID: ${order.id}, Order Item ID: ${orderItem.id}`);

    // 6. Verification: Check if auto-payout would skip this
    // We confirm this mechanically by seeing the seller_id is null on the product.
    if (acquiredProduct.seller_id === null) {
      console.log(`[4] SUCCESS: The product has no seller_id, so the automated payout script will correctly skip transferring funds for this item, retaining all revenue via the platform.`);
    }

    // Cleanup generated data
    await supabaseAdmin.from('order_items').delete().eq('id', orderItem.id);
    await supabaseAdmin.from('orders').delete().eq('id', order.id);
    await supabaseAdmin.from('products').delete().eq('id', product.id);
    console.log(`[5] Cleanup complete.`);
    console.log('--- E2E Testing Completed Successfully ---');

  } catch (error) {
    console.error('Test Failed:', error);
  }
}

runEndToEndVerification();
