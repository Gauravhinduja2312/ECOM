require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function diagnostic() {
  console.log('--- Checking USERS table ---');
  const { data: users, error: uError, count: uCount } = await supabase.from('users').select('*', { count: 'exact' });
  if (uError) console.error('Users Error:', uError.message);
  else console.log(`Users Found: ${uCount}`, users?.length ? users[0] : 'EMPTY');

  console.log('--- Checking ORDERS table ---');
  const { data: orders, error: oError, count: oCount } = await supabase.from('orders').select('*', { count: 'exact' });
  if (oError) console.error('Orders Error:', oError.message);
  else console.log(`Orders Found: ${oCount}`, orders?.length ? orders[0] : 'EMPTY');
}

diagnostic();
