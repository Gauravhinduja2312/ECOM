require('dotenv').config({ path: '../.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedData() {
  const { data: users } = await supabase.from('users').select('*');
  const regularUser = users.find(u => u.role === 'user') || users[0];

  const productsToInsert = [
    {
      name: 'High-End Engineering Calculator',
      description: 'Used for two semesters. Perfect condition, works flawlessly.',
      price: 1200.00,
      final_price: 1200.00,
      category: 'Electronics',
      stock: 4,
      seller_id: null,
      verification_status: 'verified',
      price_offer_status: 'none',
      image_url: 'https://images.unsplash.com/photo-1594980596848-0bedec51e739?auto=format&fit=crop&q=80&w=400',
    },
    {
      name: 'Introduction to Algorithms 3rd Ed',
      description: 'Classic textbook. Has some highlights but totally readable and great condition.',
      price: 850.50,
      final_price: 850.50,
      category: 'Books',
      stock: 2,
      seller_id: null,
      verification_status: 'verified',
      price_offer_status: 'none',
      image_url: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?auto=format&fit=crop&q=80&w=400',
    },
    {
      name: 'Physics Lab Coat (Size M)',
      description: 'Lab coat in size M. Washed and clean.',
      price: 450.00,
      final_price: 450.00,
      category: 'Clothing',
      stock: 1,
      seller_id: regularUser.id,
      verification_status: 'pending',
      price_offer_status: 'none'
    },
    {
      name: 'Logitech Wireless Mouse',
      description: 'Extra mouse I dont need anymore. Good for coding.',
      price: 600.00,
      final_price: 600.00,
      proposed_price: 500.00,
      category: 'Electronics',
      stock: 1,
      seller_id: regularUser.id,
      verification_status: 'pending',
      price_offer_status: 'accepted',
      admin_review_note: 'Student accepted admin price offer. Awaiting payment and acquisition.'
    }
  ];

  console.log("Inserting Products...");
  const { error: pError } = await supabase.from('products').insert(productsToInsert);
  if (pError) {
    console.error("Error inserting products:", pError.message, pError.details, pError.hint);
  } else {
    console.log("Test products inserted successfully.");
  }
}

seedData();
