require('dotenv').config({ path: '../.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function clearTestData() {
  console.log("Starting test data deletion...");

  const tables = [
    'returns',
    'inventory_logs',
    'ticket_messages',
    'support_tickets',
    'order_logistics',
    'order_items',
    'orders',
    'cart',
    'product_reviews',
    'products',
    'leads',
    'notifications'
  ];

  for (const table of tables) {
    console.log(`Clearing ${table}...`);
    const { error } = await supabase.from(table).delete().neq('id', -1);
    if (error) {
      // Just log error, some tables might not exist or be empty
      console.error(`Error clearing ${table}:`, error.message);
    } else {
      console.log(`Successfully cleared ${table}`);
    }
  }

  console.log("Done wiping test data! Users were kept intact.");
}

clearTestData();
