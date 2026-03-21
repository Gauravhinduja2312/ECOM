require('dotenv').config();
const { supabaseAdmin } = require('../services/supabaseAdmin');

const sampleProducts = [
  {
    name: 'Advanced JavaScript Course Notes',
    description: 'Comprehensive notes covering ES6+, async/await, and modern JavaScript patterns from a CS student.',
    price: 299,
    category: 'Books & Notes',
    stock: 5,
    image_url: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400',
  },
  {
    name: 'Organic Chemistry Solved Problems',
    description: '200+ solved problems with step-by-step explanations. Perfect for exam preparation.',
    price: 199,
    category: 'Books & Notes',
    stock: 3,
    image_url: 'https://images.unsplash.com/photo-1507842217343-583f20270319?w=400',
  },
  {
    name: 'Data Structures Study Guide',
    description: 'Complete guide to DSA with visual diagrams and code implementations in Python & Java.',
    price: 399,
    category: 'Books & Notes',
    stock: 8,
    image_url: 'https://images.unsplash.com/photo-1516321318423-f06f70d504d0?w=400',
  },
  {
    name: 'Used Scientific Calculator',
    description: 'Casio FX-991EX, barely used, comes with original case and manual.',
    price: 2500,
    category: 'Electronics',
    stock: 1,
    image_url: 'https://images.unsplash.com/photo-1611532736579-6b16e2b50449?w=400',
  },
  {
    name: 'Physics Lab Manual Solutions',
    description: 'Complete solutions to practical experiments with theory and calculations.',
    price: 149,
    category: 'Books & Notes',
    stock: 10,
    image_url: 'https://images.unsplash.com/photo-1530124566582-a618bc2615dc?w=400',
  },
  {
    name: 'Second-Hand Laptop Stand',
    description: 'Adjustable aluminum laptop stand, perfect for remote classes and studying.',
    price: 800,
    category: 'Electronics',
    stock: 2,
    image_url: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400',
  },
  {
    name: 'Web Development Bootcamp Certificate Notes',
    description: 'Notes from completing the MERN stack bootcamp course. Includes projects.',
    price: 499,
    category: 'Books & Notes',
    stock: 4,
    image_url: 'https://images.unsplash.com/photo-1517694712136-c78400c4d4d0?w=400',
  },
];

async function seedProducts() {
  try {
    console.log('🌱 Fetching all users...');
    
    const { data: allUsers, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id, email, role');

    console.log('📋 All users in database:', allUsers);

    if (usersError || !allUsers || allUsers.length === 0) {
      console.error('❌ Error fetching users or no users found');
      process.exit(1);
    }

    // Use all available users
    const sellers = allUsers;

    console.log(`✅ Using ${sellers.length} available users as sellers:`);

    // Rotate through sellers
    const productsToInsert = sampleProducts.map((product, index) => ({
      ...product,
      seller_id: sellers[index % sellers.length].id,
      verification_status: 'pending',
      price_offer_status: 'none',
      proposed_price: null,
      final_price: product.price,
      commission_rate: 10,
    }));

    console.log('📦 Inserting sample products...');
    const { data, error } = await supabaseAdmin
      .from('products')
      .insert(productsToInsert)
      .select();

    if (error) {
      console.error('❌ Error inserting products:', error.message);
      process.exit(1);
    }

    console.log(`✅ Successfully added ${data.length} products for verification!`);
    console.log('\nProducts added:');
    data.forEach((product) => {
      const seller = sellers.find((s) => s.id === product.seller_id);
      console.log(`  - ${product.name} (₹${product.price}) - Seller: ${seller.email}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
}

seedProducts();
