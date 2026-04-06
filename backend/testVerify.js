const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  console.log('Fetching users to verify columns...');
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id, email, loyalty_tier')
    .limit(1);

  if (error) {
    console.error('Error fetching:', error);
  } else {
    console.log('Data:', data);
  }
}

check();
