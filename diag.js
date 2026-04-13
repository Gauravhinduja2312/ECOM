require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function fullDiagnostic() {
  const tables = ['users', 'orders', 'order_items', 'products', 'inventory_logs'];
  
  for (const table of tables) {
    console.log(`--- Checking ${table.toUpperCase()} ---`);
    const { data, error, count } = await supabase.from(table).select('*', { count: 'exact' }).limit(1);
    if (error) {
       console.error(`${table} Error:`, error.message);
    } else {
       console.log(`${table} Count:`, count);
       if (data && data.length > 0) {
          console.log(`${table} Columns:`, Object.keys(data[0]).join(', '));
       } else {
          console.log(`${table}: EMPTY`);
       }
    }
  }
}

fullDiagnostic();
